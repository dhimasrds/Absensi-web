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

async function checkEmbedding() {
  console.log('🔍 Checking stored embeddings...\n')

  const { data: templates, error } = await supabase
    .from('face_templates')
    .select('*')
    .eq('is_active', true)
    .limit(2)

  if (error) {
    console.error('❌ Error:', error)
    return
  }

  if (!templates || templates.length === 0) {
    console.log('❌ No face templates found')
    return
  }

  templates.forEach((template: any, index: number) => {
    console.log(`📊 Template ${index + 1}:`)
    console.log(`   ID: ${template.id}`)
    console.log(`   Employee ID: ${template.employee_id}`)
    console.log(`   Quality Score: ${template.quality_score}`)
    console.log(`   Is Active: ${template.is_active}`)
    console.log(`   Created: ${template.created_at}`)
    
    // Check embedding
    const embedding = template.embedding
    if (embedding) {
      console.log(`   Embedding type: ${typeof embedding}`)
      console.log(`   Embedding value: ${String(embedding).substring(0, 100)}...`)
      
      // Try to parse as array
      try {
        if (typeof embedding === 'string') {
          const parsed = JSON.parse(embedding)
          console.log(`   Embedding length: ${parsed.length}`)
          console.log(`   First 5 values: [${parsed.slice(0, 5).join(', ')}]`)
        } else if (Array.isArray(embedding)) {
          console.log(`   Embedding length: ${embedding.length}`)
          console.log(`   First 5 values: [${embedding.slice(0, 5).join(', ')}]`)
        } else {
          console.log(`   Embedding is object/other type`)
        }
      } catch (e) {
        console.log(`   Cannot parse embedding:`, e.message)
      }
    } else {
      console.log(`   ❌ No embedding found!`)
    }
    console.log('')
  })
}

checkEmbedding()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  })
