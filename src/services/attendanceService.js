import { supabase } from '../lib/supabase'

export async function markAttendance({ planId, userId, userName, userInitials, phase }) {
  const { data, error } = await supabase
    .from('attendance')
    .insert([{ plan_id: planId, user_id: userId, user_name: userName, user_initials: userInitials, phase }])
    .select()
  if (error) {
    if (error.code === '23505') throw new Error('already_marked')
    throw error
  }
  return data[0]
}

export async function fetchAttendanceForPlan(planId) {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('plan_id', planId)
    .order('marked_at', { ascending: true })
  if (error) throw error
  return data
}

export async function fetchUserAttendanceForPlan(planId, userId) {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('plan_id', planId)
    .eq('user_id', userId)
  if (error) throw error
  return data
}

/** Returns a Supabase channel — caller must call supabase.removeChannel(channel) on cleanup */
export function subscribeToAttendance(planId, onchange) {
  return supabase
    .channel(`attendance_${planId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'attendance', filter: `plan_id=eq.${planId}` },
      onchange
    )
    .subscribe()
}
