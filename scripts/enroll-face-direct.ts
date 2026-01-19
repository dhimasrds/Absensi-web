import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import path from 'path'

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function enrollFace() {
  // Embedding dari curl terakhir
  const embedding = [-0.007872997,0.020576835,0.013276373,0.009378814,-0.049695008,0.0883142,0.0027086567,0.046628237,-0.10701045,0.10680058,-0.016319158,-0.0012889676,-0.0038126006,0.016067073,-0.0072100223,-0.015675003,-0.003442468,-0.002343895,0.011878826,5.308027E-4,-0.24293984,0.10529426,0.10262316,0.01181184,-0.07555621,0.015579947,-0.018674057,0.076723434,0.27826273,0.0022363705,-0.004853903,0.27189526,0.2501653,-1.6012955E-4,-0.1816048,0.18621017,0.020075746,-0.035221197,0.0012821162,-0.019754684,0.008076083,0.00396334,0.002767792,-0.0017558527,0.017797329,-0.01983254,-0.0072978726,-0.01540774,-0.0139141865,0.03749069,-0.006043782,-0.008398684,-0.21532272,-0.0038542615,0.012821523,0.006462485,0.17197789,0.0036294106,-0.09631892,0.016339738,0.068726406,-0.10458657,-0.071749695,0.122536406,0.0019193332,-0.16082968,-0.009359263,-0.041529033,0.011106788,-0.0012133656,-0.024812613,-0.18429744,0.11843275,0.006859278,0.022590984,0.017225068,-0.0061677666,-0.0060606045,0.026959442,-0.21013203,-0.0092581995,-0.0956746,0.0016586621,-0.005869803,0.11654925,-0.0041861925,0.007955363,-0.07765631,-0.013215747,-0.011702724,-0.18789333,4.891512E-4,0.01964737,-0.0090308925,0.07437881,0.026920289,-0.09929932,-0.0016927514,0.005162687,-0.005766834,0.0046858722,0.00194636,-0.0020261824,-5.992401E-4,-9.887461E-4,0.002671525,-0.09198541,0.0037879152,0.01794772,0.03347678,0.07698307,0.011754169,-5.2006304E-4,0.45274106,0.0120429825,-0.05960134,0.0071844994,-0.021448985,0.030717239,0.06923404,0.114112474,-0.028445764,-0.1171957,2.5420354E-4,-8.045193E-4,9.452057E-4,3.7732034E-4,-0.0031679943]

  console.log('🔍 Checking employees...')
  
  // Get first active employee
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('id, employee_id, full_name')
    .eq('is_active', true)
    .limit(1)

  if (empError) {
    console.error('❌ Error fetching employees:', empError)
    return
  }

  if (!employees || employees.length === 0) {
    console.error('❌ No active employees found in database')
    console.log('💡 Create an employee first via admin dashboard')
    return
  }

  const employee = employees[0]
  console.log(`✅ Found employee: ${employee.employee_id} - ${employee.full_name}`)

  // Check if employee already has face template
  const { data: existingTemplates } = await supabase
    .from('face_templates')
    .select('id')
    .eq('employee_id', employee.id)

  if (existingTemplates && existingTemplates.length > 0) {
    console.log(`⚠️  Employee already has ${existingTemplates.length} face template(s)`)
    console.log('🗑️  Deleting old template(s)...')
    
    const { error: deleteError } = await supabase
      .from('face_templates')
      .delete()
      .eq('employee_id', employee.id)
    
    if (deleteError) {
      console.error('❌ Error deleting old templates:', deleteError)
      return
    }
    
    console.log('✅ Old templates deleted')
  }

  // Insert new face template
  console.log('📸 Enrolling face...')
  
  const embeddingVector = `[${embedding.join(',')}]`
  
  const { data: template, error: templateError } = await supabase
    .from('face_templates')
    .insert({
      employee_id: employee.id,
      embedding: embeddingVector,
      quality_score: 0.95,
      is_active: true,
    })
    .select()
    .single()

  if (templateError) {
    console.error('❌ Error enrolling face:', templateError)
    return
  }

  console.log('✅ Face enrolled successfully!')
  console.log('📊 Details:')
  console.log(`   Employee ID: ${employee.employee_id}`)
  console.log(`   Full Name: ${employee.full_name}`)
  console.log(`   Template ID: ${template.id}`)
  console.log(`   Quality Score: 0.95`)
  console.log('')
  console.log('🎯 Now you can test face login with this employee!')
}

enrollFace()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  })
