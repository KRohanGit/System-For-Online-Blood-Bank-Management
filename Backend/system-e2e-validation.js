require('dotenv').config();
const path = require('path');
const http = require('http');
const https = require('https');
const mongoose = require('mongoose');
const connectDB = require('./src/config/database');

const User = require('./src/models/User');
const HospitalProfile = require('./src/models/HospitalProfile');
const BloodInventory = require('./src/models/BloodInventory');
const EmergencyRequest = require('./src/models/EmergencyRequest');
const HospitalTrustLedger = require('./src/models/HospitalTrustLedger');
const OptimizationRun = require('./src/models/OptimizationRun');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:5000';

const tag = `E2E-${Date.now()}`;
const created = {
  users: [],
  hospitals: [],
  inventoryIds: [],
  emergencyRequestIds: [],
  optimizationRunIds: []
};

const results = [];

function addResult(step, pass, details) {
  results.push({ step, pass, details });
  const status = pass ? 'PASS' : 'FAIL';
  console.log(`[${status}] ${step}: ${details}`);
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function fetchJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const lib = target.protocol === 'https:' ? https : http;

    const req = lib.request(
      {
        method: options.method || 'GET',
        hostname: target.hostname,
        port: target.port || (target.protocol === 'https:' ? 443 : 80),
        path: `${target.pathname}${target.search}`,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        },
        timeout: 15000
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          let data = null;
          try {
            data = raw ? JSON.parse(raw) : null;
          } catch (error) {
            data = null;
          }

          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            data
          });
        });
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error('Request timeout'));
    });

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

async function createMockHospital({ name, adminName, email, password, coords, city, phone, license }) {
  const user = await User.create({
    name: adminName,
    email,
    password,
    role: 'hospital_admin',
    isVerified: true
  });

  const profile = await HospitalProfile.create({
    userId: user._id,
    hospitalName: name,
    officialEmail: `${license.toLowerCase()}@hospital.test`,
    licenseNumber: license,
    licenseFilePath: `mock-license-${tag}.pdf`,
    adminName,
    adminEmail: email,
    verificationStatus: 'approved',
    phone,
    address: `${name} Campus`,
    city,
    state: 'Andhra Pradesh',
    pincode: '530001',
    emergencySupport: true,
    location: {
      type: 'Point',
      coordinates: coords
    }
  });

  created.users.push(user._id);
  created.hospitals.push(profile._id);

  return { user, profile, password };
}

function makeUnits(hospitalId, bloodGroup, count) {
  const units = [];
  for (let i = 0; i < count; i += 1) {
    const now = Date.now();
    units.push({
      bloodUnitId: `${tag}-${bloodGroup.replace('+', 'P').replace('-', 'N')}-${i}-${Math.floor(Math.random() * 100000)}`,
      bloodGroup,
      storageType: 'Whole Blood',
      volume: 450,
      collectionDate: new Date(now - 86400000),
      expiryDate: new Date(now + 1000 * 60 * 60 * 24 * (20 + i % 5)),
      hospitalId,
      status: 'Available',
      notes: `seed-${tag}`
    });
  }
  return units;
}

async function testSocketEvent(userId, hospitalId, triggerFn) {
  const ioClient = require(path.join(__dirname, '../frontend/node_modules/socket.io-client'));

  return new Promise((resolve) => {
    const socket = ioClient(BASE_URL, {
      transports: ['websocket'],
      query: {
        userId: String(userId),
        role: 'hospital_admin',
        hospitalId: String(hospitalId)
      },
      timeout: 6000
    });

    let received = false;

    const timer = setTimeout(() => {
      socket.disconnect();
      resolve(false);
    }, 9000);

    socket.on('connect', async () => {
      socket.on('emergency:new', (payload) => {
        if (payload && payload.requestId) {
          received = true;
          clearTimeout(timer);
          socket.disconnect();
          resolve(true);
        }
      });

      try {
        await triggerFn();
      } catch (error) {
        clearTimeout(timer);
        socket.disconnect();
        resolve(false);
      }
    });

    socket.on('connect_error', () => {
      clearTimeout(timer);
      socket.disconnect();
      resolve(false);
    });

    socket.on('disconnect', () => {
      if (!received) {
        clearTimeout(timer);
        resolve(false);
      }
    });
  });
}

async function cleanup() {
  try {
    if (created.emergencyRequestIds.length) {
      await EmergencyRequest.deleteMany({ _id: { $in: created.emergencyRequestIds } });
    }

    if (created.inventoryIds.length) {
      await BloodInventory.deleteMany({ _id: { $in: created.inventoryIds } });
    }

    if (created.hospitals.length) {
      await HospitalTrustLedger.deleteMany({ hospitalId: { $in: created.hospitals } });
      await HospitalProfile.deleteMany({ _id: { $in: created.hospitals } });
    }

    if (created.users.length) {
      await User.deleteMany({ _id: { $in: created.users } });
      await OptimizationRun.deleteMany({ requestedBy: { $in: created.users } });
    }
  } catch (error) {
    console.error('Cleanup warning:', error.message);
  }
}

async function run() {
  console.log('='.repeat(72));
  console.log('SYSTEM E2E VALIDATION: BLOOD BANK PLATFORM');
  console.log(`Tag: ${tag}`);
  console.log('='.repeat(72));

  try {
    await connectDB();

    const backendHealth = await fetchJson(`${BASE_URL}/health`);
    const mlHealth = await fetchJson(`${BASE_URL}/api/ml/health`);
    addResult(
      'Service health checks',
      backendHealth.ok && mlHealth.ok,
      `backend=${backendHealth.status}, ml=${mlHealth.status}`
    );

    const hospitalA = await createMockHospital({
      name: `Hospital A ${tag}`,
      adminName: 'Admin A',
      email: `hospA.${tag.toLowerCase()}@test.com`,
      password: 'Admin@123',
      coords: [83.301, 17.721],
      city: 'Visakhapatnam',
      phone: '9000000001',
      license: `${tag}-LIC-A`
    });

    const hospitalB = await createMockHospital({
      name: `Hospital B ${tag}`,
      adminName: 'Admin B',
      email: `hospB.${tag.toLowerCase()}@test.com`,
      password: 'Admin@123',
      coords: [83.325, 17.705],
      city: 'Visakhapatnam',
      phone: '9000000002',
      license: `${tag}-LIC-B`
    });

    const registrationsOk =
      !!hospitalA.profile._id &&
      !!hospitalB.profile._id &&
      hospitalA.profile.location.coordinates[0] === 83.301 &&
      hospitalB.profile.location.coordinates[1] === 17.705;

    addResult(
      '1) Hospital registration simulation',
      registrationsOk,
      `A=${hospitalA.profile._id}, B=${hospitalB.profile._id}`
    );

    const inventoryDocs = [
      ...makeUnits(hospitalA.profile._id, 'O+', 20),
      ...makeUnits(hospitalA.profile._id, 'A+', 10),
      ...makeUnits(hospitalB.profile._id, 'B+', 5),
      ...makeUnits(hospitalB.profile._id, 'O-', 2)
    ];

    const inserted = await BloodInventory.insertMany(inventoryDocs);
    created.inventoryIds.push(...inserted.map((x) => x._id));

    const grouped = await BloodInventory.aggregate([
      { $match: { _id: { $in: created.inventoryIds } } },
      { $group: { _id: { hospitalId: '$hospitalId', bloodGroup: '$bloodGroup' }, count: { $sum: 1 }, minExpiry: { $min: '$expiryDate' } } }
    ]);

    const countMap = new Map(
      grouped.map((g) => [`${String(g._id.hospitalId)}|${g._id.bloodGroup}`, { count: g.count, minExpiry: g.minExpiry }])
    );

    const invOk =
      countMap.get(`${String(hospitalA.profile._id)}|O+`)?.count === 20 &&
      countMap.get(`${String(hospitalA.profile._id)}|A+`)?.count === 10 &&
      countMap.get(`${String(hospitalB.profile._id)}|B+`)?.count === 5 &&
      countMap.get(`${String(hospitalB.profile._id)}|O-`)?.count === 2;

    addResult(
      '2) Inventory creation validation',
      invOk,
      `A(O+)=20, A(A+)=10, B(B+)=5, B(O-)=2`
    );

    const loginB = await fetchJson(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      body: JSON.stringify({
        email: hospitalB.user.email,
        password: hospitalB.password,
        role: 'hospital_admin'
      })
    });

    const tokenB = loginB?.data?.data?.token;

    if (!tokenB) {
      addResult('Auth for Hospital B', false, `Login failed: status=${loginB.status}`);
      throw new Error('Cannot continue without Hospital B auth token');
    }

    addResult('Auth for Hospital B', true, 'Token received');

    const requestPayload = {
      bloodGroup: 'O+',
      unitsRequired: 4,
      severityLevel: 'CRITICAL',
      medicalJustification: 'E2E simulation emergency',
      patientDetails: {
        age: 41,
        gender: 'Male',
        diagnosis: 'Trauma'
      },
      requiredBy: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
    };

    const emergencyCreate = await fetchJson(`${BASE_URL}/api/emergency-coordination/request`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify(requestPayload)
    });

    const requestId = emergencyCreate?.data?.request?._id;
    if (requestId) created.emergencyRequestIds.push(requestId);

    const topMatches = emergencyCreate?.data?.matchingHospitals || [];
    const hasAAsSupplier = topMatches.some((m) => String(m.hospitalId) === String(hospitalA.profile._id));

    const sortedDesc = topMatches.every((row, idx) => idx === 0 || row.matchScore <= topMatches[idx - 1].matchScore);

    addResult(
      '3) Real-time request flow (B requests O+)',
      emergencyCreate.ok && hasAAsSupplier,
      `status=${emergencyCreate.status}, matches=${topMatches.length}, hospitalAListed=${hasAAsSupplier}, message=${emergencyCreate?.data?.message || 'n/a'}`
    );

    const scoreFieldsPresent = topMatches.length > 0 &&
      ['matchScore', 'distance', 'availableUnits', 'responseTime', 'confidenceLevel'].every((k) => Object.prototype.hasOwnProperty.call(topMatches[0], k));

    addResult(
      '5) AI decision engine fields/ranking',
      sortedDesc && scoreFieldsPresent,
      `sorted=${sortedDesc}, scoreFields=${scoreFieldsPresent}, topMatch=${topMatches[0]?.hospitalName || 'n/a'}`
    );

    const nearby10 = await fetchJson(
      `${BASE_URL}/api/geolocation/nearby-hospitals?latitude=17.705&longitude=83.325&radius=10`
    );

    const nearby1 = await fetchJson(
      `${BASE_URL}/api/geolocation/nearby-hospitals?latitude=17.705&longitude=83.325&radius=1`
    );

    const hospitals10 = nearby10?.data?.data?.hospitals || [];
    const hospitals1 = nearby1?.data?.data?.hospitals || [];
    const hasAIn10 = hospitals10.some((h) => String(h.id) === String(hospitalA.profile._id));
    const hasAIn1 = hospitals1.some((h) => String(h.id) === String(hospitalA.profile._id));

    const expectedDistance = haversineKm(17.705, 83.325, 17.721, 83.301);
    const reportedA = hospitals10.find((h) => String(h.id) === String(hospitalA.profile._id));
    const distanceClose = reportedA ? Math.abs(reportedA.distance - expectedDistance) < 1.5 : false;

    addResult(
      '4) Geolocation validation',
      nearby10.ok && hasAIn10 && !hasAIn1 && distanceClose,
      `10kmHasA=${hasAIn10}, 1kmHasA=${hasAIn1}, distanceClose=${distanceClose}`
    );

    const socketReceived = await testSocketEvent(
      hospitalA.user._id,
      hospitalA.profile._id,
      async () => {
        const socketTrigger = await fetchJson(`${BASE_URL}/api/emergency-coordination/request`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${tokenB}` },
          body: JSON.stringify({
            bloodGroup: 'O+',
            unitsRequired: 2,
            severityLevel: 'HIGH',
            medicalJustification: 'Socket trigger',
            patientDetails: { age: 33, gender: 'Female', diagnosis: 'Bleeding' },
            requiredBy: new Date(Date.now() + 90 * 60 * 1000).toISOString()
          })
        });

        const id = socketTrigger?.data?.request?._id;
        if (id) created.emergencyRequestIds.push(id);
      }
    );

    addResult(
      '6) Real-time/socket event check',
      socketReceived,
      `emergency:new received by Hospital A socket client=${socketReceived}`
    );

    const mlDemand = await fetchJson(`${BASE_URL}/api/ml/predict/demand`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({
        hospitalId: String(hospitalB.profile._id),
        bloodGroup: 'O+',
        horizonDays: 7
      })
    });

    const mlCrisis = await fetchJson(`${BASE_URL}/api/ml/predict/crisis`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({
        hospitalId: String(hospitalB.profile._id),
        lookaheadHours: 48
      })
    });

    const mlModelsOk = mlDemand.ok && mlCrisis.ok;
    addResult(
      'ML model API checks (demand + crisis)',
      mlModelsOk,
      `demand=${mlDemand.status}, crisis=${mlCrisis.status}`
    );

    const optimize = await fetchJson(`${BASE_URL}/api/optimize/transfers`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({
        mode: 'balanced',
        hospitalIds: [String(hospitalA.profile._id), String(hospitalB.profile._id)],
        bloodGroups: ['O+', 'B+', 'A+'],
        constraints: {
          maxDistanceKm: 25,
          maxUnitsPerTransfer: 8
        }
      })
    });

    const runId = optimize?.data?.runId;
    if (runId) created.optimizationRunIds.push(runId);

    const transferCount = Array.isArray(optimize?.data?.transfers) ? optimize.data.transfers.length : 0;
    const hasDistanceInTransfers = transferCount > 0
      ? optimize.data.transfers.every((t) => typeof t.distanceKm === 'number')
      : false;

    addResult(
      '7) Transfer optimization check',
      optimize.ok && transferCount > 0 && hasDistanceInTransfers,
      `status=${optimize.status}, transfers=${transferCount}, distanceField=${hasDistanceInTransfers}, message=${optimize?.data?.message || 'n/a'}`
    );

    const noNearby = await fetchJson(
      `${BASE_URL}/api/geolocation/nearby-hospitals?latitude=10.0&longitude=70.0&radius=1`
    );

    const noStockReq = await fetchJson(`${BASE_URL}/api/emergency-coordination/request`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({
        bloodGroup: 'AB-',
        unitsRequired: 5,
        severityLevel: 'HIGH',
        medicalJustification: 'No stock scenario',
        patientDetails: { age: 50, gender: 'Male', diagnosis: 'Surgery' },
        requiredBy: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      })
    });

    const noStockId = noStockReq?.data?.request?._id;
    if (noStockId) created.emergencyRequestIds.push(noStockId);

    const invalidBlood = await fetchJson(`${BASE_URL}/api/emergency-coordination/request`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({
        bloodGroup: 'X+',
        unitsRequired: 1,
        severityLevel: 'LOW',
        medicalJustification: 'Invalid type test',
        patientDetails: { age: 29, gender: 'Male', diagnosis: 'Test' },
        requiredBy: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      })
    });

    const noNearbyCount = noNearby?.data?.data?.hospitals?.length || 0;
    const noStockMatches = noStockReq?.data?.matchingHospitals?.length || 0;

    addResult(
      '8) Edge cases',
      noNearby.ok && noNearbyCount === 0 && noStockReq.ok && noStockMatches === 0 && !invalidBlood.ok,
      `noNearby=${noNearbyCount}, noStockMatches=${noStockMatches}, invalidBloodStatus=${invalidBlood.status}, invalidMsg=${invalidBlood?.data?.message || 'n/a'}`
    );

    console.log('\n' + '-'.repeat(72));
    console.log('POSTMAN-STYLE API VERIFICATION SNAPSHOT');
    console.log('-'.repeat(72));
    console.log(`GET ${BASE_URL}/health -> ${backendHealth.status}`);
    console.log(`GET ${BASE_URL}/api/ml/health -> ${mlHealth.status}`);
    console.log(`POST ${BASE_URL}/api/auth/login -> ${loginB.status}`);
    console.log(`POST ${BASE_URL}/api/emergency-coordination/request -> ${emergencyCreate.status}`);
    console.log(`GET ${BASE_URL}/api/geolocation/nearby-hospitals -> ${nearby10.status}`);
    console.log(`POST ${BASE_URL}/api/ml/predict/demand -> ${mlDemand.status}`);
    console.log(`POST ${BASE_URL}/api/ml/predict/crisis -> ${mlCrisis.status}`);
    console.log(`POST ${BASE_URL}/api/optimize/transfers -> ${optimize.status}`);

    const passed = results.filter((r) => r.pass).length;
    const failed = results.length - passed;

    console.log('\n' + '='.repeat(72));
    console.log(`FINAL: ${passed}/${results.length} PASSED, ${failed} FAILED`);
    console.log('='.repeat(72));

    if (failed > 0) {
      console.log('Failures:');
      results.filter((r) => !r.pass).forEach((r) => {
        console.log(`- ${r.step}: ${r.details}`);
      });
    }

    await cleanup();
    await mongoose.connection.close();

    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Fatal test error:', error.message);
    await cleanup();
    await mongoose.connection.close();
    process.exit(1);
  }
}

run();
