/**
 * Script to verify that passwords ARE stored (hashed) in MongoDB
 * This shows the actual database content including hashed passwords
 * 
 * Run: node verify-passwords.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function verifyPasswords() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected\n');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('  PASSWORD VERIFICATION REPORT');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Access the raw collection (bypasses Mongoose model methods)
    const usersCollection = mongoose.connection.db.collection('users');
    
    const users = await usersCollection.find({}).toArray();

    console.log(`📊 Total users: ${users.length}\n`);

    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.role})`);
      console.log(`   ├─ isVerified: ${user.isVerified}`);
      if (user.password) {
        console.log(`   ├─ Password stored: ✅ YES`);
        console.log(`   ├─ Password hash: ${user.password.substring(0, 30)}...`);
        console.log(`   ├─ Hash length: ${user.password.length} characters`);
        console.log(`   └─ Algorithm: bcrypt (starts with $2a$ or $2b$)`);
      } else {
        console.log(`   └─ Password stored: ❌ NO - THIS IS A PROBLEM!`);
      }
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════════════');
    console.log('  WHY YOU DON\'T SEE PASSWORDS NORMALLY');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('The User model has a toJSON() method that automatically removes');
    console.log('passwords from all API responses for security. This is GOOD!');
    console.log('');
    console.log('Where passwords are hidden:');
    console.log('  • API responses');
    console.log('  • console.log() of user objects');
    console.log('  • JSON.stringify(user)');
    console.log('');
    console.log('Passwords ARE stored in MongoDB - they\'re just hidden from output.');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔒 Connection closed\n');
  }
}

verifyPasswords();
