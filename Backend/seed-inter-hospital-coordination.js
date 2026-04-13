/**
 * Inter-Hospital Coordination Management - Data Seeding
 * Generates realistic coordination scenarios for multi-hospital blood management
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Models
const HospitalProfile = require('./src/models/HospitalProfile');
const EmergencyRequest = require('./src/models/EmergencyRequest');
const BloodInventory = require('./src/models/BloodInventory');

const BLOOD_GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
const HOSPITALS = [
  { id: '507f1f77bcf86cd799439011', name: 'Central Blood Bank Hospital', lat: 17.3850, lng: 78.4867, capacity: 500 },
  { id: '507f1f77bcf86cd799439012', name: 'Emergency Response Hospital', lat: 17.3900, lng: 78.4900, capacity: 350 },
  { id: '507f1f77bcf86cd799439013', name: 'Regional Blood Center', lat: 17.3800, lng: 78.4800, capacity: 400 },
  { id: '507f1f77bcf86cd799439014', name: 'District Medical College', lat: 17.3950, lng: 78.4950, capacity: 600 },
  { id: '507f1f77bcf86cd799439015', name: 'City Coordination Hub', lat: 17.3820, lng: 78.4870, capacity: 300 },
];

const URGENCY_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const STATUS_UPDATES = ['PENDING', 'MATCHED', 'ALLOCATED', 'IN_TRANSIT', 'COMPLETED', 'FAILED'];

// Calculate distance between hospitals
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Generate coordination records
function generateCoordinationRecords() {
  const records = [];
  const now = new Date();

  // Generate 90 coordination events (30 days × 3 daily scenarios)
  for (let day = 0; day < 30; day++) {
    for (let scenario = 0; scenario < 3; scenario++) {
      const eventDate = new Date(now);
      eventDate.setDate(eventDate.getDate() - day);
      eventDate.setHours(Math.floor(Math.random() * 24));
      eventDate.setMinutes(Math.floor(Math.random() * 60));

      const requestingHospitalIdx = Math.floor(Math.random() * HOSPITALS.length);
      const requestingHospital = HOSPITALS[requestingHospitalIdx];

      // Generate 2-4 coordinated transfers per event
      const transferCount = 2 + Math.floor(Math.random() * 3);
      for (let t = 0; t < transferCount; t++) {
        let donatingHospitalIdx = Math.floor(Math.random() * HOSPITALS.length);
        while (donatingHospitalIdx === requestingHospitalIdx) {
          donatingHospitalIdx = Math.floor(Math.random() * HOSPITALS.length);
        }

        const donatingHospital = HOSPITALS[donatingHospitalIdx];
        const distance = calculateDistance(
          requestingHospital.lat,
          requestingHospital.lng,
          donatingHospital.lat,
          donatingHospital.lng
        );

        const bloodGroup = BLOOD_GROUPS[Math.floor(Math.random() * BLOOD_GROUPS.length)];
        const urgency = URGENCY_LEVELS[Math.floor(Math.random() * URGENCY_LEVELS.length)];
        const unitsRequested = 2 + Math.floor(Math.random() * 8);
        const unitsAllocated = Math.floor(unitsRequested * (0.7 + Math.random() * 0.3));

        const requestTime = new Date(eventDate);
        const allocationTime = new Date(requestTime.getTime() + (5 + Math.random() * 25) * 60000);
        const deliveryTime =
          unitsAllocated > 0
            ? new Date(allocationTime.getTime() + distance * 10 * 60000) // ~10 min per km
            : null;

        records.push({
          coordinationId: `COORD-${day}-${scenario}-${t}`,
          timestamp: eventDate.toISOString(),
          requestingHospital: {
            id: requestingHospital.id,
            name: requestingHospital.name,
            location: {
              type: 'Point',
              coordinates: [requestingHospital.lng, requestingHospital.lat],
            },
          },
          donatingHospital: {
            id: donatingHospital.id,
            name: donatingHospital.name,
            location: {
              type: 'Point',
              coordinates: [donatingHospital.lng, donatingHospital.lat],
            },
          },
          bloodRequest: {
            bloodGroup,
            unitsRequested,
            unitsAllocated,
            urgency,
          },
          coordination: {
            distance: parseFloat(distance.toFixed(2)),
            status: STATUS_UPDATES[Math.floor(Math.random() * STATUS_UPDATES.length)],
            allocationTime: allocationTime.toISOString(),
            deliveryTime: deliveryTime ? deliveryTime.toISOString() : null,
            delayMinutes:
              deliveryTime && eventDate < deliveryTime
                ? Math.round((deliveryTime - eventDate) / 60000)
                : 0,
          },
          metrics: {
            responseTimeMinutes: Math.round((allocationTime - requestTime) / 60000),
            fulfillmentRate: parseFloat((unitsAllocated / unitsRequested).toFixed(2)),
            wasSuccessful: unitsAllocated > 0,
            cost: parseFloat((unitsAllocated * (50 + Math.random() * 150)).toFixed(2)),
          },
          networkAnalysis: {
            hopCount: 1 + Math.floor(Math.random() * 2),
            totalNetworkDistance: parseFloat((distance * (1 + Math.random() * 0.5)).toFixed(2)),
            coordinationComplexity: ['LOW', 'MEDIUM', 'HIGH'][
              Math.floor(Math.random() * 3)
            ],
          },
        });
      }
    }
  }

  return records;
}

// Main seeding function
async function seedInterHospitalCoordination() {
  try {
    console.log('\n🔗 Starting Inter-Hospital Coordination Data Seeding...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✓ Connected to MongoDB');

    // Generate coordination records
    const records = generateCoordinationRecords();
    console.log(`\n📊 Generated ${records.length} coordination records`);

    // In real scenario, these would be stored in a dedicated collection
    // For showcase, we'll create a coordination collection
    const db = mongoose.connection.db;
    const coordinationCollection = db.collection('coordination_records');

    // Clear existing coordination data
    const deleteResult = await coordinationCollection.deleteMany({});
    console.log(`🗑️  Cleared ${deleteResult.deletedCount} old coordination records`);

    // Insert new coordination records
    if (records.length > 0) {
      const insertResult = await coordinationCollection.insertMany(records);
      console.log(`✅ Inserted ${insertResult.insertedIds.length} new coordination records`);
    }

    // Generate coordination statistics
    console.log('\n📈 Coordination Data Summary:');
    console.log(`   • Total Records: ${records.length}`);
    console.log(`   • Date Range: Last 30 days`);
    console.log(`   • Hospitals: ${HOSPITALS.length}`);
    console.log(`   • Blood Groups: ${BLOOD_GROUPS.length}`);
    console.log(`   • Avg Distance: ${(
      records.reduce((sum, r) => sum + r.coordination.distance, 0) / records.length
    ).toFixed(2)} km`);

    // Calculate network metrics
    const successfulTransfers = records.filter((r) => r.metrics.wasSuccessful).length;
    const avgResponseTime =
      records.reduce((sum, r) => sum + r.metrics.responseTimeMinutes, 0) / records.length;
    const avgFulfillment =
      records.reduce((sum, r) => sum + r.metrics.fulfillmentRate, 0) / records.length;

    console.log(`\n🎯 Network Performance Metrics:`);
    console.log(`   • Success Rate: ${((successfulTransfers / records.length) * 100).toFixed(1)}%`);
    console.log(`   • Avg Response Time: ${avgResponseTime.toFixed(1)} minutes`);
    console.log(`   • Avg Fulfillment: ${(avgFulfillment * 100).toFixed(1)}%`);

    // Multi-hospital coordination patterns
    console.log(`\n🏥 Hospital-wise Coordination Activity:`);
    HOSPITALS.forEach((hospital) => {
      const asRequester = records.filter((r) => r.requestingHospital.id === hospital.id).length;
      const asDonor = records.filter((r) => r.donatingHospital.id === hospital.id).length;
      console.log(`   • ${hospital.name}: ${asRequester} requests, ${asDonor} donations`);
    });

    console.log(`\n✨ Inter-Hospital Coordination Network Ready!`);
    console.log(`🚀 ML Models Status: Ready for optimization & predictions`);

    await mongoose.connection.close();
    console.log('\n✓ Database connection closed\n');
  } catch (error) {
    console.error('❌ Seeding Error:', error.message);
    process.exit(1);
  }
}

// Run seeding
seedInterHospitalCoordination();
