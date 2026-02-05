const mongoose = require('mongoose');
const User = require('./src/models/User');
const DoctorProfile = require('./src/models/DoctorProfile');
require('dotenv').config();

async function fixAllApprovedDoctors() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('═══════════════════════════════════════════════════════');
    console.log('🔧 FIXING ALL APPROVED DOCTORS');
    console.log('═══════════════════════════════════════════════════════\n');

    // Find all doctors where User.isVerified is true
    const approvedUsers = await User.find({ 
      role: 'doctor',
      isVerified: true 
    });

    console.log(`📊 Found ${approvedUsers.length} approved doctor users\n`);

    let fixedCount = 0;
    let alreadyCorrect = 0;
    let noProfileCount = 0;
    let createdProfileCount = 0;

    for (const user of approvedUsers) {
      console.log(`\n🔍 Checking doctor: ${user.email}`);
      
      // Find profile
      let profile = await DoctorProfile.findOne({ userId: user._id });
      
      if (!profile) {
        console.log('   ❌ NO PROFILE FOUND - Cannot fix without profile data');
        console.log('   ℹ️  This doctor needs to register again or profile needs to be created manually');
        noProfileCount++;
        continue;
      }

      console.log(`   Current status: ${profile.verificationStatus}`);
      
      if (profile.verificationStatus === 'approved') {
        console.log('   ✅ Already correct');
        alreadyCorrect++;
      } else {
        // Update profile
        profile.verificationStatus = 'approved';
        profile.verifiedAt = profile.verifiedAt || new Date();
        await profile.save();
        
        console.log('   ✅ FIXED: Updated verificationStatus to "approved"');
        fixedCount++;
      }
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 SUMMARY');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Total approved doctors checked: ${approvedUsers.length}`);
    console.log(`Already correct: ${alreadyCorrect}`);
    console.log(`Fixed: ${fixedCount}`);
    console.log(`No profile found: ${noProfileCount}`);
    console.log('');

    if (fixedCount > 0) {
      console.log('✅ Successfully fixed doctor verification status!');
      console.log('');
      console.log('Doctors can now:');
      console.log('  1. Logout if currently logged in');
      console.log('  2. Login again with their credentials');
      console.log('  3. Access the doctor dashboard');
    } else if (noProfileCount > 0) {
      console.log('⚠️  Some doctors have no profile');
      console.log('These doctors need to:');
      console.log('  1. Register again OR');
      console.log('  2. Contact admin to manually create their profile');
    } else {
      console.log('✅ All approved doctors already have correct status!');
    }

    console.log('');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixAllApprovedDoctors();
