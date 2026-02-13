require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const HospitalProfile = require('./src/models/HospitalProfile');
const EmergencyRequest = require('./src/models/EmergencyRequest');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lifelink';

async function seed() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Try to find an existing hospital profile
    let hospital = await HospitalProfile.findOne();

    // If none exists, create a minimal user + hospital profile (dev/demo only)
    if (!hospital) {
      console.log('⚠️  No HospitalProfile found, creating a demo hospital...');
      const demoUser = new User({
        email: 'demo-hospital@local',
        password: 'DemoPass123!',
        role: 'hospital_admin',
        isVerified: true
      });
      await demoUser.save();

      hospital = new HospitalProfile({
        userId: demoUser._id,
        hospitalName: 'Demo Vizag Hospital',
        officialEmail: 'demo-hospital@local',
        licenseNumber: `DEMO-${Date.now()}`,
        licenseFilePath: '/dummy/licenses/DEMO.pdf',
        adminName: 'Dr. Demo',
        adminEmail: 'dr.demo@local',
        verificationStatus: 'approved',
        verifiedAt: new Date(),
        location: { type: 'Point', coordinates: [83.3012, 17.7231] },
        address: 'Demo Address, Vizag',
        phone: '+91 00000 00000'
      });
      await hospital.save();
      console.log('✅ Demo hospital created:', hospital.hospitalName);
    } else {
      console.log('ℹ️  Using existing hospital:', hospital.hospitalName || hospital._id);
    }

    // Prepare two demo emergency requests with createdAt in the past
    const now = new Date();
    const tenMinsAgo = new Date(now.getTime() - 10 * 60 * 1000);
    const twentyMinsAgo = new Date(now.getTime() - 20 * 60 * 1000);

    const req1 = new EmergencyRequest({
      requestingHospitalId: hospital._id,
      requestingHospitalName: hospital.hospitalName || 'Demo Hospital',
      bloodGroup: 'O+',
      unitsRequired: 3,
      patientInfo: { age: 45, gender: 'Male', diagnosis: 'Trauma', requiredBy: new Date(now.getTime() + 2 * 60 * 60 * 1000) },
      severityLevel: 'HIGH',
      urgencyScore: 75,
      lifecycleStatus: 'CREATED',
      escalationLevel: 0,
      notes: 'Demo escalation request (10 minutes ago)',
      createdAt: tenMinsAgo,
      updatedAt: tenMinsAgo
    });

    const req2 = new EmergencyRequest({
      requestingHospitalId: hospital._id,
      requestingHospitalName: hospital.hospitalName || 'Demo Hospital',
      bloodGroup: 'A+',
      unitsRequired: 2,
      patientInfo: { age: 60, gender: 'Female', diagnosis: 'Surgery', requiredBy: new Date(now.getTime() + 1 * 60 * 60 * 1000) },
      severityLevel: 'CRITICAL',
      urgencyScore: 90,
      lifecycleStatus: 'CREATED',
      escalationLevel: 0,
      notes: 'Demo escalation request (20 minutes ago)',
      createdAt: twentyMinsAgo,
      updatedAt: twentyMinsAgo
    });

    await EmergencyRequest.insertMany([req1, req2]);
    console.log('✅ Inserted 2 demo EmergencyRequest documents:');
    console.log(`  • ${req1._id} (created 10 mins ago)`);
    console.log(`  • ${req2._id} (created 20 mins ago)`);

    console.log('\nNext steps:');
    console.log(' - Start or restart the backend (npm run dev).');
    console.log(' - Escalation service runs every 2 minutes; it will pick up these demo requests and escalate based on their age.');
    console.log(' - View requests in Admin → Emergency or via GET /api/emergency-coordination/requests');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding escalation demo failed:', err);
    process.exit(1);
  } finally {
    // ensure connection closed if not already exiting
    try { await mongoose.connection.close(); } catch (e) {}
  }
}

seed();
