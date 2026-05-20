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

