import { createAdminSupabaseClient } from '../src/lib/supabase/admin'
import { verifyAccessToken } from '../src/lib/auth/mobileJwt'

const token = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJiYTY3OGJlZS1kYTEzLTRjZjAtOTg5Zi1jNWYzZDRiODZkNjUiLCJkZXZpY2VJZCI6IjczNzM4N2Q1LWUxNWItNGYwNy1iZWNjLWQwNzhiOTdmNzYwYiIsImRldmljZUlkU3RyaW5nIjoiQU5EUk9JRC1ERVYtMDAxIiwiZW1wbG95ZWVJZCI6IkVNUDAwMSIsImZ1bGxOYW1lIjoiRGhpbWFzIHNhcHV0cmEiLCJ0eXBlIjoiYWNjZXNzIiwiaXNzIjoiYXR0ZW5kYW5jZS1hcHAiLCJpYXQiOjE3Njc4MTUzNzQsImV4cCI6MTc2NzgxODk3NH0.p7fbyTmpPnmxDMhVKgd9-pWMuRux9b9GpdyN2FDludQ'

async function testMeEndpoint() {
  try {
    console.log('🔍 Testing /api/mobile/me endpoint...\n')

    // 1. Verify token
    console.log('1️⃣ Verifying JWT token...')
    const payload = await verifyAccessToken(token)
    console.log('✅ Token valid!')
    console.log('Payload:', JSON.stringify(payload, null, 2))

    // 2. Query employee
    console.log('\n2️⃣ Querying employee from database...')
    const supabase = createAdminSupabaseClient()
    
    const { data: employee, error } = await supabase
      .from('employees')
      .select(`
        id,
        employee_id,
        full_name,
        email,
        department,
        is_active,
        work_location_id,
        created_at,
        work_location:work_locations (
          id,
          name,
          address,
          latitude,
          longitude,
          radius_meters
        ),
        face_templates (
          id,
          template_version,
          is_active,
          created_at
        )
      `)
      .eq('id', payload.sub)
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('❌ Database error:', error)
      return
    }

    if (!employee) {
      console.error('❌ Employee not found')
      return
    }

    console.log('✅ Employee found!')
    console.log('Employee data:', JSON.stringify(employee, null, 2))

    // 3. Get device info
    console.log('\n3️⃣ Querying device from database...')
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('id, device_id, label')
      .eq('id', payload.deviceId)
      .eq('is_active', true)
      .single()

    if (deviceError) {
      console.log('⚠️ Device query error:', deviceError)
    } else if (device) {
      console.log('✅ Device found:', device)
    } else {
      console.log('⚠️ Device not found (but that\'s okay)')
    }

    // 4. Get session count
    console.log('\n4️⃣ Counting active sessions...')
    const { count: activeSessions, error: sessionError } = await supabase
      .from('mobile_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('employee_id', payload.sub)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())

    if (sessionError) {
      console.log('⚠️ Session count error:', sessionError)
    } else {
      console.log('✅ Active sessions:', activeSessions)
    }

    console.log('\n✨ Test completed successfully!')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testMeEndpoint()
