import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

console.log('URL:', supabaseUrl)
console.log('Key:', supabaseAnonKey ? 'Found' : 'Missing')

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .limit(1)

  if (error) {
    console.error('Error fetching:', error)
  } else {
    console.log('Success! Sample row keys:', data.length > 0 ? Object.keys(data[0]) : 'No rows found')
  }
}

test()
