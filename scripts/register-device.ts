import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function registerDevice() {
  // Register device (whitelist only, no employee link)
  const { data, error } = await supabase
    .from('devices')
    .insert({
      device_id: 'ANDROID-DEV-001',
      label: 'Android Device - Dhimas',
      is_active: true
    })
    .select()
    .single()

  if (error) {
    console.log('Error:', error.message)
    return
  }
  
  console.log('✅ Device registered successfully!')
  console.log(JSON.stringify(data, null, 2))
}

registerDevice()
