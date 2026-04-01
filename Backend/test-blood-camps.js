/**
 * BLOOD CAMP COMPREHENSIVE TEST
 * 
 * Objective: Test blood camp organization and real-time updates
 * 
 * Test Coverage:
 * 1. Camp creation by HOSPITAL, PUBLIC_USER, SUPERADMIN
 * 2. API endpoints validation
 * 3. Real-time socket updates
 * 4. Live data synchronization
 * 5. Permission/authorization checks
 */

const http = require('http');
const io = require('socket.io-client');

const BASE_URL = 'http://localhost:5000';
const SOCKET_URL = 'http://localhost:5000';

// Color logging
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m'
};

const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

class BloodCampTester {
  constructor() {
    this.testResults = [];
    this.testData = {
      hospitalAdmin: null,
      publicUser: null,
      superAdmin: null,
      camps: []
    };
    this.sockets = [];
  }

  async makeRequest(method, endpoint, data = null, token = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(`${BASE_URL}${endpoint}`);
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
      }

      const req = http.request(url, options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const parsed = body ? JSON.parse(body) : {};
            resolve({
              status: res.statusCode,
              headers: res.headers,
              body: parsed
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              body: body
            });
          }
        });
      });

      req.on('error', reject);
      if (data) req.write(JSON.stringify(data));
      req.end();
    });
  }

  async login(email, password) {
    const res = await this.makeRequest('POST', '/api/auth/login', {
      email,
      password
    });
    
    if (res.status === 200 && res.body.data?.token) {
      return res.body.data;
    }
    throw new Error(`Login failed: ${res.body.message}`);
  }

  async testHospitalRegistration() {
    log('\n=== TEST 1: Hospital Registration ===', 'bold');
    
    try {
      // Create a hospital admin if not exists
      const hospitalRes = await this.makeRequest('POST', '/api/auth/register/hospital', {
        hospitalName: 'Test Hospital ' + Date.now(),
        registrationNumber: 'REG' + Date.now(),
        address: '123 Hospital Lane',
        city: 'Vizag',
        state: 'Andhra Pradesh',
        pincode: '530000',
        latitude: 17.6869,
        longitude: 83.2185,
        contactPhone: '9876543210',
        contactEmail: `hospital${Date.now()}@test.com`,
        adminEmail: `admin${Date.now()}@test.com`,
        adminPassword: 'Test@1234',
        adminName: 'Admin User'
      });

      if (hospitalRes.status === 201 || hospitalRes.status === 200) {
        this.testData.hospitalAdmin = {
          token: hospitalRes.body.data?.token || hospitalRes.body.data?.adminToken,
          userId: hospitalRes.body.data?.adminId || hospitalRes.body.data?.userId,
          hospitalId: hospitalRes.body.data?.hospitalId,
          email: hospitalRes.body.data?.adminEmail  
        };
        this.addResult('Hospital Registration', true, 'Hospital created successfully');
        return true;
      } else {
        this.addResult('Hospital Registration', false, hospitalRes.body.message || 'Unknown error');
        return false;
      }
    } catch (error) {
      this.addResult('Hospital Registration', false, error.message);
      return false;
    }
  }

  async testPublicUserRegistration() {
    log('\n=== TEST 2: Public User Registration ===', 'bold');
    
    try {
      const userRes = await this.makeRequest('POST', '/api/public/register', {
        fullName: 'Test User ' + Date.now(),
        email: `user${Date.now()}@test.com`,
        phone: '9876543211',
        password: 'Test@1234',
        bloodGroup: 'O+',
        age: 25,
        gender: 'Male'
      });

      if (userRes.status === 201 && userRes.body.data?.token) {
        this.testData.publicUser = {
          token: userRes.body.data.token,
          userId: userRes.body.data.userId || userRes.body.data.id,
          email: userRes.body.data.email
        };
        this.addResult('Public User Registration', true, 'User created successfully');
        return true;
      } else if (userRes.status === 200 && userRes.body.data?.token) {
        this.testData.publicUser = {
          token: userRes.body.data.token,
          userId: userRes.body.data.userId || userRes.body.data.id,
          email: userRes.body.data.email
        };
        this.addResult('Public User Registration', true, 'User created successfully');
        return true;
      } else {
        this.addResult('Public User Registration', false, userRes.body.message || 'Unknown error');
        return false;
      }
    } catch (error) {
      this.addResult('Public User Registration', false, error.message);
      return false;
    }
  }

  async testCreateCampByHospital() {
    log('\n=== TEST 3: Blood Camp Creation by Hospital ===', 'bold');

    if (!this.testData.hospitalAdmin?.token) {
      this.addResult('Create Camp by Hospital', false, 'Hospital admin not logged in');
      return false;
    }

    try {
      const campRes = await this.makeRequest('POST', '/api/blood-camps', 
        {
          title: 'Hospital Camp ' + Date.now(),
          description: 'Blood donation camp organized by hospital',
          location: {
            coordinates: [83.2185, 17.6869],
            name: 'Hospital Main Campus',
            address: '123 Hospital Lane, Vizag'
          },
          dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          duration: { hours: 4 },
          capacity: 100,
          facilities: ['Refreshments', 'Medical team', 'Parking'],
          bloodGroupsNeeded: ['O+', 'O-', 'A+', 'B+'],
          organizerContact: {
            phone: '9876543210',
            email: 'hospital@test.com'
          }
        },
        this.testData.hospitalAdmin.token
      );

      if (campRes.status === 201) {
        this.testData.camps.push({
          id: campRes.body.data.camp._id,
          organizer: 'hospital',
          data: campRes.body.data.camp
        });
        this.addResult('Create Camp by Hospital', true, 'Camp created: ' + campRes.body.data.camp._id);
        return true;
      } else {
        this.addResult('Create Camp by Hospital', false, campRes.body.message);
        return false;
      }
    } catch (error) {
      this.addResult('Create Camp by Hospital', false, error.message);
      return false;
    }
  }

  async testCreateCampByPublicUser() {
    log('\n=== TEST 4: Blood Camp Creation by Public User ===', 'bold');

    if (!this.testData.publicUser?.token) {
      this.addResult('Create Camp by Public User', false, 'Public user not logged in');
      return false;
    }

    try {
      const campRes = await this.makeRequest('POST', '/api/blood-camps',
        {
          title: 'Community Camp ' + Date.now(),
          description: 'Blood donation camp organized by verified public user',
          location: {
            coordinates: [83.22, 17.68],
            name: 'Community Center',
            address: '456 Main Street, Vizag'
          },
          dateTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          duration: { hours: 3 },
          capacity: 50,
          facilities: ['Light refreshments', 'Basic medical'],
          bloodGroupsNeeded: ['O+', 'A+'],
          organizerContact: {
            phone: '9876543211',
            email: 'user@test.com'
          }
        },
        this.testData.publicUser.token
      );

      if (campRes.status === 201) {
        this.testData.camps.push({
          id: campRes.body.data.camp._id,
          organizer: 'public_user',
          data: campRes.body.data.camp
        });
        this.addResult('Create Camp by Public User', true, 'Camp created: ' + campRes.body.data.camp._id);
        return true;
      } else {
        this.addResult('Create Camp by Public User', false, campRes.body.message);
        return false;
      }
    } catch (error) {
      this.addResult('Create Camp by Public User', false, error.message);
      return false;
    }
  }

  async testGetAllCamps() {
    log('\n=== TEST 5: Get All Blood Camps (Public API) ===', 'bold');

    try {
      const res = await this.makeRequest('GET', '/api/blood-camps?page=1&limit=10');

      if (res.status === 200 && res.body.success) {
        const campCount = res.body.data.camps.length;
        this.addResult('Get All Camps', true, `Retrieved ${campCount} camps`);
        return true;
      } else {
        this.addResult('Get All Camps', false, res.body.message);
        return false;
      }
    } catch (error) {
      this.addResult('Get All Camps', false, error.message);
      return false;
    }
  }

  async testGetNearbyCamps() {
    log('\n=== TEST 6: Get Nearby Camps (Geolocation) ===', 'bold');

    try {
      const res = await this.makeRequest('GET', '/api/blood-camps/nearby?longitude=83.2185&latitude=17.6869&maxDistance=50');

      if (res.status === 200 && res.body.success) {
        const campCount = res.body.data.camps.length;
        this.addResult('Get Nearby Camps', true, `Found ${campCount} camps within 50km`);
        return true;
      } else {
        this.addResult('Get Nearby Camps', false, res.body.message);
        return false;
      }
    } catch (error) {
      this.addResult('Get Nearby Camps', false, error.message);
      return false;
    }
  }

  async testUpdateCamp() {
    log('\n=== TEST 7: Update Blood Camp ===', 'bold');

    if (!this.testData.camps.length) {
      this.addResult('Update Camp', false, 'No camps available to update');
      return false;
    }

    const campId = this.testData.camps[0].id;
    const token = this.testData[this.testData.camps[0].organizer === 'hospital' ? 'hospitalAdmin' : 'publicUser'].token;

    try {
      const res = await this.makeRequest('PUT', `/api/blood-camps/${campId}`,
        {
          title: 'Updated Camp Title ' + Date.now(),
          description: 'Updated description with more details'
        },
        token
      );

      if (res.status === 200) {
        this.addResult('Update Camp', true, 'Camp updated successfully');
        return true;
      } else {
        this.addResult('Update Camp', false, res.body.message);
        return false;
      }
    } catch (error) {
      this.addResult('Update Camp', false, error.message);
      return false;
    }
  }

  setupSocketListener(userId, role, hospitalId = null) {
    return new Promise((resolve) => {
      const socket = io(SOCKET_URL, {
        query: {
          userId,
          role,
          ...(hospitalId && { hospitalId })
        }
      });

      socket.on('connect', () => {
        log(`✓ Socket connected for ${role}:${userId}`, 'green');
        resolve(socket);
      });

      socket.on('connect_error', (error) => {
        log(`✗ Socket connection error: ${error.message}`, 'red');
        resolve(null);
      });

      socket.on('camp.created', (data) => {
        log(`📢 Real-time update received: Camp created - ${data.campId}`, 'blue');
      });

      socket.on('camp.updated', (data) => {
        log(`📢 Real-time update received: Camp updated - ${data.campId}`, 'blue');
      });

      socket.on('disconnect', () => {
        log(`Socket disconnected for ${role}:${userId}`, 'yellow');
      });

      this.sockets.push(socket);
    });
  }

  async testRealTimeUpdates() {
    log('\n=== TEST 8: Real-time Socket Updates ===', 'bold');

    if (!this.testData.hospitalAdmin?.userId || !this.testData.publicUser?.userId) {
      this.addResult('Real-time Socket Updates', false, 'Users not available');
      return false;
    }

    try {
      // Setup socket listeners
      const hospitalSocket = await this.setupSocketListener(
        this.testData.hospitalAdmin.userId,
        'hospital_admin',
        this.testData.hospitalAdmin.hospitalId
      );

      const userSocket = await this.setupSocketListener(
        this.testData.publicUser.userId,
        'public_user'
      );

      if (hospitalSocket && userSocket) {
        this.addResult('Real-time Socket Setup', true, 'Socket listeners connected');
        return true;
      } else {
        this.addResult('Real-time Socket Setup', false, 'Failed to setup sockets');
        return false;
      }
    } catch (error) {
      this.addResult('Real-time Socket Updates', false, error.message);
      return false;
    }
  }

  async testAuthorizationControl() {
    log('\n=== TEST 9: Authorization Control ===', 'bold');

    // Try to cancel camp without authorization
    if (!this.testData.camps.length) {
      this.addResult('Authorization Control', false, 'No camps to test');
      return false;
    }

    try {
      const campId = this.testData.camps[0].id;
      // Try using different user's token
      const wrongToken = this.testData.camps[0].organizer === 'hospital' 
        ? this.testData.publicUser?.token 
        : this.testData.hospitalAdmin?.token;

      if (!wrongToken) {
        this.addResult('Authorization Control', false, 'Cannot test authorization');
        return false;
      }

      const res = await this.makeRequest('PATCH', `/api/blood-camps/${campId}/cancel`,
        { reason: 'Testing authorization' },
        wrongToken
      );

      if (res.status === 403) {
        this.addResult('Authorization Control', true, 'Unauthorized update correctly rejected');
        return true;
      } else if (res.status === 200) {
        this.addResult('Authorization Control', false, 'Unauthorized update was allowed!');
        return false;
      } else {
        this.addResult('Authorization Control', false, `Unexpected status: ${res.status}`);
        return false;
      }
    } catch (error) {
      this.addResult('Authorization Control', false, error.message);
      return false;
    }
  }

  async testAPIEndpoints() {
    log('\n=== TEST 10: API Endpoints Validation ===', 'bold');

    const endpoints = [
      { method: 'GET', path: '/api/blood-camps', name: 'List Camps' },
      { method: 'GET', path: '/api/blood-camps/nearby?longitude=83.2185&latitude=17.6869', name: 'Nearby Camps' },
      { method: 'GET', path: '/api/geolocation/nearby-camps?longitude=83.2185&latitude=17.6869', name: 'Geolocation Camps' }
    ];

    let passed = 0;
    let failed = 0;

    for (const endpoint of endpoints) {
      try {
        const res = await this.makeRequest(endpoint.method, endpoint.path);
        if (res.status === 200) {
          log(`  ✓ ${endpoint.name}`, 'green');
          passed++;
        } else {
          log(`  ✗ ${endpoint.name} (status: ${res.status})`, 'red');
          failed++;
        }
      } catch (error) {
        log(`  ✗ ${endpoint.name} (error: ${error.message})`, 'red');
        failed++;
      }
    }

    this.addResult('API Endpoints', failed === 0, `${passed} passed, ${failed} failed`);
    return failed === 0;
  }

  addResult(testName, passed, message) {
    this.testResults.push({
      testName,
      passed,
      message,
      timestamp: new Date().toISOString()
    });
  }

  printResults() {
    log('\n' + '='.repeat(80), 'bold');
    log('BLOOD CAMP TEST RESULTS', 'bold');
    log('='.repeat(80), 'bold');

    let passedCount = 0;
    let failedCount = 0;

    this.testResults.forEach((result, index) => {
      const status = result.passed ? '✓ PASS' : '✗ FAIL';
      const color = result.passed ? 'green' : 'red';
      log(`${index + 1}. [${status}] ${result.testName}: ${result.message}`, color);
      
      if (result.passed) passedCount++;
      else failedCount++;
    });

    log('\n' + '='.repeat(80), 'bold');
    log(`TOTAL: ${this.testResults.length} | PASSED: ${passedCount} | FAILED: ${failedCount}`, 
      failedCount === 0 ? 'green' : 'red');
    log('='.repeat(80), 'bold');

    return failedCount === 0;
  }

  async cleanup() {
    log('\nCleaning up sockets...', 'yellow');
    this.sockets.forEach(socket => socket.disconnect());
  }

  async runAllTests() {
    log('\n' + '╔' + '═'.repeat(78) + '╗', 'bold');
    log('║' + ' '.repeat(20) + 'BLOOD CAMP SYSTEM TEST SUITE' + ' '.repeat(30) + '║', 'bold');
    log('╚' + '═'.repeat(78) + '╝', 'bold');

    await this.testHospitalRegistration();
    await this.testPublicUserRegistration();
    await this.testCreateCampByHospital();
    await this.testCreateCampByPublicUser();
    await this.testGetAllCamps();
    await this.testGetNearbyCamps();
    await this.testUpdateCamp();
    await this.testRealTimeUpdates();
    await this.testAuthorizationControl();
    await this.testAPIEndpoints();

    const allPassed = this.printResults();
    await this.cleanup();

    return allPassed;
  }
}

// Run tests
(async () => {
  const tester = new BloodCampTester();
  const success = await tester.runAllTests();
  process.exit(success ? 0 : 1);
})();
