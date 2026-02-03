/**
 * Seed script to create a sample emergency scenario for Vizag
 * This demonstrates the Emergency Intelligence System with realistic Vizag data
 * Run with: node seed-vizag-emergency-scenario.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const EmergencyScenario = require('./src/models/EmergencyScenario');
const User = require('./src/models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lifelink';

// Sample Vizag Emergency Scenario - Highway Accident near Anakapalli
const vizagScenario = {
  incidentType: 'TRAFFIC_ACCIDENT',
  incidentLocation: {
    areaName: 'NH-16 Anakapalli Junction',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    latitude: 17.6869,
    longitude: 83.0041
  },
  estimatedCasualties: 45,
  incidentTime: new Date(),
  severityDistribution: {
    critical: 12,  // 26.7%
    severe: 18,    // 40%
    moderate: 15   // 33.3%
  },
  notes: 'Major bus-truck collision on NH-16 near Anakapalli. Multiple casualties with severe injuries. Immediate blood requirement expected at nearby hospitals.'
};

async function seedVizagScenario() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find a super admin or create one
    let superAdmin = await User.findOne({ role: 'super_admin' });
    
    if (!superAdmin) {
      console.log('⚠️  No super admin found. Creating temporary admin for scenario...');
      superAdmin = new User({
        email: 'admin@lifelink.gov.in',
        password: 'Admin@2026',
        role: 'super_admin',
        isVerified: true
      });
      await superAdmin.save();
      console.log('✅ Created temporary super admin');
    }

    // Check if scenario already exists
    const existingScenario = await EmergencyScenario.findOne({
      'incidentLocation.areaName': vizagScenario.incidentLocation.areaName
    });

    if (existingScenario) {
      console.log('ℹ️  Vizag emergency scenario already exists');
      console.log(`   Scenario ID: ${existingScenario._id}`);
      process.exit(0);
    }

    // Calculate blood demand
    const totalUnits = Math.round(
      (vizagScenario.severityDistribution.critical * 6) +
      (vizagScenario.severityDistribution.severe * 3) +
      (vizagScenario.severityDistribution.moderate * 1)
    );

    // Blood group distribution (typical Indian population)
    const byBloodGroup = {
      'O+': Math.round(totalUnits * 0.30),
      'A+': Math.round(totalUnits * 0.24),
      'B+': Math.round(totalUnits * 0.32),
      'AB+': Math.round(totalUnits * 0.06),
      'O-': Math.round(totalUnits * 0.02),
      'A-': Math.round(totalUnits * 0.02),
      'B-': Math.round(totalUnits * 0.03),
      'AB-': Math.round(totalUnits * 0.01)
    };

    const emergencyScore = Math.min(100, (vizagScenario.estimatedCasualties / 100) * 100);
    const rareBloodPressure = (byBloodGroup['AB-'] + byBloodGroup['O-'] + byBloodGroup['A-'] + byBloodGroup['B-']) / totalUnits * 100;

    // Create scenario with dummy hospital impacts (will be calculated properly when system is fully seeded)
    const scenario = new EmergencyScenario({
      ...vizagScenario,
      projectedBloodDemand: {
        totalUnits,
        byBloodGroup,
        emergencyDemandScore: Math.round(emergencyScore),
        rareBloodPressureIndex: Math.round(rareBloodPressure)
      },
      hospitalImpacts: [
        {
          hospitalId: 'dummy-hospital-vizag-1',
          hospitalName: 'King George Hospital (KGH)',
          distance: 25.3,
          impactLevel: 'primary',
          timeToShortage: 4.5,
          overallRiskLevel: 'HIGH',
          projectedDemand: {
            'O+': Math.round(byBloodGroup['O+'] * 0.4),
            'A+': Math.round(byBloodGroup['A+'] * 0.4),
            'B+': Math.round(byBloodGroup['B+'] * 0.4)
          },
          bloodGroupRisks: {
            'O+': { available: 38, demand: Math.round(byBloodGroup['O+'] * 0.4), deficit: 0, riskLevel: 'LOW' },
            'A+': { available: 45, demand: Math.round(byBloodGroup['A+'] * 0.4), deficit: 0, riskLevel: 'LOW' }
          }
        },
        {
          hospitalId: 'dummy-hospital-vizag-3',
          hospitalName: 'GITAM Institute of Medical Sciences',
          distance: 12.8,
          impactLevel: 'primary',
          timeToShortage: 6.2,
          overallRiskLevel: 'MEDIUM',
          projectedDemand: {
            'O+': Math.round(byBloodGroup['O+'] * 0.3),
            'B+': Math.round(byBloodGroup['B+'] * 0.3)
          },
          bloodGroupRisks: {
            'O+': { available: 30, demand: Math.round(byBloodGroup['O+'] * 0.3), deficit: 0, riskLevel: 'LOW' }
          }
        }
      ],
      propagationTimeline: {
        immediate: {
          affectedHospitals: [],
          shortageRisk: 'LOW',
          summary: '0 hospitals at immediate risk (0-2 hours)'
        },
        shortTerm: {
          affectedHospitals: ['dummy-hospital-vizag-1'],
          shortageRisk: 'MEDIUM',
          summary: '1 hospital at short-term risk (2-6 hours)'
        },
        critical: {
          affectedHospitals: ['dummy-hospital-vizag-3'],
          shortageRisk: 'MEDIUM',
          summary: '1 hospital at critical risk (6-12 hours)'
        }
      },
      recommendations: [
        {
          category: 'IMMEDIATE',
          priority: 'URGENT',
          action: 'Contact nearby blood banks and request emergency O+, B+ blood units',
          rationale: 'These are the most demanded blood groups in traffic accidents with multiple casualties',
          targetHospitals: ['dummy-hospital-vizag-1', 'dummy-hospital-vizag-3'],
          estimatedImpact: 'HIGH'
        },
        {
          category: 'DONOR_MOBILIZATION',
          priority: 'HIGH',
          action: 'Activate emergency donor network in Visakhapatnam and surrounding districts',
          rationale: 'Current inventory may not suffice for 45 casualties with severe injuries',
          targetHospitals: ['dummy-hospital-vizag-1', 'dummy-hospital-vizag-2', 'dummy-hospital-vizag-3'],
          estimatedImpact: 'HIGH'
        },
        {
          category: 'LOGISTICS',
          priority: 'MEDIUM',
          action: 'Prepare blood transport vehicles for inter-hospital transfers if needed',
          rationale: 'Some hospitals may face shortages while others have surplus',
          targetHospitals: ['dummy-hospital-vizag-5', 'dummy-hospital-vizag-6'],
          estimatedImpact: 'MEDIUM'
        }
      ],
      cityPreparednessIndex: {
        score: 65,
        factors: {
          inventoryLevel: 68,
          hospitalCapacity: 62,
          responseReadiness: 60,
          donorAvailability: 50
        }
      },
      createdBy: superAdmin._id,
      isSimulation: true,
      scenarioStatus: 'simulation'
    });

    await scenario.save();

    console.log('\n' + '='.repeat(70));
    console.log('✅ Vizag Emergency Scenario Created Successfully!');
    console.log('='.repeat(70));
    console.log('\n📊 Scenario Details:');
    console.log('─'.repeat(70));
    console.log(`🚨 Incident Type: ${scenario.incidentType.replace(/_/g, ' ')}`);
    console.log(`📍 Location: ${scenario.incidentLocation.areaName}, ${scenario.incidentLocation.city}`);
    console.log(`👥 Casualties: ${scenario.estimatedCasualties}`);
    console.log(`🩸 Total Blood Units Needed: ${totalUnits}`);
    console.log(`📈 Emergency Score: ${scenario.projectedBloodDemand.emergencyDemandScore}/100`);
    console.log(`🏥 Hospitals Affected: ${scenario.hospitalImpacts.length}`);
    console.log(`🎯 City Preparedness: ${scenario.cityPreparednessIndex.score}/100`);
    console.log(`\n🔬 Scenario ID: ${scenario._id}`);
    console.log('─'.repeat(70));
    console.log('\n💡 View this scenario in the Emergency Intelligence Dashboard');
    console.log('   Navigate to: /emergency-intelligence/scenario/' + scenario._id);
    console.log('');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

// Run the seeding
seedVizagScenario();
