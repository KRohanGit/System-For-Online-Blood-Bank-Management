const mongoose = require('mongoose');
const User = require('./src/models/User');
const DoctorProfile = require('./src/models/DoctorProfile');
require('dotenv').config();

async function diagnoseDoctorLogin() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get doctor email from command line argument
    const email = process.argv[2];
    
    if (!email) {
      console.log('❌ Please provide doctor email as argument');
      console.log('Usage: node diagnose-doctor-login.js doctor@email.com');
      process.exit(1);
    }

    console.log(`🔍 Checking login for: ${email}\n`);
    
    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.log('❌ User not found in database');
      process.exit(1);
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log('USER MODEL DATA');
    console.log('═══════════════════════════════════════════════════════');
    console.log('User ID:', user._id);
    console.log('Email:', user.email);
    console.log('Role:', user.role);
    console.log('isVerified:', user.isVerified);
    console.log('Created At:', user.createdAt);
    console.log('');

    // Find profile
    const profile = await DoctorProfile.findOne({ userId: user._id });
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('DOCTOR PROFILE DATA');
    console.log('═══════════════════════════════════════════════════════');
    
    if (!profile) {
      console.log('❌ NO DOCTOR PROFILE FOUND!');
      console.log('');
      console.log('⚠️  PROBLEM: User exists but DoctorProfile is missing');
      console.log('This can happen if:');
      console.log('  1. Profile was deleted manually');
      console.log('  2. Registration process failed halfway');
      console.log('  3. Database inconsistency');
      console.log('');
      console.log('🔧 FIX: Run the fix-doctor-verification-status.js script');
    } else {
      console.log('Profile ID:', profile._id);
      console.log('Full Name:', profile.fullName);
      console.log('Hospital Name:', profile.hospitalName);
      console.log('verificationStatus:', profile.verificationStatus);
      console.log('Created At:', profile.createdAt);
      if (profile.verifiedAt) {
        console.log('Verified At:', profile.verifiedAt);
      }
      if (profile.verifiedBy) {
        console.log('Verified By:', profile.verifiedBy);
      }
    }
    console.log('');

    console.log('═══════════════════════════════════════════════════════');
    console.log('LOGIN DECISION');
    console.log('═══════════════════════════════════════════════════════');
    
    const condition1 = user.isVerified === true;
    const condition2 = profile?.verificationStatus === 'approved';
    const canLogin = condition1 || condition2;
    
    console.log('Condition 1 (User.isVerified === true):', condition1 ? '✅ TRUE' : '❌ FALSE');
    console.log('Condition 2 (Profile.verificationStatus === "approved"):', condition2 ? '✅ TRUE' : '❌ FALSE');
    console.log('');
    console.log('Can Login (Condition 1 OR Condition 2):', canLogin ? '✅ YES' : '❌ NO');
    console.log('');
    
    if (canLogin) {
      console.log('✅ DOCTOR CAN LOGIN');
      console.log('After login, they should be redirected to /doctor/dashboard');
      console.log('');
      console.log('If they are still seeing "pending approval" page:');
      console.log('  1. Check if they are using an OLD TOKEN from before approval');
      console.log('  2. They should logout and login again to get fresh token');
      console.log('  3. Clear browser cache/localStorage');
      console.log('  4. Check browser console for errors');
    } else {
      console.log('❌ DOCTOR CANNOT LOGIN YET');
      console.log('');
      console.log('Action Required: Super Admin must approve this doctor');
      console.log('  1. Login as super admin');
      console.log('  2. Go to Pending Users section');
      console.log('  3. Click "Approve" for this doctor');
      console.log('  4. Approval will set:');
      console.log('     - User.isVerified = true');
      console.log('     - DoctorProfile.verificationStatus = "approved"');
    }
    
    console.log('');
    console.log('═══════════════════════════════════════════════════════');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

diagnoseDoctorLogin();
