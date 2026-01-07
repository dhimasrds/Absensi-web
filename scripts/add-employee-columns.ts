import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

// Use service role to execute raw SQL
async function addColumns() {
  console.log('🚀 Adding phone_number and job_title columns...\n')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  // Make direct HTTP request to Supabase REST API
  const sql = `
    ALTER TABLE public.employees 
    ADD COLUMN IF NOT EXISTS phone_number text,
    ADD COLUMN IF NOT EXISTS job_title text;
  `

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ query: sql })
    })

    if (!response.ok) {
      console.log('⚠️  Direct SQL execution not available')
      console.log('\nPlease run this SQL in Supabase SQL Editor:')
      console.log('\n' + sql)
      console.log('\nOR manually add columns in Supabase Dashboard:')
      console.log('   1. Go to: https://supabase.com/dashboard/project/lvtadyvwoalfnqvwzjzm')
      console.log('   2. Table Editor → employees')
      console.log('   3. Add column: phone_number (text, nullable)')
      console.log('   4. Add column: job_title (text, nullable)')
      return
    }

    console.log('✅ Columns added successfully!')
  } catch (error) {
    console.log('⚠️  Could not execute via API')
    console.log('\nPlease run this SQL in Supabase SQL Editor:')
    console.log('\nALTER TABLE public.employees ')
    console.log('ADD COLUMN IF NOT EXISTS phone_number text,')
    console.log('ADD COLUMN IF NOT EXISTS job_title text;')
  }

  // Verify
  console.log('\n🔍 Verifying columns...')
  const supabase = createClient(supabaseUrl, serviceKey)
  
  const { data, error } = await supabase
    .from('employees')
    .select('id, phone_number, job_title')
    .limit(1)

  if (error) {
    if (error.message.includes('column') && error.message.includes('does not exist')) {
      console.log('❌ Columns not added yet')
      console.log('\n📋 Manual Steps:')
      console.log('   1. Open Supabase Dashboard: https://supabase.com/dashboard')
      console.log('   2. Go to SQL Editor')
      console.log('   3. Run this SQL:')
      console.log('\n   ALTER TABLE public.employees')
      console.log('   ADD COLUMN IF NOT EXISTS phone_number text,')
      console.log('   ADD COLUMN IF NOT EXISTS job_title text;')
    } else {
      console.log('Error:', error.message)
    }
  } else {
    console.log('✅ Columns verified:')
    console.log('   - phone_number ✅')
    console.log('   - job_title ✅')
  }
}

addColumns()
