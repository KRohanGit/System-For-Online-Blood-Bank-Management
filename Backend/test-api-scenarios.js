require('dotenv').config();
const mongoose = require('mongoose');
const EmergencyScenario = require('./src/models/EmergencyScenario');

async function testAPI() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Test 1: Direct DB query
    const scenarios = await EmergencyScenario.find({}).lean();
    console.log('📊 Scenarios in Database:', scenarios.length);
    
    if (scenarios.length > 0) {
      const s = scenarios[0];
      console.log('\n🔍 First Scenario Details:');
      console.log('   ID:', s._id);
      console.log('   Type:', s.incidentType);
      console.log('   Location:', s.incidentLocation?.areaName);
      console.log('   City:', s.incidentLocation?.city);
      console.log('   Casualties:', s.estimatedCasualties);
      console.log('   Blood Units:', s.projectedBloodDemand?.totalUnits);
      console.log('   Is Simulation:', s.isSimulation);
      console.log('   Status:', s.scenarioStatus);
      console.log('   Created By:', s.createdBy);
    }

    // Test 2: Query with simulation filter
    const simulations = await EmergencyScenario.find({ isSimulation: true }).lean();
    console.log('\n🔬 Simulations Found:', simulations.length);

    // Test 3: Query all scenarios (what the API should return)
    const allScenarios = await EmergencyScenario.find({})
      .populate('createdBy', 'email role')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    
    console.log('\n📡 API Query Result:', allScenarios.length);
    
    if (allScenarios.length > 0) {
      console.log('\n✅ This is what the frontend SHOULD receive:');
      console.log(JSON.stringify(allScenarios[0], null, 2).substring(0, 500) + '...');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testAPI();
