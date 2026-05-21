import { supabase } from '../lib/supabase'

function makeInitials(name) {
  return name.split(' ').filter(Boolean).map(p => p[0].toUpperCase()).slice(0, 2).join('')
}

export async function fetchTeamMembers() {
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw error
  return data
}

export async function addTeamMember({ kerberos_id, name, role, weight_class, year, snatch_pr, cj_pr }) {
  const initials = makeInitials(name)
  const { data, error } = await supabase
    .from('team_members')
    .insert([{ kerberos_id, name, initials, role: role || 'athlete', weight_class, year, snatch_pr: snatch_pr || null, cj_pr: cj_pr || null }])
    .select()
  if (error) {
    if (error.code === '23505') throw new Error('kerberos_exists')
    throw error
  }
  return data[0]
}

export async function updateMemberPR(id, { snatch_pr, cj_pr }) {
  const { error } = await supabase
    .from('team_members')
    .update({ snatch_pr, cj_pr })
    .eq('id', id)
  if (error) throw error
}

export async function removeTeamMember(id) {
  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function fetchTeamMemberByKerberos(kerberosId) {
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('kerberos_id', kerberosId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function updateAthleteStats(id, stats) {
  const { data, error } = await supabase
    .from('team_members')
    .update(stats)
    .eq('id', id)
    .select()
  if (error) throw error
  return data[0]
}

export async function updateAthleteFullProfile(id, data) {
  const { data: result, error } = await supabase
    .from('team_members')
    .update(data)
    .eq('id', id)
    .select()
  if (error) throw error
  return result[0]
}

const PR_UPDATED_AT = {
  snatch_pr:      'snatch_pr_updated_at',
  cj_pr:          'cj_pr_updated_at',
  front_squat_pr: 'front_squat_pr_updated_at',
  back_squat_pr:  'back_squat_pr_updated_at',
  deadlift_pr:    'deadlift_pr_updated_at',
}

export async function createPRChangeRequest(kerberosId, athleteName, requestedChanges) {
  await supabase.from('pr_change_requests').delete().eq('kerberos_id', kerberosId).eq('status', 'pending')
  const { error } = await supabase
    .from('pr_change_requests')
    .insert([{ kerberos_id: kerberosId, athlete_name: athleteName, requested_changes: requestedChanges }])
  if (error) throw error
}

export async function fetchPendingRequests() {
  const { data, error } = await supabase
    .from('pr_change_requests')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function approveChangeRequest(requestId, kerberosId, requestedChanges) {
  const flatUpdates = {}
  for (const [field, { new: newVal }] of Object.entries(requestedChanges)) {
    flatUpdates[field] = newVal
    if (PR_UPDATED_AT[field]) flatUpdates[PR_UPDATED_AT[field]] = new Date().toISOString()
  }
  const { error: updateErr } = await supabase.from('team_members').update(flatUpdates).eq('kerberos_id', kerberosId)
  if (updateErr) throw updateErr
  const { error } = await supabase
    .from('pr_change_requests')
    .update({ status: 'approved', reviewed_at: new Date().toISOString() })
    .eq('id', requestId)
  if (error) throw error
}

export async function createJoinRequest(kerberosId, name, year) {
  const { error } = await supabase
    .from('join_requests')
    .upsert([{ kerberos_id: kerberosId, name, year: year || null, status: 'pending' }], { onConflict: 'kerberos_id' })
  if (error) throw error
}

export async function fetchJoinRequestByKerberos(kerberosId) {
  const { data, error } = await supabase
    .from('join_requests')
    .select('*')
    .eq('kerberos_id', kerberosId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function fetchPendingJoinRequests() {
  const { data, error } = await supabase
    .from('join_requests')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function approveJoinRequest(requestId, kerberosId, name) {
  const initials = name.split(' ').filter(Boolean).map(p => p[0].toUpperCase()).slice(0, 2).join('')
  const { error: addErr } = await supabase
    .from('team_members')
    .insert([{ kerberos_id: kerberosId, name, initials, role: 'athlete' }])
  if (addErr && addErr.code !== '23505') throw addErr
  const { error } = await supabase.from('join_requests').update({ status: 'approved' }).eq('id', requestId)
  if (error) throw error
}

export async function rejectJoinRequest(requestId) {
  const { error } = await supabase.from('join_requests').update({ status: 'rejected' }).eq('id', requestId)
  if (error) throw error
}

export async function rejectChangeRequest(requestId) {
  const { error } = await supabase
    .from('pr_change_requests')
    .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
    .eq('id', requestId)
  if (error) throw error
}

function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return days === 1 ? 'Yesterday' : `${days} days ago`
}

export async function fetchRecentActivity() {
  const [{ data: prs }, { data: joins }] = await Promise.all([
    supabase.from('pr_change_requests').select('*').eq('status', 'approved')
      .order('reviewed_at', { ascending: false }).limit(5),
    supabase.from('join_requests').select('*').eq('status', 'approved')
      .order('created_at', { ascending: false }).limit(5),
  ])
  const activities = [
    ...(prs  || []).map(r => ({ id: `pr-${r.id}`,   color: 'green',  text: [r.athlete_name, ' updated their lift PRs'], time: r.reviewed_at })),
    ...(joins || []).map(r => ({ id: `join-${r.id}`, color: 'purple', text: [r.name, ' joined the team'],               time: r.created_at  })),
  ]
  activities.sort((a, b) => new Date(b.time) - new Date(a.time))
  return activities.slice(0, 6).map(a => ({ ...a, time: relativeTime(a.time) }))
}

export async function fetchCoachStats() {
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [membersRes, sessionsRes, prsRes, pendingPRRes, pendingJoinRes] = await Promise.all([
    supabase.from('team_members').select('id', { count: 'exact', head: true }),
    supabase.from('workout_plans').select('id', { count: 'exact', head: true })
      .gte('date', monday.toISOString().slice(0, 10))
      .lte('date', sunday.toISOString().slice(0, 10)),
    supabase.from('pr_change_requests').select('id', { count: 'exact', head: true })
      .eq('status', 'approved').gte('reviewed_at', startOfMonth.toISOString()),
    supabase.from('pr_change_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('join_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ])
  return {
    totalAthletes:    membersRes.count    ?? 0,
    sessionsThisWeek: sessionsRes.count   ?? 0,
    newPRsThisMonth:  prsRes.count        ?? 0,
    pendingApprovals: (pendingPRRes.count ?? 0) + (pendingJoinRes.count ?? 0),
  }
}

export async function fetchAthleteMonthlyStats(kerberosId) {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  const monthStr = startOfMonth.toISOString().slice(0, 10)

  const [sessionsRes, attendedRes] = await Promise.all([
    supabase.from('workout_plans').select('id', { count: 'exact', head: true }).gte('date', monthStr),
    supabase.from('attendance').select('id', { count: 'exact', head: true })
      .eq('user_id', kerberosId).eq('phase', 'checkin').gte('marked_at', startOfMonth.toISOString()),
  ])
  const total    = sessionsRes.count  ?? 0
  const attended = attendedRes.count  ?? 0
  return {
    sessionsThisMonth: total,
    attended,
    attendanceRate: total > 0 ? Math.round((attended / total) * 100) : null,
  }
}

