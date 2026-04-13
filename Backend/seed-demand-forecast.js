/**
 * Seed dummy data for Demand Forecasting ML Model
 * Purpose: Generate realistic emergency request data for training
 * Run: node seed-demand-forecast.js
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const EmergencyRequest = require('./src/models/EmergencyRequest');

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/lifelink', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✓ Connected to MongoDB');
  } catch (error) {
    console.error('✗ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
}

// Blood groups and hospitals
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const HOSPITALS = [
  '507f1f77bcf86cd799439011',
  '507f1f77bcf86cd799439012',
  '507f1f77bcf86cd799439013',
  '507f1f77bcf86cd799439014',
  '507f1f77bcf86cd799439015',
];

// Generate realistic demand patterns
function generateDemandData() {
  const now = new Date();
  const requests = [];
  const dayCount = 365; // 1 year of historical data

  for (let daysAgo = dayCount; daysAgo > 0; daysAgo--) {
    const currentDate = new Date(now);
    currentDate.setDate(currentDate.getDate() - daysAgo);

    const dayOfWeek = currentDate.getDay();
    const month = currentDate.getMonth() + 1;
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Base demand multipliers
    const weekendBoost = isWeekend ? 1.25 : 1.0;
    const seasonalBoost = [6, 7, 8, 12].includes(month) ? 1.15 : 1.0;

    // Blood group base demands (realistic patterns)
    const bloodGroupDemands = {
      'O+': { base: 20, critical: 3 },
      'O-': { base: 10, critical: 2 },
      'A+': { base: 16, critical: 2 },
      'B+': { base: 14, critical: 2 },
      'AB+': { base: 8, critical: 1 },
      'A-': { base: 6, critical: 1 },
      'B-': { base: 5, critical: 1 },
      'AB-': { base: 3, critical: 0 },
    };

    // Generate requests for each hospital
    for (const bloodGroup of BLOOD_GROUPS) {
      for (const hospitalId of HOSPITALS) {
        const { base, critical } = bloodGroupDemands[bloodGroup];
        const hospitalFactor = 0.8 + Math.random() * 0.4; // 0.8 to 1.2

        // Total units needed
        const unitsNeeded = Math.max(
          1,
          Math.round(base * hospitalFactor * weekendBoost * seasonalBoost + (Math.random() - 0.5) * 5)
        );

        // Critical requests (emergency cases)
        const criticalCount = Math.max(
          0,
          Math.round(critical * weekendBoost + (Math.random() - 0.5) * 2)
        );

        if (unitsNeeded > 0) {
          requests.push({
            requestingHospitalId: hospitalId,
            patientInfo: {
              bloodGroup: bloodGroup,
              medicalHistory: 'Routine demand',
              age: Math.floor(Math.random() * 80 + 18),
              rhStatus: bloodGroup.includes('+') ? 'positive' : 'negative',
            },
            unitsRequired: unitsNeeded,
            urgencyLevel: Math.random() < 0.1 ? 'critical' : 'normal',
            status: 'completed',
            createdAt: currentDate,
            updatedAt: currentDate,
            requestNotes: 'Seeded for ML training',
          });
        }
      }
    }
  }

  return requests;
}

// Seed data to MongoDB
async function seedDemandData() {
  try {
    console.log('🔄 Generating demand forecast training data...');
    const requests = generateDemandData();

    console.log(`📊 Generated ${requests.length} demand records for 365 days`);

    // Clear existing seeded data
    const deleted = await EmergencyRequest.deleteMany({ requestNotes: 'Seeded for ML training' });
    console.log(`🗑️  Cleared ${deleted.deletedCount} old seeded records`);

    // Insert new data
    const inserted = await EmergencyRequest.insertMany(requests, { ordered: false });
    console.log(`✅ Inserted ${inserted.length} new demand records`);

    // Print summary
    console.log('\n📈 Demand Forecast Data Summary:');
    console.log(`   • Records generated: ${requests.length}`);
    console.log(`   • Date range: Last 365 days`);
    console.log(`   • Blood groups: ${BLOOD_GROUPS.length}`);
    console.log(`   • Hospitals: ${HOSPITALS.length}`);
    console.log(`   • Total combinations: ${BLOOD_GROUPS.length * HOSPITALS.length}`);

    // Sample data statistics
    const sampleStats = {};
    for (const bg of BLOOD_GROUPS) {
      sampleStats[bg] = requests.filter(r => r.patientInfo.bloodGroup === bg).length;
    }
    console.log('\n📋 Records per Blood Group:');
    Object.entries(sampleStats).forEach(([bg, count]) => {
      console.log(`   • ${bg}: ${count} requests`);
    });

    console.log('\n✨ Ready to train demand forecasting model!');
    console.log('🚀 Run: python ml-service/app/training/train_models.py');

  } catch (error) {
    console.error('✗ Seeding Error:', error.message);
    process.exit(1);
  }
}

// Main execution
async function main() {
  await connectDB();
  await seedDemandData();
  await mongoose.connection.close();
  console.log('\n✓ Database connection closed');
}

main();
