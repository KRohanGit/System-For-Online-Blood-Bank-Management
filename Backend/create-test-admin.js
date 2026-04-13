require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function createTestAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check if test admin exists
    let testAdmin = await User.findOne({ email: 'testemergency@admin.com' });
    
    if (testAdmin) {
      console.log('Deleting existing test admin...');
      await User.deleteOne({ email: 'testemergency@admin.com' });
    }

    // Create new test admin with known password
    testAdmin = new User({
      email: 'testemergency@admin.com',
      password: 'Test@2026',
      role: 'hospital_admin',
      isVerified: true
    });
    
    await testAdmin.save();
    
    console.log('✅ Created test admin account:');
    console.log('   Email: testemergency@admin.com');
    console.log('   Password: Test@2026');
    console.log('   Role: hospital_admin');
    console.log('\n🎯 Use this account to login and view the emergency scenario!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createTestAdmin();
