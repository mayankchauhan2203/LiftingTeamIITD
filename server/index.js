require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const express = require('express')
const cors    = require('cors')
const fetch   = require('node-fetch')
const { createClient } = require('@supabase/supabase-js')

const app = express()
app.use(express.json())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))

const IITD_BASE_URL   = 'https://auth.devclub.in'
const REDIRECT_URI    = process.env.IITD_REDIRECT_URI   // must match what's registered with devclub
const FRONTEND_URL    = process.env.FRONTEND_URL || 'http://localhost:5173'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ── Field extractors (all known IITD field name variants) ──────────────────
function extractKerberos(obj) {
  return obj?.kerberos || obj?.kerberos_id || obj?.uid || obj?.user_id ||
         obj?.uniqueiitdid || obj?.preferred_username || obj?.sub || ''
}
function extractName(obj) {
  return obj?.name || obj?.cn || obj?.displayName || obj?.full_name || obj?.given_name || 'IITD Member'
}
function extractEmail(obj) {
  return obj?.email || obj?.mail || ''
}
function extractEntryNumber(obj) {
  return obj?.entry_number || obj?.roll || obj?.roll_number || obj?.entryNumber || obj?.roll_no || ''
}

function mergeUserData(primary, fallback) {
  const pick = fn => fn(primary) || fn(fallback)
  return {
    kerberos:     pick(extractKerberos),
    name:         pick(extractName),
    email:        pick(extractEmail),
    entry_number: pick(extractEntryNumber),
  }
}

function decodeJwtPayload(token) {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
  } catch { return null }
}

function makeInitials(name) {
  return name.split(' ').filter(Boolean).map(p => p[0].toUpperCase()).slice(0, 2).join('')
}

// ── OAuth callback relay ────────────────────────────────────────────────────
// devclub redirects here; we forward the code to the frontend SPA.
app.get('/auth/callback', (req, res) => {
  const params = new URLSearchParams(req.query)
  res.redirect(`${FRONTEND_URL}/auth/callback?${params}`)
})

// ── POST /api/auth/iitd ────────────────────────────────────────────────────
app.post('/api/auth/iitd', async (req, res) => {
  const { code, code_verifier } = req.body

  if (!code || !code_verifier) {
    return res.status(400).json({ error: 'Missing required fields: code, code_verifier' })
  }

  try {
    // 1. Exchange code for tokens
    const tokenRes = await fetch(`${IITD_BASE_URL}/api/oauth/token`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'authorization_code',
        client_id:     process.env.IITD_CLIENT_ID,
        client_secret: process.env.IITD_CLIENT_SECRET,
        code,
        code_verifier,
        redirect_uri:  REDIRECT_URI,
      }),
    })

    const tokenData = await tokenRes.json()
    if (!tokenRes.ok || tokenData.error) {
      console.error('[IITD] Token exchange failed:', tokenData)
      return res.status(400).json({ error: tokenData.error_description || tokenData.error || 'Token exchange failed' })
    }

    const idTokenClaims = tokenData.id_token ? decodeJwtPayload(tokenData.id_token) : null
    console.log('[IITD] id_token claims:', idTokenClaims)

    // 2. Fetch userinfo
    let rawUserInfo = null
    try {
      const userRes = await fetch(`${IITD_BASE_URL}/api/oauth/userinfo`, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      })
      if (userRes.ok) {
        rawUserInfo = await userRes.json()
        console.log('[IITD] Raw userinfo:', rawUserInfo)
      } else {
        console.warn('[IITD] Userinfo returned', userRes.status, '— using id_token claims only')
      }
    } catch (e) {
      console.warn('[IITD] Userinfo fetch error:', e.message)
    }

    // Unwrap nested response shapes: { user: {...} }, { data: {...} }, { profile: {...} }
    const unwrapped = rawUserInfo?.user || rawUserInfo?.data || rawUserInfo?.profile || rawUserInfo || {}
    const merged    = mergeUserData(unwrapped, idTokenClaims || {})
    console.log('[IITD] Merged user data:', merged)

    const kerberos = merged.kerberos
    if (!kerberos) {
      console.error('[IITD] Could not determine kerberos. unwrapped:', unwrapped, 'idClaims:', idTokenClaims)
      return res.status(502).json({ error: 'Could not extract kerberos ID from IITD response' })
    }

    // 3. Look up team_members table
    const { data: member, error: dbErr } = await supabase
      .from('team_members')
      .select('*')
      .eq('kerberos_id', kerberos)
      .maybeSingle()

    if (dbErr) console.error('[team_members lookup]', dbErr)

    // 4. Build profile
    const name     = member?.name     || merged.name
    const initials = member?.initials || makeInitials(name)
    const role     = member?.role     || 'athlete'

    const profile = {
      username:     kerberos,
      kerberos_id:  kerberos,
      name,
      initials,
      email:        merged.email,
      entry_number: merged.entry_number,
      role,
      weightClass:  member?.weight_class || null,
      year:         member?.year         || null,
    }

    res.json({ user: profile })
  } catch (err) {
    console.error('[/api/auth/iitd]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ── Health check ───────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ ok: true }))

const PORT = process.env.SERVER_PORT || 3001
app.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}`)
  console.log(`[server] IITD redirect URI: ${REDIRECT_URI || '(not set)'}`)
  console.log(`[server] Frontend URL:      ${FRONTEND_URL}`)
})
