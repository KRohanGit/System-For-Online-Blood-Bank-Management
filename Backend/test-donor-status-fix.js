const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function testDonorStatusFix() {
  try {
    console.log('\n=== DONOR STATUS FIX VERIFICATION ===\n');

    // Step 1: Hospital admin login
    console.log('1️⃣ Hospital Admin Login...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@lifelink.com',
      password: 'Admin@123'
    });

    const token = loginRes.data.token;
    console.log('✅ Login successful\n');

    // Step 2: Get all donors
    console.log('2️⃣ Fetching all donors...');
    const donorListRes = await axios.get(`${API_URL}/donations/donors`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const donors = donorListRes.data.data;
    console.log(`✅ Found ${donors.length} donors`);
    
    if (donors.length < 2) {
      console.log('⚠️ Need at least 2 donors to test. Creating test donors...');
      
      // Create donor 1
      await axios.post(`${API_URL}/hospital/donor`, {
        email: `test-donor-1-${Date.now()}@test.com`,
        password: 'TestPass@123',
        donorName: 'Test Donor 1',
        phone: '9999999991',
        bloodGroup: 'O+'
      }, { headers: { Authorization: `Bearer ${token}` } });

      // Create donor 2
      await axios.post(`${API_URL}/hospital/donor`, {
        email: `test-donor-2-${Date.now()}@test.com`,
        password: 'TestPass@123',
        donorName: 'Test Donor 2',
        phone: '9999999992',
        bloodGroup: 'B+'
      }, { headers: { Authorization: `Bearer ${token}` } });

      console.log('✅ Test donors created\n');

      // Refetch donors
      const refetchRes = await axios.get(`${API_URL}/donations/donors`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      donors = refetchRes.data.data;
      console.log(`✅ Now have ${donors.length} donors\n`);
    }

    // Display initial status
    console.log('3️⃣ Initial Donor Status:\n');
    donors.forEach((d, idx) => {
      console.log(`   ${idx + 1}. ${d.donorName} (${d.email})`);
      console.log(`      ID: ${d._id || d.id || d.donorId}`);
      console.log(`      Status: ${d.status || 'N/A'}\n`);
    });

    // Step 3: Toggle first donor to inactive
    const donor1 = donors[0];
    const donor1Id = donor1._id || donor1.id || donor1.donorId;
    
    console.log(`4️⃣ Toggling Donor 1 to INACTIVE...`);
    const toggleRes = await axios.put(
      `${API_URL}/hospital/donor/${donor1Id}/status`,
      { status: 'inactive' },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✅ Toggle successful\n');

    // Step 4: Fetch donors again and verify
    console.log('5️⃣ Verifying Status After First Toggle:\n');
    const donorListRes2 = await axios.get(`${API_URL}/donations/donors`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const donorsAfterToggle = donorListRes2.data.data;

    let donor1After = donorsAfterToggle.find(d => 
      (d._id || d.id || d.donorId) === donor1Id.toString()
    );
    let donor2After = donorsAfterToggle[donorsAfterToggle.length > 1 ? 1 : 0];

    console.log(`   Donor 1: Status = ${donor1After?.status || 'N/A'} (Expected: inactive)`);
    console.log(`   Donor 2: Status = ${donor2After?.status || 'N/A'} (Expected: active)\n`);

    const test1Pass = donor1After?.status === 'inactive' && donor2After?.status === 'active';
    console.log(test1Pass ? '✅ TEST 1 PASSED: Only Donor 1 changed\n' : '❌ TEST 1 FAILED\n');

    // Step 5: Toggle second donor to inactive
    const donor2Id = donor2After._id || donor2After.id || donor2After.donorId;
    
    console.log(`6️⃣ Toggling Donor 2 to INACTIVE...`);
    await axios.put(
      `${API_URL}/hospital/donor/${donor2Id}/status`,
      { status: 'inactive' },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✅ Toggle successful\n');

    // Step 6: Verify both are now inactive but donor 1 stays inactive
    console.log('7️⃣ Verifying Final Status:\n');
    const donorListRes3 = await axios.get(`${API_URL}/donations/donors`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const donorsAfterToggle2 = donorListRes3.data.data;

    donor1After = donorsAfterToggle2.find(d => 
      (d._id || d.id || d.donorId) === donor1Id.toString()
    );
    donor2After = donorsAfterToggle2.find(d => 
      (d._id || d.id || d.donorId) === donor2Id.toString()
    );

    console.log(`   Donor 1: Status = ${donor1After?.status || 'N/A'} (Expected: inactive)`);
    console.log(`   Donor 2: Status = ${donor2After?.status || 'N/A'} (Expected: inactive)\n`);

    const test2Pass = donor1After?.status === 'inactive' && donor2After?.status === 'inactive';
    console.log(test2Pass ? '✅ TEST 2 PASSED: Both inactive, no unintended changes\n' : '❌ TEST 2 FAILED\n');

    // Step 7: Toggle donor 1 back to active
    console.log(`8️⃣ Toggling Donor 1 back to ACTIVE...`);
    await axios.put(
      `${API_URL}/hospital/donor/${donor1Id}/status`,
      { status: 'active' },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✅ Toggle successful\n');

    // Step 8: Final verification
    console.log('9️⃣ Final Status Verification:\n');
    const donorListRes4 = await axios.get(`${API_URL}/donations/donors`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const donorsFinal = donorListRes4.data.data;

    donor1After = donorsFinal.find(d => 
      (d._id || d.id || d.donorId) === donor1Id.toString()
    );
    donor2After = donorsFinal.find(d => 
      (d._id || d.id || d.donorId) === donor2Id.toString()
    );

    console.log(`   Donor 1: Status = ${donor1After?.status || 'N/A'} (Expected: active)`);
    console.log(`   Donor 2: Status = ${donor2After?.status || 'N/A'} (Expected: inactive)\n`);

    const test3Pass = donor1After?.status === 'active' && donor2After?.status === 'inactive';
    console.log(test3Pass ? '✅ TEST 3 PASSED: Independent status updates work\n' : '❌ TEST 3 FAILED\n');

    // Summary
    console.log('=== SUMMARY ===\n');
    console.log(`Test 1 (Single donor toggle): ${test1Pass ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test 2 (Multiple independent toggles): ${test2Pass ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test 3 (Toggle back to active): ${test3Pass ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`\nOverall: ${test1Pass && test2Pass && test3Pass ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}\n`);

  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
  }
}

testDonorStatusFix();
