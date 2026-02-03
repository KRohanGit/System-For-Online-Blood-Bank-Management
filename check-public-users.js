const mongoose = require('mongoose');

// MongoDB Atlas connection string
const MONGODB_URI = 'mongodb+srv://anantharohankrovvidi_db_user:RohanProject@lifelinkcluster.q4gc4oi.mongodb.net/lifelink?retryWrites=true&w=majority&appName=LifeLinkCluster';

async function checkPublicUsers() {
  try {
    console.log('🔗 Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected successfully!\n');

    // Define PublicUser schema inline
    const publicUserSchema = new mongoose.Schema({
      fullName: String,
      email: String,
      phone: String,
      verificationStatus: String,
      bloodGroup: String,
      createdAt: Date
    });
    
    const PublicUser = mongoose.models.PublicUser || mongoose.model('PublicUser', publicUserSchema);

    // Get all PUBLIC_USER documents
    const allPublicUsers = await PublicUser.find({});
    console.log(`📊 Total PUBLIC_USER documents: ${allPublicUsers.length}\n`);

    if (allPublicUsers.length > 0) {
      console.log('👥 All Public Users:');
      allPublicUsers.forEach((user, index) => {
        console.log(`\n${index + 1}. ${user.fullName} (${user.email})`);
        console.log(`   Status: ${user.verificationStatus}`);
        console.log(`   Phone: ${user.phone}`);
        console.log(`   Blood Group: ${user.bloodGroup || 'Not specified'}`);
        console.log(`   Created: ${user.createdAt}`);
      });
    } else {
      console.log('❌ No PUBLIC_USER documents found in the database!');
      console.log('\n💡 To see PUBLIC_USER in Super Admin dashboard:');
      console.log('   1. Go to: http://localhost:3000/public/register');
      console.log('   2. Fill the registration form');
      console.log('   3. Upload an identity proof document');
      console.log('   4. Submit the form');
      console.log('   5. Then login as Super Admin to see pending approval\n');
    }

    // Get pending PUBLIC_USER documents
    const pendingPublicUsers = await PublicUser.find({ verificationStatus: 'pending' });
    console.log(`\n⏳ Pending PUBLIC_USER count: ${pendingPublicUsers.length}`);

    // Get verified PUBLIC_USER documents
    const verifiedPublicUsers = await PublicUser.find({ verificationStatus: 'verified' });
    console.log(`✅ Verified PUBLIC_USER count: ${verifiedPublicUsers.length}`);

    // Get rejected PUBLIC_USER documents
    const rejectedPublicUsers = await PublicUser.find({ verificationStatus: 'rejected' });
    console.log(`❌ Rejected PUBLIC_USER count: ${rejectedPublicUsers.length}`);

    await mongoose.connection.close();
    console.log('\n🔒 Connection closed.');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkPublicUsers();
