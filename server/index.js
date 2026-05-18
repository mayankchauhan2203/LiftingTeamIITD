require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const express = require('express')
const cors    = require('cors')
const fetch   = require('node-fetch')
const { createClient } = require('@supabase/supabase-js')

const app = express()
app.use(express.json())
app.use(cors({ origin: process.env.VITE_APP_URL || 'http://localhost:5173', credentials: true }))

const IITD_TOKEN_URL    = 'https://auth.devclub.in/api/oauth/token'
const IITD_USERINFO_URL = 'https://auth.devclub.in/api/user/userinfo'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ── Field extractors (mirrors PeerMart pattern) ────────────────────────────
function extractKerberos(userInfo, idTokenPayload) {
  return (
    userInfo.kerberos_id ||
    userInfo.preferred_username ||
    idTokenPayload?.kerberos_id ||
    idTokenPayload?.preferred_username ||
    (userInfo.email || '').split('@')[0] ||
    null
  )
}

function extractName(userInfo, idTokenPayload) {
  return userInfo.name || idTokenPayload?.name || userInfo.given_name || 'IITD Member'
}

function extractEmail(userInfo, idTokenPayload) {
  return userInfo.email || idTokenPayload?.email || null
}

function parseJwtPayload(token) {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
  } catch {
    return null
  }
}

function makeInitials(name) {
  return name.split(' ').filter(Boolean).map(p => p[0].toUpperCase()).slice(0, 2).join('')
}

// ── POST /api/auth/iitd ────────────────────────────────────────────────────
app.post('/api/auth/iitd', async (req, res) => {
  const { code, code_verifier, redirect_uri } = req.body

  if (!code || !code_verifier || !redirect_uri) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    // 1. Exchange code for tokens
    const tokenRes = await fetch(IITD_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'authorization_code',
        client_id:     process.env.IITD_CLIENT_ID,
        client_secret: process.env.IITD_CLIENT_SECRET,
        code,
        code_verifier,
        redirect_uri,
      }),
    })
    if (!tokenRes.ok) {
      const msg = await tokenRes.text()
      console.error('[iitd token exchange]', tokenRes.status, msg)
      return res.status(502).json({ error: 'Token exchange failed' })
    }
    const { access_token, id_token } = await tokenRes.json()
    const idPayload = id_token ? parseJwtPayload(id_token) : null

    // 2. Fetch userinfo
    const userRes = await fetch(IITD_USERINFO_URL, {
      headers: { Authorization: `Bearer ${access_token}` },
    })
    const userInfo = userRes.ok ? await userRes.json() : {}

    // 3. Extract identity
    const kerberos = extractKerberos(userInfo, idPayload)
    const rawName  = extractName(userInfo, idPayload)
    const email    = extractEmail(userInfo, idPayload)

    if (!kerberos) {
      console.error('[iitd auth] could not extract kerberos. userInfo:', userInfo, 'idPayload:', idPayload)
      return res.status(502).json({ error: 'Could not extract kerberos ID from IITD response' })
    }

    // 4. Look up team_members table
    const { data: member, error: dbErr } = await supabase
      .from('team_members')
      .select('*')
      .eq('kerberos_id', kerberos)
      .maybeSingle()

    if (dbErr) {
      console.error('[team_members lookup]', dbErr)
    }

    // 5. Build user profile
    const name     = member?.name     || rawName
    const initials = member?.initials || makeInitials(name)
    const role     = member?.role     || 'athlete'

    const profile = {
      username:    kerberos,
      kerberos_id: kerberos,
      name,
      initials,
      email,
      role,
      weightClass: member?.weight_class || null,
      year:        member?.year         || null,
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
app.listen(PORT, () => console.log(`[server] listening on :${PORT}`))
