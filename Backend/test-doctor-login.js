const mongoose = require('mongoose');
const User = require('./src/models/User');
const DoctorProfile = require('./src/models/DoctorProfile');
require('dotenv').config();

async function testDoctorLogin() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all doctors
    const doctors = await User.find({ role: 'doctor' });
    console.log(`📊 Total doctors in system: ${doctors.length}\n`);

    console.log('═══════════════════════════════════════════════════════');
    console.log('🔍 DOCTOR LOGIN STATUS CHECK');
    console.log('═══════════════════════════════════════════════════════\n');

    for (const doctor of doctors) {
      const profile = await DoctorProfile.findOne({ userId: doctor._id });
      
      const canLogin = doctor.isVerified === true || profile?.verificationStatus === 'approved';
      const statusIcon = canLogin ? '✅' : '❌';
      
      console.log(`${statusIcon} Doctor: ${doctor.email}`);
      console.log(`   User ID: ${doctor._id}`);
      console.log(`   User.isVerified: ${doctor.isVerified}`);
      console.log(`   Profile.verificationStatus: ${profile?.verificationStatus || 'NO PROFILE'}`);
      console.log(`   Can Login: ${canLogin ? 'YES ✅' : 'NO ❌ (PENDING APPROVAL)'}`);
      
      if (!canLogin) {
        console.log(`   ⚠️  ACTION NEEDED: Super admin must approve this doctor`);
      }
      
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log('📋 LOGIN FLOW EXPLANATION');
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('A doctor can login if EITHER of these is true:');
    console.log('  1. User.isVerified === true');
    console.log('  2. DoctorProfile.verificationStatus === "approved"');
    console.log('\nWhen super admin approves a doctor:');
    console.log('  - Sets User.isVerified = true');
    console.log('  - Sets DoctorProfile.verificationStatus = "approved"');
    console.log('\nAfter approval, doctor should be able to:');
    console.log('  1. Login successfully');
    console.log('  2. Access doctor dashboard');
    console.log('  3. See their profile and tasks\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testDoctorLogin();
