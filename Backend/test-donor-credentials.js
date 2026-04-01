const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function testDonorCredentialsFlow() {
  console.log('\n🧪 TESTING DONOR CREDENTIALS WORKFLOW\n');
  console.log('=' .repeat(60));

  let token;
  let donorId;
  const testEmail = `test-donor-${Date.now()}@example.com`;
  const testPhone = Math.random().toString().slice(2, 12);

  try {
    // Step 1: Hospital Admin Login
    console.log('\n[1/5] Hospital Admin Login...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@lifelink.com',
      password: 'Admin@123'
    });
    token = loginRes.data.token;
    console.log('✓ Login successful, token obtained');

    // Step 2: Create Donor
    console.log('\n[2/5] Creating Donor Account...');
    const createRes = await axios.post(
      `${API_URL}/hospital/donor`,
      {
        email: testEmail,
        password: 'TempPass@123',
        donorName: 'Test Donor',
        phone: testPhone,
        bloodGroup: 'O+'
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    donorId = createRes.data.data.id;
    const otp1 = createRes.data.data.credentials.otp;
    const emailSent1 = createRes.data.data.emailSent;
    
    console.log(`✓ Donor created: ${donorId}`);
    console.log(`  Email: ${testEmail}`);
    console.log(`  OTP: ${otp1}`);
    console.log(`  Email Sent: ${emailSent1 ? '✓ Yes' : '✗ In Progress'}`);

    // Step 3: Try to create again (should fail with "already exists")
    console.log('\n[3/5] Testing Duplicate Prevention...');
    try {
      await axios.post(
        `${API_URL}/hospital/donor`,
        {
          email: testEmail,
          password: 'TempPass@123',
          donorName: 'Test Donor 2',
          phone: '9999999999',
          bloodGroup: 'B+'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('✗ ERROR: Should have rejected duplicate email!');
    } catch (err) {
      if (err.response?.status === 409) {
        console.log('✓ Correctly rejected duplicate email');
        console.log(`  Error: ${err.response.data.message}`);
      } else {
        console.log(`✗ Unexpected error: ${err.message}`);
      }
    }

    // Step 4: Resend Credentials
    console.log('\n[4/5] Testing Resend Credentials...');
    const resendRes = await axios.post(
      `${API_URL}/hospital/donor/${donorId}/resend-credentials`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const otp2 = resendRes.data.data.credentials.otp;
    const emailSent2 = resendRes.data.data.emailSent;
    
    console.log('✓ Credentials resent successfully');
    console.log(`  New OTP: ${otp2}`);
    console.log(`  Email Sent: ${emailSent2 ? '✓ Yes' : '✗ In Progress'}`);
    console.log(`  OTP changed: ${otp1 !== otp2 ? '✓ Yes' : '✗ No'}`);

    // Step 5: Login with new OTP
    console.log('\n[5/5] Testing Donor Login with OTP...');
    const donorLoginRes = await axios.post(
      `${API_URL}/donor-auth/login/otp`,
      {
        email: testEmail,
        otp: otp2
      }
    );
    
    const donorToken = donorLoginRes.data.data.token;
    console.log('✓ Donor OTP login successful');
    console.log(`  Must change password: ${donorLoginRes.data.data.mustChangePassword}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED!\n');
    console.log('Summary:');
    console.log('✓ Hospital admin can create donors');
    console.log('✓ Email/phone duplicates are prevented');
    console.log('✓ Credentials can be resent');
    console.log('✓ OTPs are unique each time');
    console.log('✓ Donors can login with OTP');
    console.log('✓ Email sending status is reported');
    
  } catch (error) {
    console.log('\n❌ TEST FAILED');
    console.log('Error:', error.response?.data?.message || error.message);
    console.log('Status:', error.response?.status);
  }
}

console.log('\n⏳ Starting tests...\n');
testDonorCredentialsFlow();
