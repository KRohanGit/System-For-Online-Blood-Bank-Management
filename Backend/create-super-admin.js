// Script to create SUPER_ADMIN user for the LifeLink system
// This is the central authority that governs the entire platform
// Run this script: node create-super-admin.js

const mongoose = require('mongoose');
require('dotenv').config();

// Define User schema inline
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true,
    enum: ['super_admin', 'hospital_admin', 'doctor', 'donor']
  },
  isVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const User = mongoose.model('User', userSchema);

async function createSuperAdmin() {
  try {
    // Connect to MongoDB
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Super Admin details
    const superAdminEmail = 'superadmin@lifelink.com';
    const superAdminPassword = 'SuperAdmin@2026'; // Strong default password
    
    console.log('\n📋 Super Admin Details:');
    console.log('Email:', superAdminEmail);
    console.log('Password:', superAdminPassword);
    console.log('Role: super_admin');
    
    // Check if super admin already exists
    const existingAdmin = await User.findOne({ email: superAdminEmail });
    
    if (existingAdmin) {
      // Check if user wants to reset password
      const resetPassword = process.argv.includes('--reset-password');
      
      if (resetPassword) {
        console.log('\n🔄 Resetting Super Admin password...');
        existingAdmin.password = superAdminPassword;
        existingAdmin.role = 'super_admin'; // Ensure role is updated
        existingAdmin.isVerified = true;
        await existingAdmin.save();
        console.log('✅ Super Admin password reset successfully!');
      } else {
        console.log('\n⚠️  Super Admin already exists!');
        console.log('Use --reset-password flag to reset the password');
        console.log('Example: node create-super-admin.js --reset-password');
      }
      
      await mongoose.connection.close();
      return;
    }

    // Hash password
    // Create Super Admin user
    const superAdmin = new User({
      email: superAdminEmail,
      password: superAdminPassword,
      role: 'super_admin',
      isVerified: true // Super admin is always verified
    });

    await superAdmin.save();
    console.log('✅ Super Admin user created successfully!');

    console.log('\n' + '='.repeat(60));
    console.log('🎉 SUPER ADMIN SETUP COMPLETE');
    console.log('='.repeat(60));
    console.log('\n📧 Login Credentials:');
    console.log('   Email:', superAdminEmail);
    console.log('   Password:', superAdminPassword);
    console.log('   Role: SUPER_ADMIN (Central Blood Bank Authority)');
    console.log('\n🔐 Security Note:');
    console.log('   ⚠️  CHANGE THIS PASSWORD after first login!');
    console.log('\n🎯 Responsibilities:');
    console.log('   • Verify and approve doctor registrations');
    console.log('   • Approve and manage hospital registrations');
    console.log('   • View system-wide blood availability');
    console.log('   • Access inter-cloud emergency coordination');
    console.log('   • View audit logs of all actions');
    console.log('   • Manage platform-level settings');
    console.log('\n🌐 Dashboard Access:');
    console.log('   Login at: http://localhost:3000/signin');
    console.log('   Dashboard: /super-admin/dashboard');
    console.log('='.repeat(60) + '\n');

    // Close connection
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');

  } catch (error) {
    console.error('\n❌ Error creating Super Admin:', error.message);
    
    if (error.code === 11000) {
      console.error('⚠️  Duplicate key error. Super Admin might already exist.');
      console.error('   Use --reset-password flag to reset credentials');
    }
    
    if (error.name === 'MongooseServerSelectionError') {
      console.error('\n💡 MongoDB Connection Failed!');
      console.error('   Check your MONGODB_URI in .env file');
      console.error('   Ensure your IP is whitelisted in MongoDB Atlas');
    }
    
    process.exit(1);
  }
}

// Run the script
console.log('\n' + '='.repeat(60));
console.log('🩸 LifeLink - Super Admin Creation Script');
console.log('='.repeat(60) + '\n');

createSuperAdmin();
