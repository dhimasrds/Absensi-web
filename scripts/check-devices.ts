import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkDevices() {
  const { data, error } = await supabase
    .from('devices')
    .select('*')
  
  console.log('=== All Devices ===')
  console.log(JSON.stringify(data, null, 2))
  if (error) console.log('Error:', error)
}

checkDevices()
