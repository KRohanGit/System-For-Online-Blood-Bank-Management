const mongoose = require('mongoose');
const User = require('./src/models/User');
const DoctorProfile = require('./src/models/DoctorProfile');
require('dotenv').config();

async function fixDoctorVerificationStatus() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all doctors
    const doctors = await User.find({ role: 'doctor' });
    console.log(`\n📊 Found ${doctors.length} doctors in the system`);

    for (const doctor of doctors) {
      console.log(`\n👨‍⚕️ Checking doctor: ${doctor.email}`);
      console.log(`   User isVerified: ${doctor.isVerified}`);

      const profile = await DoctorProfile.findOne({ userId: doctor._id });
      
      if (!profile) {
        console.log(`   ⚠️ No profile found for this doctor!`);
        continue;
      }

      console.log(`   Profile verificationStatus: ${profile.verificationStatus || 'NOT SET'}`);

      // If user is verified but profile status is not 'approved', fix it
      if (doctor.isVerified === true && profile.verificationStatus !== 'approved') {
        console.log(`   🔧 FIXING: User is verified but profile status is '${profile.verificationStatus}'`);
        
        await DoctorProfile.updateOne(
          { userId: doctor._id },
          { 
            verificationStatus: 'approved',
            verifiedAt: profile.verifiedAt || new Date()
          }
        );
        
        console.log(`   ✅ Fixed: Profile verificationStatus set to 'approved'`);
      }
      // If profile is approved but user is not verified, fix user
      else if (profile.verificationStatus === 'approved' && doctor.isVerified !== true) {
        console.log(`   🔧 FIXING: Profile is approved but user isVerified is ${doctor.isVerified}`);
        
        doctor.isVerified = true;
        await doctor.save();
        
        console.log(`   ✅ Fixed: User isVerified set to true`);
      }
      // If both are pending, set a default
      else if (!profile.verificationStatus) {
        console.log(`   🔧 FIXING: Profile has no verificationStatus field`);
        
        await DoctorProfile.updateOne(
          { userId: doctor._id },
          { verificationStatus: doctor.isVerified ? 'approved' : 'pending' }
        );
        
        console.log(`   ✅ Fixed: Profile verificationStatus set to '${doctor.isVerified ? 'approved' : 'pending'}'`);
      }
      else {
        console.log(`   ✅ Status is consistent`);
      }
    }

    console.log('\n\n📋 SUMMARY - All Doctors:');
    console.log('═══════════════════════════════════════════════════════\n');
    
    for (const doctor of doctors) {
      const profile = await DoctorProfile.findOne({ userId: doctor._id });
      console.log(`📧 ${doctor.email}`);
      console.log(`   User isVerified: ${doctor.isVerified}`);
      console.log(`   Profile status: ${profile?.verificationStatus || 'NO PROFILE'}`);
      console.log(`   ✅ Can login: ${doctor.isVerified === true || profile?.verificationStatus === 'approved'}`);
      console.log('');
    }

    console.log('✅ All doctors processed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixDoctorVerificationStatus();
