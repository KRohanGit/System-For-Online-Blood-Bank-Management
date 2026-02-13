/**
 * Simple seed script - ONE demo emergency scenario
 * Run with: node seed-simple-demo.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const EmergencyScenario = require('./src/models/EmergencyScenario');
const User = require('./src/models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lifelink';

async function seedSimpleDemo() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find super admin
    let superAdmin = await User.findOne({ role: 'super_admin' });
    
    if (!superAdmin) {
      console.log('⚠️  No super admin found. Please create one first.');
      process.exit(1);
    }

    // Create one simple scenario
    const scenario = await EmergencyScenario.create({
      incidentType: 'road_accident',
      incidentLocation: {
        areaName: 'Madhurawada Highway',
        city: 'Visakhapatnam',
        latitude: 17.3850,
        longitude: 78.4867
      },
      estimatedCasualties: 25,
      incidentTime: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
      severityDistribution: {
        criticalPercentage: 30,
        moderatePercentage: 50,
        minorPercentage: 20
      },
      projectedBloodDemand: {
        totalUnits: 68,
        byBloodGroup: {
          'O+': 20,
          'A+': 16,
          'B+': 22,
          'AB+': 4,
          'O-': 2,
          'A-': 1,
          'B-': 2,
          'AB-': 1
        },
        emergencyDemandScore: 50,
        rareBloodPressureIndex: 9
      },
      propagationTimeline: {
        immediate: {
          affectedHospitals: [],
          shortageRisk: 'HIGH',
          summary: '25 casualties - immediate blood coordination required'
        },
        shortTerm: {
          affectedHospitals: [],
          shortageRisk: 'MEDIUM',
          summary: 'Regional hospitals on alert'
        },
        critical: {
          affectedHospitals: [],
          shortageRisk: 'LOW',
          summary: 'City-wide monitoring active'
        }
      },
      cityPreparednessIndex: {
        score: 65,
        factors: {
          inventoryLevel: 68,
          hospitalCapacity: 62,
          responseReadiness: 65,
          donorAvailability: 58
        }
      },
      notes: 'Highway accident with multiple casualties. Immediate blood supply needed for trauma cases.',
      createdBy: superAdmin._id,
      isSimulation: true,
      scenarioStatus: 'simulation'
    });
    
    console.log('\n✅ Created Demo Scenario!');
    console.log(`   Type: Road Accident`);
    console.log(`   Location: ${scenario.incidentLocation.areaName}`);
    console.log(`   Casualties: ${scenario.estimatedCasualties}`);
    console.log(`   Blood Units Needed: ${scenario.projectedBloodDemand.totalUnits}`);
    console.log(`   ID: ${scenario._id}`);
    console.log('\n📍 Navigate to: /emergency-intelligence');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

seedSimpleDemo();
