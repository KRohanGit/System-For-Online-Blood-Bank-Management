/**
 * Quick Test Script for Emergency Coordination System
 * 
 * This script creates a sample emergency request and tests the system
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./src/config/database');
const User = require('./src/models/User');
const BloodInventory = require('./src/models/BloodInventory');
const EmergencyRequest = require('./src/models/EmergencyRequest');
const { findMatchingHospitals } = require('./src/services/hospitalMatchingService');

async function testEmergencyCoordination() {
  try {
    console.log('\n🚀 Starting Emergency Coordination System Test...\n');
    
    // Connect to database
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    // Find a hospital to create request from
    const requestingHospital = await User.findOne({
      role: 'HOSPITAL_ADMIN',
      verificationStatus: 'approved'
    });

    if (!requestingHospital) {
      console.error('❌ No hospitals found in database. Please seed hospitals first.');
      process.exit(1);
    }

    console.log(`📍 Requesting Hospital: ${requestingHospital.hospitalName}\n`);

    // Check blood inventory
    const inventoryCount = await BloodInventory.countDocuments();
    console.log(`🩸 Blood Inventory Records: ${inventoryCount}\n`);

    // Create test emergency request
    console.log('🚨 Creating Emergency Request...');
    const testRequest = new EmergencyRequest({
      requestingHospital: {
        hospitalId: requestingHospital._id,
        hospitalName: requestingHospital.hospitalName,
        location: requestingHospital.location,
        contactPerson: requestingHospital.contactPerson || 'Blood Bank Manager',
        phone: requestingHospital.phone
      },
      bloodGroup: 'O-',
      unitsRequired: 3,
      severityLevel: 'CRITICAL',
      medicalJustification: 'Road accident victim with severe trauma and heavy blood loss. Patient is in critical condition requiring immediate transfusion.',
      patientDetails: {
        age: 28,
        gender: 'MALE',
        diagnosis: 'Multiple trauma injuries, severe hemorrhage',
        bloodPressure: '85/55',
        hemoglobin: '6.8'
      },
      requiredBy: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      status: 'CREATED'
    });

    // Calculate urgency score
    testRequest.urgencyScore = testRequest.calculateUrgencyScore();
    testRequest.addAuditLog('CREATED', requestingHospital._id, 'Test emergency request created');

    await testRequest.save();
    console.log(`✅ Emergency Request Created: ${testRequest._id}`);
    console.log(`   Blood Group: ${testRequest.bloodGroup}`);
    console.log(`   Units Required: ${testRequest.unitsRequired}`);
    console.log(`   Severity: ${testRequest.severityLevel}`);
    console.log(`   Urgency Score: ${testRequest.urgencyScore}/100\n`);

    // Test matching algorithm
    console.log('🎯 Finding Matching Hospitals...');
    const matches = await findMatchingHospitals({
      requestingHospitalId: requestingHospital._id,
      bloodGroup: 'O-',
      unitsRequired: 3,
      severityLevel: 'CRITICAL',
      requestingLocation: requestingHospital.location?.coordinates
    });

    console.log(`\n📊 Found ${matches.length} Matching Hospitals:\n`);
    
    matches.slice(0, 5).forEach((match, index) => {
      console.log(`   ${index + 1}. ${match.hospitalName}`);
      console.log(`      Match Score: ${match.matchScore}/100`);
      console.log(`      Distance: ${match.distance} km`);
      console.log(`      Available Units: ${match.availableUnits}`);
      console.log(`      Trust Score: ${match.trustScore}/100`);
      console.log(`      Confidence: ${match.confidenceLevel}`);
      console.log(`      Est. Response: ${match.responseTime} minutes`);
      console.log('');
    });

    // Store matching recommendations
    testRequest.matchingRecommendations = matches.slice(0, 10).map(match => ({
      hospitalId: match.hospitalId,
      hospitalName: match.hospitalName,
      matchScore: match.matchScore,
      distance: match.distance,
      availableUnits: match.availableUnits,
      estimatedResponseTime: match.responseTime,
      confidenceLevel: match.confidenceLevel
    }));
    await testRequest.save();

    console.log('✅ Test Completed Successfully!\n');
    console.log('📝 Summary:');
    console.log(`   - Request ID: ${testRequest._id}`);
    console.log(`   - Urgency Score: ${testRequest.urgencyScore}/100`);
    console.log(`   - Top Match: ${matches[0]?.hospitalName} (Score: ${matches[0]?.matchScore})`);
    console.log(`   - Status: ${testRequest.status}`);
    console.log(`   - Escalation Level: ${testRequest.escalationLevel}`);
    console.log('\n🔔 Escalation will trigger in:');
    console.log('   - Level 1: 8 minutes (notify 3 nearest)');
    console.log('   - Level 2: 15 minutes (notify all network)');
    console.log('   - Level 3: 25 minutes (notify authorities)\n');

    console.log('💡 Next Steps:');
    console.log('   1. Use this Request ID to test accept/decline APIs');
    console.log('   2. Wait 8+ minutes to see auto-escalation');
    console.log('   3. Test dispatch and tracking endpoints');
    console.log('   4. Complete the delivery cycle\n');

    console.log('🌐 API Testing:');
    console.log(`   GET    http://localhost:5000/api/emergency-coordination/request/${testRequest._id}`);
    console.log(`   GET    http://localhost:5000/api/emergency-coordination/request/${testRequest._id}/matches`);
    console.log(`   POST   http://localhost:5000/api/emergency-coordination/request/${testRequest._id}/accept`);
    console.log('\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Test Failed:', error);
    process.exit(1);
  }
}

// Run test
testEmergencyCoordination();
