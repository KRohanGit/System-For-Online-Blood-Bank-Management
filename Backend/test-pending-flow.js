/**
 * Complete Test Script for Pending Users Issue
 * This will help identify exactly where the problem is
 * 
 * Run: node test-pending-flow.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const DoctorProfile = require('./src/models/DoctorProfile');
const HospitalProfile = require('./src/models/HospitalProfile');

async function testPendingFlow() {
  try {
    console.log('\n🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected\n');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('  TEST 1: Check Current State');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Check current pending users
    const pendingBefore = await User.find({
      isVerified: false,
      role: { $in: ['hospital_admin', 'doctor'] }
    }).select('email role isVerified createdAt');

    console.log(`📊 Pending users RIGHT NOW: ${pendingBefore.length}`);
    pendingBefore.forEach(user => {
      console.log(`  - ${user.email} | ${user.role} | isVerified: ${user.isVerified} | Created: ${user.createdAt}`);
    });

    if (pendingBefore.length === 0) {
      console.log('\n⚠️  NO PENDING USERS FOUND!');
      console.log('This is why your Super Admin dashboard is empty.\n');
      console.log('Let\'s check all users in the database:\n');

      const allUsers = await User.find({}).select('email role isVerified createdAt');
      console.log(`📋 ALL USERS (${allUsers.length} total):`);
      allUsers.forEach(user => {
        console.log(`  - ${user.email} | ${user.role} | isVerified: ${user.isVerified}`);
      });
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  TEST 2: Simulate API Query (What Backend Returns)');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Simulate exactly what the backend API does
    const query = {
      isVerified: false,
      role: { $in: ['hospital_admin', 'doctor'] }
    };

    console.log('🔍 Query being used:');
    console.log(JSON.stringify(query, null, 2));

    const result = await User.find(query)
      .select('email role createdAt')
      .sort({ createdAt: -1 });

    console.log(`\n📥 API would return: ${result.length} users`);
    
    if (result.length > 0) {
      console.log('\n📝 Response data:');
      result.forEach(user => {
        console.log(`  {`);
        console.log(`    _id: "${user._id}",`);
        console.log(`    email: "${user.email}",`);
        console.log(`    role: "${user.role}",`);
        console.log(`    createdAt: "${user.createdAt}"`);
        console.log(`  }`);
      });
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  TEST 3: Check for Auto-Approval Bug');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Check if any users have been recently verified (in last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentlyVerified = await User.find({
      role: { $in: ['hospital_admin', 'doctor'] },
      isVerified: true,
      updatedAt: { $gte: oneHourAgo }
    }).select('email role isVerified updatedAt');

    console.log(`🔍 Recently verified users (last hour): ${recentlyVerified.length}`);
    if (recentlyVerified.length > 0) {
      console.log('\n⚠️  These users were recently verified:');
      recentlyVerified.forEach(user => {
        console.log(`  - ${user.email} | ${user.role} | Verified at: ${user.updatedAt}`);
      });
      console.log('\n💡 If these were NOT manually approved by Super Admin,');
      console.log('   there might be an auto-approval bug somewhere!');
    } else {
      console.log('  ✅ No users were auto-verified in the last hour');
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  TEST 4: Verify Query is Working Correctly');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Let's manually check each doctor and hospital_admin
    const allDoctors = await User.find({ role: 'doctor' }).select('email isVerified');
    const allHospitals = await User.find({ role: 'hospital_admin' }).select('email isVerified');

    console.log(`👨‍⚕️ Doctors: ${allDoctors.length} total`);
    const pendingDoctors = allDoctors.filter(u => !u.isVerified);
    const verifiedDoctors = allDoctors.filter(u => u.isVerified);
    console.log(`  - Pending: ${pendingDoctors.length}`);
    pendingDoctors.forEach(u => console.log(`    • ${u.email}`));
    console.log(`  - Verified: ${verifiedDoctors.length}`);
    verifiedDoctors.forEach(u => console.log(`    • ${u.email}`));

    console.log(`\n🏥 Hospital Admins: ${allHospitals.length} total`);
    const pendingHospitals = allHospitals.filter(u => !u.isVerified);
    const verifiedHospitals = allHospitals.filter(u => u.isVerified);
    console.log(`  - Pending: ${pendingHospitals.length}`);
    pendingHospitals.forEach(u => console.log(`    • ${u.email}`));
    console.log(`  - Verified: ${verifiedHospitals.length}`);
    verifiedHospitals.forEach(u => console.log(`    • ${u.email}`));

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  DIAGNOSIS');
    console.log('═══════════════════════════════════════════════════════════\n');

    const totalPending = pendingDoctors.length + pendingHospitals.length;
    
    if (totalPending === 0) {
      console.log('❌ PROBLEM IDENTIFIED:');
      console.log('   All users are already verified (isVerified: true)');
      console.log('\n💡 POSSIBLE CAUSES:');
      console.log('   1. You manually approved them all');
      console.log('   2. There\'s an auto-approval bug in registration');
      console.log('   3. Someone is running an approval script');
      console.log('\n🔧 SOLUTION:');
      console.log('   Register a NEW doctor or hospital admin to test the flow');
      console.log('   After registration, immediately run this script again');
      console.log('   If the new user is ALSO verified, there\'s an auto-approval bug');
    } else {
      console.log('✅ DATABASE IS CORRECT:');
      console.log(`   There ARE ${totalPending} pending user(s) in the database`);
      console.log('\n💡 THE ISSUE IS IN:');
      console.log('   1. The API endpoint not returning them correctly, OR');
      console.log('   2. The frontend not displaying them correctly, OR');
      console.log('   3. The auto-refresh is clearing them');
      console.log('\n🔧 NEXT STEP:');
      console.log('   Restart your backend server with the new logging');
      console.log('   Check the backend console when dashboard loads');
      console.log('   It should show these pending users');
    }

    console.log('\n═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔒 Connection closed\n');
  }
}

testPendingFlow();
