require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const bcrypt = require('bcryptjs');

async function resetPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected\n');

    // Use an existing admin
    const user = await User.findOne({ email: 'link@email.com' });
    
    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }

    // Set a known password
    user.password = 'Demo@123';  // Will be hashed by pre-save hook
    await user.save();

    console.log('✅ Password reset for: link@email.com');
    console.log('   New password: Demo@123');
    console.log('   Role:', user.role);
    console.log('\n🎯 Use THIS to login!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

resetPassword();
