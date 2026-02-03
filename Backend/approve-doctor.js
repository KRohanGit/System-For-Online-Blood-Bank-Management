// Quick script to approve a doctor manually
require('dotenv').config();
const mongoose = require('mongoose');
const DoctorProfile = require('./src/models/DoctorProfile');
const User = require('./src/models/User');

const approveDoctor = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get the most recent pending doctor
    const pendingDoctor = await DoctorProfile.findOne({ verificationStatus: 'pending' })
      .populate('userId')
      .sort({ createdAt: -1 });

    if (!pendingDoctor) {
      console.log('❌ No pending doctors found');
      process.exit(0);
    }

    console.log('\n📋 Doctor Details:');
    console.log(`Name: ${pendingDoctor.fullName}`);
    console.log(`Email: ${pendingDoctor.userId.email}`);
    console.log(`Hospital: ${pendingDoctor.hospitalName}`);
    console.log(`Status: ${pendingDoctor.verificationStatus}`);
    console.log(`Certificate: ${pendingDoctor.certificateFilePath}`);

    // Approve the doctor
    pendingDoctor.verificationStatus = 'approved';
    pendingDoctor.verifiedAt = new Date();
    await pendingDoctor.save();

    // Update user verification status
    await User.findByIdAndUpdate(pendingDoctor.userId._id, { isVerified: true });

    console.log('\n✅ Doctor approved successfully!');
    console.log('The doctor can now sign in and access their dashboard.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

approveDoctor();
