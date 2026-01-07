import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkFaceTemplates() {
  // Check all face_templates
  const { data, error } = await supabase
    .from('face_templates')
    .select('id, employee_id, template_version, is_active, quality_score, created_at')

  console.log('=== All Face Templates ===')
  console.log('Count:', data?.length || 0)
  console.log('Data:', JSON.stringify(data, null, 2))
  if (error) console.log('Error:', error)

  // Check employees with face template join
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('id, employee_id, full_name, face_templates(id)')
    .limit(5)

  console.log('\n=== Employees with Face Templates ===')
  console.log(JSON.stringify(employees, null, 2))
  if (empError) console.log('Error:', empError)
}

checkFaceTemplates()
