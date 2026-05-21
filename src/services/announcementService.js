import { supabase } from '../lib/supabase'

export async function postAnnouncement(title, message, postedByName) {
  const { error } = await supabase
    .from('announcements')
    .insert([{ title, message, posted_by_name: postedByName }])
  if (error) throw error
}

export async function fetchAnnouncements(limit = 5) {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

export async function deleteAnnouncement(id) {
  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', id)
  if (error) throw error
}
