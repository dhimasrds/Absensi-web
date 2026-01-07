/**
 * Script untuk membuat dummy data employee dengan attendance dan foto
 * 
 * Jalankan dengan: npx tsx scripts/seed-dummy-data.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Supabase credentials
const SUPABASE_URL = 'https://lvtadyvwoalfnqvwzjzm.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2dGFkeXZ3b2FsZm5xdnd6anptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc2MDk0MSwiZXhwIjoyMDgzMzM2OTQxfQ.H1vT0m3PBGtbC-dUX-e3t5YFfDpMyxzB8uIFWFEDl5Y';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Generate random 128-dimensional face embedding
function generateFaceEmbedding(): number[] {
  const embedding: number[] = [];
  for (let i = 0; i < 128; i++) {
    embedding.push(Math.random() * 2 - 1); // Random value between -1 and 1
  }
  // Normalize the vector
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => val / magnitude);
}

// Generate a simple placeholder PNG image (1x1 orange pixel)
function generatePlaceholderImage(): Buffer {
  // Simple PNG with a face-like pattern (small colored image)
  // This is a minimal valid PNG file
  const pngData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk header
    0x00, 0x00, 0x00, 0x64, // width: 100
    0x00, 0x00, 0x00, 0x64, // height: 100
    0x08, 0x02, // bit depth: 8, color type: 2 (RGB)
    0x00, 0x00, 0x00, // compression, filter, interlace
    0x3F, 0xDB, 0x0F, 0xF1, // CRC
  ]);
  return pngData;
}

async function seedDummyData() {
  console.log('🚀 Starting seed process...\n');

  // 1. Create dummy employee
  console.log('👤 Creating employee...');
  const employeeData = {
    employee_id: 'EMP-001',
    full_name: 'John Doe',
    email: 'john.doe@company.com',
    department: 'IT Department',
    is_active: true,
  };

  // Check if employee exists by employee_id OR email
  let { data: existingEmployee } = await supabase
    .from('employees')
    .select('id')
    .eq('employee_id', employeeData.employee_id)
    .single();

  if (!existingEmployee) {
    // Also check by email
    const { data: byEmail } = await supabase
      .from('employees')
      .select('id')
      .eq('email', employeeData.email)
      .single();
    existingEmployee = byEmail;
  }

  let employeeId: string;
  
  if (existingEmployee) {
    console.log('   Employee already exists, using existing...');
    employeeId = existingEmployee.id;
  } else {
    const { data: newEmployee, error: empError } = await supabase
      .from('employees')
      .insert(employeeData)
      .select('id')
      .single();

    if (empError) {
      console.error('❌ Error creating employee:', empError);
      return;
    }
    employeeId = newEmployee.id;
    console.log('   ✅ Employee created:', employeeId);
  }

  // 2. Create device
  console.log('\n📱 Creating device...');
  const deviceData = {
    device_id: 'ANDROID-DEV-001',
    label: 'Samsung Galaxy S21',
    is_active: true,
  };

  const { data: existingDevice } = await supabase
    .from('devices')
    .select('id')
    .eq('device_id', deviceData.device_id)
    .single();

  let deviceId: string;
  let deviceIdString: string = deviceData.device_id;

  if (existingDevice) {
    console.log('   Device already exists, using existing...');
    deviceId = existingDevice.id;
  } else {
    const { data: newDevice, error: devError } = await supabase
      .from('devices')
      .insert(deviceData)
      .select('id')
      .single();

    if (devError) {
      console.error('❌ Error creating device:', devError);
      return;
    }
    deviceId = newDevice.id;
    console.log('   ✅ Device created:', deviceId);
  }

  // 3. Create face template
  console.log('\n🎭 Creating face template...');
  const embedding = generateFaceEmbedding();
  
  // Check if face template exists
  const { data: existingTemplate } = await supabase
    .from('face_templates')
    .select('id')
    .eq('employee_id', employeeId)
    .eq('is_active', true)
    .single();

  if (existingTemplate) {
    console.log('   Face template already exists, skipping...');
  } else {
    const { error: faceError } = await supabase
      .from('face_templates')
      .insert({
        employee_id: employeeId,
        embedding: `[${embedding.join(',')}]`,
        template_version: 1,
        is_active: true,
        quality_score: 0.95,
      });

    if (faceError) {
      console.error('❌ Error creating face template:', faceError);
      return;
    }
    console.log('   ✅ Face template created');
  }

  // 4. Upload proof image to storage
  console.log('\n📸 Uploading proof image...');
  
  // Create a simple colored image using canvas-like data
  // We'll use a pre-made small JPG placeholder
  const proofImagePath = `proofs/${employeeId}/${Date.now()}_checkin.jpg`;
  
  // Download a placeholder face image from a public URL
  const placeholderUrl = 'https://api.dicebear.com/7.x/personas/png?seed=JohnDoe&size=200';
  
  let imageBuffer: Buffer;
  try {
    const response = await fetch(placeholderUrl);
    const arrayBuffer = await response.arrayBuffer();
    imageBuffer = Buffer.from(arrayBuffer);
    console.log('   ✅ Downloaded placeholder image');
  } catch (e) {
    // Fallback: create a minimal valid JPEG
    console.log('   ⚠️ Using fallback minimal image');
    imageBuffer = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
      0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
      0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
      0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
      0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
      0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
      0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
      0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
      0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
      0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
      0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08,
      0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
      0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27, 0x28,
      0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00, 0xFB, 0xD5,
      0x00, 0x01, 0xFF, 0xD9
    ]);
  }

  // Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase
    .storage
    .from('attendance-proofs')
    .upload(proofImagePath, imageBuffer, {
      contentType: 'image/png',
      upsert: true,
    });

  if (uploadError) {
    console.error('❌ Error uploading image:', uploadError);
    // Continue anyway, attendance can be created without image
  } else {
    console.log('   ✅ Image uploaded:', proofImagePath);
  }

  // 5. Create attendance logs (CHECK_IN and CHECK_OUT for today)
  console.log('\n📋 Creating attendance logs...');
  
  const today = new Date();
  const checkInTime = new Date(today);
  checkInTime.setHours(8, 30, 0, 0); // 08:30 AM
  
  const checkOutTime = new Date(today);
  checkOutTime.setHours(17, 15, 0, 0); // 05:15 PM

  // Check-in
  const checkInData = {
    employee_id: employeeId,
    device_id: deviceIdString, // Use string device_id, not UUID
    type: 'CHECK_IN',
    source: 'ANDROID',
    client_capture_id: `capture_${Date.now()}_in`,
    timestamp: checkInTime.toISOString(),
    captured_at: checkInTime.toISOString(),
    verification_method: 'FACE',
    verification_status: 'VERIFIED',
    match_score: 0.9542,
    liveness_score: 0.9821,
    note: 'Absensi masuk - Face verified successfully',
    proof_image_path: uploadError ? null : proofImagePath,
    proof_image_mime: uploadError ? null : 'image/png',
  };

  const { data: checkIn, error: checkInError } = await supabase
    .from('attendance_logs')
    .insert(checkInData)
    .select('id')
    .single();

  if (checkInError) {
    console.error('❌ Error creating check-in:', checkInError);
    return;
  }
  console.log('   ✅ Check-in created:', checkIn.id);

  // Check-out (with different proof image)
  const proofImagePathOut = `proofs/${employeeId}/${Date.now()}_checkout.jpg`;
  
  if (!uploadError) {
    await supabase
      .storage
      .from('attendance-proofs')
      .upload(proofImagePathOut, imageBuffer, {
        contentType: 'image/png',
        upsert: true,
      });
  }

  const checkOutData = {
    employee_id: employeeId,
    device_id: deviceIdString, // Use string device_id, not UUID
    type: 'CHECK_OUT',
    source: 'ANDROID',
    client_capture_id: `capture_${Date.now()}_out`,
    timestamp: checkOutTime.toISOString(),
    captured_at: checkOutTime.toISOString(),
    verification_method: 'FACE',
    verification_status: 'VERIFIED',
    match_score: 0.9387,
    liveness_score: 0.9756,
    note: 'Absensi pulang - Face verified successfully',
    proof_image_path: uploadError ? null : proofImagePathOut,
    proof_image_mime: uploadError ? null : 'image/png',
  };

  const { data: checkOut, error: checkOutError } = await supabase
    .from('attendance_logs')
    .insert(checkOutData)
    .select('id')
    .single();

  if (checkOutError) {
    console.error('❌ Error creating check-out:', checkOutError);
    return;
  }
  console.log('   ✅ Check-out created:', checkOut.id);

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('✅ SEEDING COMPLETE!');
  console.log('='.repeat(50));
  console.log('\n📊 Summary:');
  console.log('   Employee: John Doe (EMP-001)');
  console.log('   Device: Samsung Galaxy S21');
  console.log('   Face Template: 128-dim embedding');
  console.log('   Attendance: Check-in 08:30, Check-out 17:15');
  console.log('   Proof Images: Uploaded to storage');
  console.log('\n🔗 View in dashboard: http://localhost:3000/dashboard');
}

// Run the seed
seedDummyData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
