// Script to create a HOSPITAL_ADMIN user for the LifeLink system
// This represents a hospital's blood bank management
// Run this script: node create-admin.js

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

// Define HospitalProfile schema inline
const hospitalProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  hospitalName: {
    type: String,
    required: true
  },
  officialEmail: {
    type: String,
    required: true
  },
  licenseNumber: {
    type: String,
    required: true,
    unique: true
  },
  licenseFilePath: {
    type: String,
    required: true
  },
  adminName: {
    type: String,
    required: true
  },
  adminEmail: {
    type: String,
    required: true
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  }
}, {
  timestamps: true
});

const HospitalProfile = mongoose.model('HospitalProfile', hospitalProfileSchema);

async function createAdminUser() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Admin user details
    const adminEmail = 'admin@lifelink.com';
    const adminPassword = 'Admin@123'; // Default password
    
    // Hospital details for admin
    const hospitalData = {
      hospitalName: 'LifeLink Central Hospital',
      officialEmail: 'contact@lifelink-hospital.com',
      licenseNumber: 'HOSP-ADMIN-2026',
      licenseFilePath: 'system/admin-hospital-license.pdf',
      adminName: 'Hospital Administrator',
      adminEmail: adminEmail
    };
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (existingAdmin) {
      console.log('⚠️  Hospital Admin user already exists!');
      console.log('Email:', adminEmail);
      console.log('Use this to login to the hospital admin portal.');
      
      // Check if hospital profile exists
      const existingHospital = await HospitalProfile.findOne({ userId: existingAdmin._id });
      
      if (!existingHospital) {
        console.log('\n🏥 Creating hospital profile for admin...');
        const hospitalProfile = new HospitalProfile({
          userId: existingAdmin._id,
          ...hospitalData,
          verificationStatus: 'approved'
        });
        await hospitalProfile.save();
        console.log('✅ Hospital profile created!');
      } else {
        console.log('✅ Hospital profile already exists:', existingHospital.hospitalName);
      }
      
      // Optionally update password
      const updatePassword = process.argv.includes('--reset-password');
      if (updatePassword) {
        console.log('\n🔄 Resetting hospital admin password...');
        existingAdmin.password = adminPassword;
        existingAdmin.role = 'hospital_admin'; // Update role
        existingAdmin.isVerified = true;
        await existingAdmin.save();
        console.log('✅ Hospital Admin password reset successfully!');
        console.log('New password:', adminPassword);
      }
    } else {
      // Create new hospital admin user
      console.log('\n🔨 Creating Hospital Admin user...');

      const admin = new User({
        email: adminEmail,
        password: adminPassword,
        role: 'hospital_admin',
        isVerified: true
      });
      
      await admin.save();
      console.log('✅ Hospital Admin user created successfully!');
      
      // Create hospital profile for admin
      console.log('🏥 Creating hospital profile...');
      const hospitalProfile = new HospitalProfile({
        userId: admin._id,
        ...hospitalData,
        verificationStatus: 'approved'
      });
      await hospitalProfile.save();
      console.log('✅ Hospital profile created!');
    }
    
    // Get final admin and hospital details
    const finalAdmin = await User.findOne({ email: adminEmail });
    const finalHospital = await HospitalProfile.findOne({ userId: finalAdmin._id });
    
    // Display login credentials
    console.log('\n' + '='.repeat(60));
    console.log('🏥 HOSPITAL ADMIN LOGIN CREDENTIALS');
    console.log('='.repeat(60));
    console.log('Email:          ', adminEmail);
    console.log('Password:       ', adminPassword);
    console.log('Role:           ', 'HOSPITAL_ADMIN');
    console.log('Hospital Name:  ', finalHospital.hospitalName);
    console.log('License Number: ', finalHospital.licenseNumber);
    console.log('Portal:         ', 'http://localhost:3000/signin');
    console.log('='.repeat(60));
    console.log('\n🎯 Responsibilities:');
    console.log('   • Manage hospital blood inventory');
    console.log('   • Raise blood requests for patients');
    console.log('   • Trigger emergency blood requests');
    console.log('   • View nearby hospital availability');
    console.log('   • Contact donors during shortages');
    console.log('   • Coordinate with other hospitals');
    console.log('\n💡 After login, you will be redirected to:');
    console.log('   http://localhost:3000/admin/dashboard');
    console.log('\n⚠️  IMPORTANT: Change the password after first login!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

// Run the script
createAdminUser();
