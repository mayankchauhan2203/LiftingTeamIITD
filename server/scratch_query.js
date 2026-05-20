require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

console.log('URL:', supabaseUrl)
console.log('Key:', supabaseAnonKey ? 'Found' : 'Missing')

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
  const { data: plans, error: errPlans } = await supabase
    .from('workout_plans')
    .select('*')
    .limit(1)

  if (errPlans) {
    console.error('Error fetching workout_plans:', errPlans)
  } else {
    console.log('Success workout_plans! Sample row keys:', plans.length > 0 ? Object.keys(plans[0]) : 'No rows found')
  }

  const { data: members, error: errMembers } = await supabase
    .from('team_members')
    .select('*')
    .limit(1)

  if (errMembers) {
    console.error('Error fetching team_members:', errMembers)
  } else {
    console.log('Success team_members! Sample row keys:', members.length > 0 ? Object.keys(members[0]) : 'No rows found')
  }
}

test()
