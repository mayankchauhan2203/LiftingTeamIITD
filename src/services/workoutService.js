import { supabase } from '../lib/supabase'

export function todayString() {
  // YYYY-MM-DD in local time
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function addWorkoutPlan({ date, title, description, exercises, createdBy }) {
  const { data, error } = await supabase
    .from('workout_plans')
    .insert([{ date, title, description, exercises, created_by: createdBy, attendance_status: 'not_started' }])
    .select()
  if (error) throw error
  return data[0]
}

export async function fetchAllPlans() {
  const { data, error } = await supabase
    .from('workout_plans')
    .select('*')
    .order('date', { ascending: false })
  if (error) throw error
  return data
}

export async function fetchPlansByDate(date) {
  const { data, error } = await supabase
    .from('workout_plans')
    .select('*')
    .eq('date', date)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function fetchPlanById(id) {
  const { data, error } = await supabase
    .from('workout_plans')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function updateAttendanceStatus(planId, status) {
  const { error } = await supabase
    .from('workout_plans')
    .update({ attendance_status: status })
    .eq('id', planId)
  if (error) throw error
}

/** Returns a Supabase channel — caller must call supabase.removeChannel(channel) on cleanup */
export function subscribeToWorkoutChanges(onchange) {
  return supabase
    .channel('workout_plans_rt')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'workout_plans' }, onchange)
    .subscribe()
}
