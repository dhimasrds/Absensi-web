/**
 * Script to check if face photo feature is properly set up
 * 
 * Checks:
 * 1. Database columns: face_photo_path, face_photo_mime in face_templates
 * 2. Storage bucket: face-photos exists
 * 3. Storage policies: proper access policies
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkSetup() {
  console.log('🔍 Checking Face Photo Feature Setup...\n')

  // 1. Check database columns
  console.log('1️⃣ Checking database columns...')
  try {
    const { data: columns, error } = await supabase
      .from('face_templates')
      .select('face_photo_path, face_photo_mime')
      .limit(1)

    if (error) {
      console.error('❌ Database columns NOT found:', error.message)
      console.log('   👉 Run: sql/006_add_face_photo_path.sql in Supabase SQL Editor\n')
    } else {
      console.log('✅ Database columns exist (face_photo_path, face_photo_mime)\n')
    }
  } catch (err) {
    console.error('❌ Error checking columns:', err)
  }

  // 2. Check storage bucket
  console.log('2️⃣ Checking storage bucket...')
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets()

    if (error) {
      console.error('❌ Error listing buckets:', error.message)
    } else {
      const facePhotosBucket = buckets.find(b => b.id === 'face-photos')
      if (facePhotosBucket) {
        console.log('✅ Storage bucket "face-photos" exists')
        console.log(`   - Public: ${facePhotosBucket.public}`)
        console.log(`   - File size limit: ${facePhotosBucket.file_size_limit ? `${facePhotosBucket.file_size_limit / 1024 / 1024}MB` : 'unlimited'}`)
        console.log(`   - Allowed MIME types: ${facePhotosBucket.allowed_mime_types?.join(', ') || 'all'}\n`)
      } else {
        console.error('❌ Storage bucket "face-photos" NOT found')
        console.log('   👉 Run: sql/007_face_photos_bucket.sql in Supabase SQL Editor\n')
      }
    }
  } catch (err) {
    console.error('❌ Error checking bucket:', err)
  }

  // 3. Test upload (optional - commented out to avoid creating test files)
  console.log('3️⃣ Testing upload permission...')
  try {
    // Create a small test image (1x1 transparent PNG)
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    const buffer = Buffer.from(testImageBase64, 'base64')
    
    const testPath = `test-${Date.now()}.png`
    
    const { error: uploadError } = await supabase.storage
      .from('face-photos')
      .upload(testPath, buffer, {
        contentType: 'image/png',
      })

    if (uploadError) {
      console.error('❌ Upload test FAILED:', uploadError.message)
      console.log('   Check storage policies in Supabase Dashboard\n')
    } else {
      console.log('✅ Upload permission OK')
      
      // Clean up test file
      await supabase.storage.from('face-photos').remove([testPath])
      console.log('   (test file cleaned up)\n')
    }
  } catch (err) {
    console.error('❌ Error testing upload:', err)
  }

  // 4. Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📋 SUMMARY:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('If you see ❌ errors above, you need to:')
  console.log('1. Open Supabase Dashboard → SQL Editor')
  console.log('2. Run sql/006_add_face_photo_path.sql')
  console.log('3. Run sql/007_face_photos_bucket.sql')
  console.log('4. Run this script again to verify')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

checkSetup()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
