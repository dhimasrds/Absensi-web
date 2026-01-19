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

async function testSimilarity() {
  // Embedding yang sama dengan yang dienroll
  const embedding = [-0.007872997,0.020576835,0.013276373,0.009378814,-0.049695008,0.0883142,0.0027086567,0.046628237,-0.10701045,0.10680058,-0.016319158,-0.0012889676,-0.0038126006,0.016067073,-0.0072100223,-0.015675003,-0.003442468,-0.002343895,0.011878826,5.308027E-4,-0.24293984,0.10529426,0.10262316,0.01181184,-0.07555621,0.015579947,-0.018674057,0.076723434,0.27826273,0.0022363705,-0.004853903,0.27189526,0.2501653,-1.6012955E-4,-0.1816048,0.18621017,0.020075746,-0.035221197,0.0012821162,-0.019754684,0.008076083,0.00396334,0.002767792,-0.0017558527,0.017797329,-0.01983254,-0.0072978726,-0.01540774,-0.0139141865,0.03749069,-0.006043782,-0.008398684,-0.21532272,-0.0038542615,0.012821523,0.006462485,0.17197789,0.0036294106,-0.09631892,0.016339738,0.068726406,-0.10458657,-0.071749695,0.122536406,0.0019193332,-0.16082968,-0.009359263,-0.041529033,0.011106788,-0.0012133656,-0.024812613,-0.18429744,0.11843275,0.006859278,0.022590984,0.017225068,-0.0061677666,-0.0060606045,0.026959442,-0.21013203,-0.0092581995,-0.0956746,0.0016586621,-0.005869803,0.11654925,-0.0041861925,0.007955363,-0.07765631,-0.013215747,-0.011702724,-0.18789333,4.891512E-4,0.01964737,-0.0090308925,0.07437881,0.026920289,-0.09929932,-0.0016927514,0.005162687,-0.005766834,0.0046858722,0.00194636,-0.0020261824,-5.992401E-4,-9.887461E-4,0.002671525,-0.09198541,0.0037879152,0.01794772,0.03347678,0.07698307,0.011754169,-5.2006304E-4,0.45274106,0.0120429825,-0.05960134,0.0071844994,-0.021448985,0.030717239,0.06923404,0.114112474,-0.028445764,-0.1171957,2.5420354E-4,-8.045193E-4,9.452057E-4,3.7732034E-4,-0.0031679943]

  const embeddingVector = `[${embedding.join(',')}]`

  console.log('🔍 Testing face similarity...')
  console.log('📊 Embedding length:', embedding.length)
  console.log('')

  // Test dengan RPC function (sama seperti di API)
  const { data, error } = await supabase.rpc('face_identify_v1', {
    query_embedding: embeddingVector,
    match_threshold: 0.0, // Set ke 0 untuk lihat semua scores
    match_count: 5,
  })

  if (error) {
    console.error('❌ RPC Error:', error)
    return
  }

  console.log('✅ RPC Results:')
  console.log(JSON.stringify(data, null, 2))
  console.log('')

  if (data && data.length > 0) {
    console.log('📈 Similarity Scores:')
    data.forEach((result: any, index: number) => {
      console.log(`   ${index + 1}. Employee ID: ${result.employee_id}`)
      console.log(`      Score: ${result.score.toFixed(4)} (${(result.score * 100).toFixed(2)}%)`)
      console.log(`      ${result.score >= 0.70 ? '✅ PASS' : '❌ FAIL'} (Threshold: 0.70)`)
      console.log('')
    })
  } else {
    console.log('❌ No matches found!')
    console.log('💡 This means score < 0.70 for all templates')
  }

  // Get manual similarity check
  console.log('🔬 Manual Similarity Check (Top 3):')
  const { data: manualCheck } = await supabase
    .from('face_templates')
    .select(`
      id,
      employee_id,
      employees (
        employee_id,
        full_name
      )
    `)
    .eq('is_active', true)
    .limit(3)

  if (manualCheck) {
    for (const template of manualCheck) {
      const { data: scoreData }: any = await supabase.rpc('vector_cosine_similarity', {
        vec1: embeddingVector,
        vec2: template.id,
      })
      
      console.log(`   Employee: ${template.employees.employee_id} - ${template.employees.full_name}`)
      console.log(`   Template ID: ${template.id}`)
    }
  }
}

testSimilarity()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  })
