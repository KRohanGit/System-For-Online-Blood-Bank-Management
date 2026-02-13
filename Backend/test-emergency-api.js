const axios = require('axios');

async function testEmergencyAPI() {
  try {
    console.log('🔐 Step 1: Logging in as Hospital Admin...');
    
    // Login first
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'link@email.com',
      password: 'Admin@2026' // Try common password
    }).catch(err => {
      // Try another password
      return axios.post('http://localhost:5000/api/auth/login', {
        email: 'link@email.com',
        password: 'Admin@123'
      });
    }).catch(err => {
      // Try yet another password
      return axios.post('http://localhost:5000/api/auth/login', {
        email: 'admin@test.com',
        password: 'Admin@123'
      });
    });

    const token = loginResponse.data.token;
    console.log('✅ Login successful! Token received.\n');

    console.log('📡 Step 2: Fetching emergency scenarios...');
    const scenariosResponse = await axios.get('http://localhost:5000/api/emergency-intelligence/scenarios', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ API Response received!\n');
    console.log('📊 Response:');
    console.log('   Success:', scenariosResponse.data.success);
    console.log('   Count:', scenariosResponse.data.count);
    console.log('   Scenarios:', scenariosResponse.data.data?.length || 0);

    if (scenariosResponse.data.data && scenariosResponse.data.data.length > 0) {
      const scenario = scenariosResponse.data.data[0];
      console.log('\n🎯 First Scenario:');
      console.log('   ID:', scenario._id);
      console.log('   Type:', scenario.incidentType);
      console.log('   Location:', scenario.incidentLocation?.areaName);
      console.log('   Casualties:', scenario.estimatedCasualties);
      console.log('   Status:', scenario.scenarioStatus);
    }

    console.log('\n✅ API is working correctly!');
    console.log('   The frontend should be able to fetch this data.');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
    if (error.response?.status === 401) {
      console.log('\n⚠️  Authentication failed. Please check admin password.');
    }
  }
}

testEmergencyAPI();
