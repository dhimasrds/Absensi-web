import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function clearAllData() {
  console.log('🗑️  Starting database cleanup...\n')

  // Delete in correct order (respecting foreign key constraints)
  
  // 1. Delete attendance_logs
  console.log('Deleting attendance_logs...')
  const { error: logsError } = await supabase
    .from('attendance_logs')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all
  if (logsError) console.log('Error:', logsError.message)
  else console.log('✅ Attendance logs deleted')

  // 2. Delete mobile_sessions
  console.log('\nDeleting mobile_sessions...')
  const { error: sessionsError } = await supabase
    .from('mobile_sessions')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  if (sessionsError) console.log('Error:', sessionsError.message)
  else console.log('✅ Mobile sessions deleted')

  // 3. Delete face_templates
  console.log('\nDeleting face_templates...')
  const { error: facesError } = await supabase
    .from('face_templates')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  if (facesError) console.log('Error:', facesError.message)
  else console.log('✅ Face templates deleted')

  // 4. Delete devices
  console.log('\nDeleting devices...')
  const { error: devicesError } = await supabase
    .from('devices')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  if (devicesError) console.log('Error:', devicesError.message)
  else console.log('✅ Devices deleted')

  // 5. Delete employees
  console.log('\nDeleting employees...')
  const { error: employeesError } = await supabase
    .from('employees')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  if (employeesError) console.log('Error:', employeesError.message)
  else console.log('✅ Employees deleted')

  // 6. Keep work_locations (admin might still need these)
  console.log('\n📍 Work locations kept (not deleted)')

  // 7. Keep profiles and auth users (admin accounts)
  console.log('👤 Admin accounts kept (not deleted)')

  console.log('\n✅ Database cleanup completed!')
  console.log('\n📝 Summary:')
  console.log('   - All employees deleted')
  console.log('   - All face templates deleted')
  console.log('   - All devices deleted')
  console.log('   - All attendance logs deleted')
  console.log('   - Work locations preserved')
  console.log('   - Admin accounts preserved')
  console.log('\n🚀 Ready to add first employee!')
}

clearAllData()
