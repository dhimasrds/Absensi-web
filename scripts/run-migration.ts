import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function runMigration() {
  console.log('🚀 Running migration: Add phone_number and job_title...\n')

  // Read migration SQL file
  const migrationPath = path.join(__dirname, '../sql/migrations/001_add_phone_and_job_title.sql')
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

  // Split by semicolon and execute each statement
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  for (const statement of statements) {
    console.log('Executing:', statement.substring(0, 60) + '...')
    
    const { error } = await supabase.rpc('exec_sql', { sql: statement })
    
    if (error) {
      // Try direct query if RPC not available
      const { error: directError } = await supabase.from('employees').select('phone_number, job_title').limit(0)
      
      if (directError && directError.message.includes('column') && directError.message.includes('does not exist')) {
        console.log('❌ Migration needed - columns do not exist yet')
        console.log('\n⚠️  Please run this SQL manually in Supabase SQL Editor:')
        console.log('\n' + migrationSQL)
        return
      } else {
        console.log('✅ Columns already exist or migration successful')
      }
    } else {
      console.log('✅ Success')
    }
  }

  console.log('\n✅ Migration completed!')
  
  // Verify columns exist
  console.log('\n🔍 Verifying columns...')
  const { data, error } = await supabase
    .from('employees')
    .select('id, full_name, phone_number, job_title')
    .limit(1)

  if (error) {
    console.log('❌ Error:', error.message)
    console.log('\n⚠️  Please run this SQL manually in Supabase SQL Editor:')
    console.log('\n' + migrationSQL)
  } else {
    console.log('✅ Columns verified successfully!')
    console.log('   - phone_number: ✅')
    console.log('   - job_title: ✅')
  }
}

runMigration()
