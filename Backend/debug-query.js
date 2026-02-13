require('dotenv').config();
const mongoose = require('mongoose');
const EmergencyScenario = require('./src/models/EmergencyScenario');
const User = require('./src/models/User');

async function testQuery() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Test 1: Simple find
    console.log('Test 1: Simple find()');
    const allScenarios = await EmergencyScenario.find({});
    console.log('   Found:', allScenarios.length, 'scenarios');

    // Test 2: With populate (like API does)
    console.log('\nTest 2: find() with populate (like API)');
    try {
      const scenariosWithPopulate = await EmergencyScenario.find({})
        .populate('createdBy', 'email role')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
      console.log('   Found:', scenariosWithPopulate.length, 'scenarios');
      
      if (scenariosWithPopulate.length > 0) {
        console.log('\n   First scenario:');
        console.log('   - ID:', scenariosWithPopulate[0]._id);
        console.log('   - Type:', scenariosWithPopulate[0].incidentType);
        console.log('   - Location:', scenariosWithPopulate[0].incidentLocation?.areaName);
        console.log('   - CreatedBy populated:', scenariosWithPopulate[0].createdBy);
      }
    } catch (populateError) {
      console.log('   ❌ Error with populate:', populateError.message);
    }

    // Test 3: Check if createdBy user exists
    console.log('\nTest 3: Check createdBy user');
    if (allScenarios.length > 0) {
      const createdById = allScenarios[0].createdBy;
      console.log('   Scenario createdBy ID:', createdById);
      
      const user = await User.findById(createdById);
      if (user) {
        console.log('   ✅ User exists:', user.email, '-', user.role);
      } else {
        console.log('   ❌ User NOT found! This could cause populate to fail.');
      }
    }

    // Test 4: Find without populate
    console.log('\nTest 4: find() without populate');
    const scenariosNoPopulate = await EmergencyScenario.find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    console.log('   Found:', scenariosNoPopulate.length, 'scenarios');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testQuery();
