// Diagnostic script to check pending users issue
// Run this: node diagnose-pending-users.js

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const DoctorProfile = require('./src/models/DoctorProfile');
const HospitalProfile = require('./src/models/HospitalProfile');

async function diagnose() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('============================================');
    console.log('  PENDING USERS DIAGNOSTIC REPORT');
    console.log('============================================\n');

    // 1. Get all users
    const allUsers = await User.find({}).select('email role isVerified createdAt');
    console.log(`📊 Total users in database: ${allUsers.length}\n`);

    // 2. Group users by role and verification status
    const userGroups = {};
    allUsers.forEach(user => {
      const key = `${user.role}_${user.isVerified ? 'verified' : 'pending'}`;
      if (!userGroups[key]) {
        userGroups[key] = [];
      }
      userGroups[key].push(user);
    });

    console.log('📋 USER BREAKDOWN:');
    Object.keys(userGroups).sort().forEach(key => {
      const users = userGroups[key];
      console.log(`\n  ${key}: ${users.length} user(s)`);
      users.forEach(user => {
        console.log(`    - ${user.email} (Created: ${user.createdAt.toISOString()})`);
      });
    });

    // 3. Check pending users specifically
    console.log('\n\n⏳ PENDING USERS (Need Approval):');
    const pendingUsers = await User.find({
      isVerified: false,
      role: { $in: ['hospital_admin', 'doctor'] }
    }).select('email role createdAt').sort({ createdAt: -1 });

    if (pendingUsers.length === 0) {
      console.log('  ❌ NO PENDING USERS FOUND!');
      console.log('  All doctors and hospital admins are already verified.');
    } else {
      console.log(`  ✅ Found ${pendingUsers.length} pending user(s):\n`);
      for (const user of pendingUsers) {
        console.log(`  - ${user.email} (${user.role})`);
        console.log(`    Created: ${user.createdAt.toISOString()}`);
        
        // Check for profile
        if (user.role === 'doctor') {
          const profile = await DoctorProfile.findOne({ userId: user._id });
          if (profile) {
            console.log(`    Profile: ${profile.fullName} - ${profile.hospitalName}`);
            console.log(`    Status: ${profile.verificationStatus}`);
          } else {
            console.log(`    ⚠️ WARNING: No profile found!`);
          }
        } else if (user.role === 'hospital_admin') {
          const profile = await HospitalProfile.findOne({ userId: user._id });
          if (profile) {
            console.log(`    Profile: ${profile.hospitalName} (Admin: ${profile.adminName})`);
            console.log(`    Status: ${profile.verificationStatus}`);
          } else {
            console.log(`    ⚠️ WARNING: No profile found!`);
          }
        }
        console.log('');
      }
    }

    // 4. Check for orphaned profiles (profiles without users)
    console.log('\n🔍 CHECKING FOR ORPHANED PROFILES:');
    const allDoctorProfiles = await DoctorProfile.find({});
    const allHospitalProfiles = await HospitalProfile.find({});
    
    let orphanedDoctors = 0;
    let orphanedHospitals = 0;

    for (const profile of allDoctorProfiles) {
      const user = await User.findById(profile.userId);
      if (!user) {
        console.log(`  ⚠️ Orphaned doctor profile: ${profile.fullName} (User ID: ${profile.userId})`);
        orphanedDoctors++;
      }
    }

    for (const profile of allHospitalProfiles) {
      const user = await User.findById(profile.userId);
      if (!user) {
        console.log(`  ⚠️ Orphaned hospital profile: ${profile.hospitalName} (User ID: ${profile.userId})`);
        orphanedHospitals++;
      }
    }

    if (orphanedDoctors === 0 && orphanedHospitals === 0) {
      console.log('  ✅ No orphaned profiles found');
    }

    // 5. Summary
    console.log('\n\n============================================');
    console.log('  SUMMARY');
    console.log('============================================');
    console.log(`  Total Users: ${allUsers.length}`);
    console.log(`  Pending Approvals: ${pendingUsers.length}`);
    console.log(`  Doctor Profiles: ${allDoctorProfiles.length}`);
    console.log(`  Hospital Profiles: ${allHospitalProfiles.length}`);
    console.log(`  Orphaned Profiles: ${orphanedDoctors + orphanedHospitals}`);
    console.log('============================================\n');

    // 6. Recommendations
    console.log('💡 RECOMMENDATIONS:');
    if (pendingUsers.length === 0) {
      console.log('  - Register a new doctor or hospital admin to test approval flow');
      console.log('  - Check if users are being auto-approved during registration');
    } else {
      console.log('  - You have pending users waiting for approval');
      console.log('  - Check Super Admin dashboard to approve/reject them');
    }
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔒 Database connection closed');
  }
}

diagnose();
