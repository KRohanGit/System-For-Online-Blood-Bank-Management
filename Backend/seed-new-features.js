const mongoose = require('mongoose');
require('dotenv').config();
const CivicAlert = require('./src/models/CivicAlert');
const EmergencyMobilizationEvent = require('./src/models/EmergencyMobilizationEvent');
const DonationReadinessLog = require('./src/models/DonationReadinessLog');
const HospitalProfile = require('./src/models/HospitalProfile');
const PublicUser = require('./src/models/PublicUser');

async function seedNewFeatures() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lifelink');
    console.log('Connected to MongoDB');

    const hospitals = await HospitalProfile.find().limit(5);
    const publicUsers = await PublicUser.find().limit(10);

    if (hospitals.length === 0) {
      console.log('No hospitals found. Please seed hospitals first.');
      return;
    }

    if (publicUsers.length === 0) {
      console.log('No public users found. Please register users first.');
      return;
    }

    const civicAlerts = [
      {
        hospitalId: hospitals[0]._id,
        alertType: 'SHORTAGE',
        bloodGroup: 'O-',
        title: 'Critical O- Blood Shortage',
        message: 'We urgently need O- blood donors. Only 3 units remaining in stock. Please donate if eligible.',
        urgencyScore: 95,
        location: { type: 'Point', coordinates: [83.2185, 17.6868] },
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        isActive: true
      },
      {
        hospitalId: hospitals[1]._id,
        alertType: 'CAMP',
        title: 'Blood Donation Camp This Weekend',
        message: 'Join us for a community blood donation drive on Saturday 9 AM - 5 PM. Free health checkup included.',
        urgencyScore: 60,
        location: { type: 'Point', coordinates: [83.2300, 17.6950] },
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
        isActive: true
      },
      {
        hospitalId: hospitals[2]._id,
        alertType: 'SHORTAGE',
        bloodGroup: 'AB+',
        title: 'AB+ Blood Needed for Surgery',
        message: 'Patient requires 4 units of AB+ blood for emergency surgery scheduled tomorrow.',
        urgencyScore: 88,
        location: { type: 'Point', coordinates: [83.2450, 17.7020] },
        expiresAt: new Date(Date.now() + 36 * 60 * 60 * 1000),
        isActive: true
      },
      {
        hospitalId: hospitals[0]._id,
        alertType: 'EXPIRY',
        bloodGroup: 'A+',
        title: 'A+ Blood Units Expiring Soon',
        message: '8 units of A+ blood will expire in 5 days. Consider donating to replace stock.',
        urgencyScore: 45,
        location: { type: 'Point', coordinates: [83.2185, 17.6868] },
        expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        isActive: true
      },
      {
        hospitalId: hospitals[3]._id,
        alertType: 'COMMUNITY_NOTICE',
        title: 'Blood Donation Awareness Week',
        message: 'Join us in spreading awareness about blood donation. Share your donation stories!',
        urgencyScore: 30,
        location: { type: 'Point', coordinates: [83.2600, 17.7100] },
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isActive: true
      }
    ];

    await CivicAlert.deleteMany({});
    const insertedAlerts = await CivicAlert.insertMany(civicAlerts);
    console.log(`✅ Seeded ${insertedAlerts.length} civic alerts`);

    const emergencyEvents = [
      {
        hospitalId: hospitals[0]._id,
        eventTitle: 'Mass Casualty Incident - Traffic Accident',
        bloodGroup: 'O-',
        unitsRequired: 15,
        volunteersRequired: 30,
        description: 'Major traffic accident with multiple casualties. Urgent need for O- blood and volunteers.',
        urgencyLevel: 'CRITICAL',
        eventStatus: 'ACTIVE',
        location: { type: 'Point', coordinates: [83.2185, 17.6868] },
        eventStartTime: new Date(),
        eventEndTime: new Date(Date.now() + 12 * 60 * 60 * 1000),
        volunteersRegistered: 8
      },
      {
        hospitalId: hospitals[1]._id,
        eventTitle: 'Thalassemia Patient Emergency',
        bloodGroup: 'B+',
        unitsRequired: 6,
        volunteersRequired: 15,
        description: 'Thalassemia patient requires immediate blood transfusion. B+ donors urgently needed.',
        urgencyLevel: 'HIGH',
        eventStatus: 'ACTIVE',
        location: { type: 'Point', coordinates: [83.2300, 17.6950] },
        eventStartTime: new Date(),
        eventEndTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        volunteersRegistered: 12
      },
      {
        hospitalId: hospitals[2]._id,
        eventTitle: 'Planned Surgery Blood Reserve',
        bloodGroup: 'AB-',
        unitsRequired: 4,
        volunteersRequired: 10,
        description: 'Rare AB- blood needed for scheduled complex surgery next week.',
        urgencyLevel: 'MEDIUM',
        eventStatus: 'ACTIVE',
        location: { type: 'Point', coordinates: [83.2450, 17.7020] },
        eventStartTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        eventEndTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        volunteersRegistered: 3
      },
      {
        hospitalId: hospitals[3]._id,
        eventTitle: 'Community Blood Drive Campaign',
        bloodGroup: 'ALL',
        unitsRequired: 50,
        volunteersRequired: 100,
        description: 'Monthly community blood donation campaign. All blood groups needed for stock replenishment.',
        urgencyLevel: 'LOW',
        eventStatus: 'ACTIVE',
        location: { type: 'Point', coordinates: [83.2600, 17.7100] },
        eventStartTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
        eventEndTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        volunteersRegistered: 45
      }
    ];

    await EmergencyMobilizationEvent.deleteMany({});
    const insertedEvents = await EmergencyMobilizationEvent.insertMany(emergencyEvents);
    console.log(`✅ Seeded ${insertedEvents.length} emergency mobilization events`);

    const readinessLogs = [];
    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
    
    for (let i = 0; i < Math.min(10, publicUsers.length); i++) {
      const user = publicUsers[i];
      const age = 20 + Math.floor(Math.random() * 40);
      const weight = 50 + Math.floor(Math.random() * 40);
      const hemoglobin = 10 + Math.random() * 6;
      const daysSinceLastDonation = Math.floor(Math.random() * 180);
      
      let score = 100;
      if (age < 18 || age > 65) score -= 30;
      if (weight < 50) score -= 25;
      if (hemoglobin < 12.5) score -= 20;
      if (daysSinceLastDonation < 90) score -= 40;
      
      const onMedication = Math.random() > 0.7;
      const hasChronicIllness = Math.random() > 0.85;
      const recentTravel = Math.random() > 0.8;
      
      if (onMedication) score -= 15;
      if (hasChronicIllness) score -= 25;
      if (recentTravel) score -= 10;
      
      score = Math.max(0, Math.min(100, score));
      
      let status = 'ELIGIBLE';
      if (score < 40) status = 'INELIGIBLE';
      else if (score < 70) status = 'NEEDS_REVIEW';
      
      readinessLogs.push({
        userId: user._id,
        age,
        weight,
        bloodGroup: bloodGroups[i % bloodGroups.length],
        lastDonationDate: daysSinceLastDonation < 180 ? new Date(Date.now() - daysSinceLastDonation * 24 * 60 * 60 * 1000) : null,
        hemoglobin: parseFloat(hemoglobin.toFixed(1)),
        onMedication,
        hasChronicIllness,
        recentTravel,
        readinessScore: Math.round(score),
        eligibilityStatus: status,
        recommendations: score >= 70 ? ['You are eligible to donate!'] : ['Please consult with staff before donating']
      });
    }

    await DonationReadinessLog.deleteMany({});
    const insertedLogs = await DonationReadinessLog.insertMany(readinessLogs);
    console.log(`✅ Seeded ${insertedLogs.length} donation readiness logs`);

    console.log('🎉 All new features seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seedNewFeatures();
