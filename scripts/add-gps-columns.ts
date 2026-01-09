import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'public' }
})

async function runMigration() {
  console.log('🚀 Running GPS coordinates migration...')
  console.log(`📍 Supabase URL: ${supabaseUrl}`)
  
  // Read the SQL file
  const sqlPath = path.join(process.cwd(), 'sql', '008_add_gps_coordinates.sql')
  
  if (!fs.existsSync(sqlPath)) {
    console.error(`❌ SQL file not found: ${sqlPath}`)
    process.exit(1)
  }
  
  const sqlContent = fs.readFileSync(sqlPath, 'utf-8')
  
  console.log('\n📄 Migration SQL:')
  console.log('='.repeat(60))
  console.log(sqlContent)
  console.log('='.repeat(60) + '\n')
  
  try {
    // Execute ALTER TABLE statements
    console.log('1️⃣  Adding latitude column...')
    const { error: error1 } = await supabase.rpc('exec', {
      query: 'ALTER TABLE public.attendance_logs ADD COLUMN IF NOT EXISTS latitude NUMERIC'
    }).single()
    
    if (error1) {
      console.log('   Trying alternative method...')
      // Supabase doesn't expose exec RPC by default, we need to use a workaround
      // We'll create a temporary function
    }
    
    console.log('2️⃣  Adding longitude column...')
    const { error: error2 } = await supabase.rpc('exec', {
      query: 'ALTER TABLE public.attendance_logs ADD COLUMN IF NOT EXISTS longitude NUMERIC'
    }).single()
    
    console.log('\n✅ Attempting to verify columns...')
    
    // Try to query with the new columns
    const { data, error } = await supabase
      .from('attendance_logs')
      .select('id, latitude, longitude')
      .limit(1)
    
    if (error) {
      console.error('\n❌ Columns not found. Error:', error.message)
      console.log('\n⚠️  Manual action required:')
      console.log('Please run this SQL in Supabase SQL Editor:\n')
      console.log(sqlContent)
      process.exit(1)
    }
    
    console.log('✅ Migration successful! Columns are available.')
    console.log('📊 Sample query result:', data)
    
  } catch (err: any) {
    console.error('\n❌ Migration failed:', err.message)
    console.log('\n⚠️  Manual action required:')
    console.log('Please run this SQL in Supabase SQL Editor:\n')
    console.log(sqlContent)
    process.exit(1)
  }
}

runMigration()
