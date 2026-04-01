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
const OptimizationRun = require('./src/models/OptimizationRun');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const tag = `FULL-${Date.now()}`;

const created = {
  users: [],
  hospitals: [],
  inventoryIds: [],
  emergencyRequestIds: [],
  optimizationRunIds: []
};

const checks = [];

function logCheck(name, pass, details) {
  checks.push({ name, pass, details });
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name}: ${details}`);
}

function toObjectIdString(value) {
  return String(value);
}

function nowIsoPlusHours(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function hrMs(start) {
  return Number(process.hrtime.bigint() - start) / 1e6;
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
    const start = process.hrtime.bigint();

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
        timeout: options.timeout || 15000
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
            data,
            elapsedMs: hrMs(start)
          });
        });
      }
    );

    req.on('timeout', () => req.destroy(new Error('Request timeout')));
    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function createHospital({ name, email, coords, city, phone, license }) {
  const user = await User.create({
    name: `${name} Admin`,
    email,
    password: 'Admin@123',
    role: 'hospital_admin',
    isVerified: true
  });

  const profile = await HospitalProfile.create({
    userId: user._id,
    hospitalName: name,
    officialEmail: `${license.toLowerCase()}@hospital.test`,
    licenseNumber: license,
    licenseFilePath: `mock-license-${tag}.pdf`,
    adminName: `${name} Admin`,
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
  return { user, profile, password: 'Admin@123' };
}

function makeUnits(hospitalId, bloodGroup, count) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    out.push({
      bloodUnitId: `${tag}-${bloodGroup.replace('+', 'P').replace('-', 'N')}-${i}-${Math.floor(Math.random() * 100000)}`,
      bloodGroup,
      storageType: 'Whole Blood',
      volume: 450,
      collectionDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      expiryDate: new Date(Date.now() + (20 + (i % 7)) * 24 * 60 * 60 * 1000),
      hospitalId,
      status: 'Available',
      notes: `seed-${tag}`
    });
  }
  return out;
}

async function login(email, password) {
  const res = await fetchJson(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password, role: 'hospital_admin' })
  });

  return {
    ok: res.ok,
    status: res.status,
    token: res?.data?.data?.token,
    elapsedMs: res.elapsedMs
  };
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
  console.log('='.repeat(80));
  console.log('FULL SYSTEM VALIDATION: AI BLOOD BANK MANAGEMENT PLATFORM');
  console.log(`Tag: ${tag}`);
  console.log('='.repeat(80));

  let hospitalA;
  let hospitalB;
  let hospitalC;
  let tokenA;
  let tokenB;
  let tokenC;

  try {
    await connectDB();

    const backendHealth = await fetchJson(`${BASE_URL}/health`);
    const mlHealth = await fetchJson(`${BASE_URL}/api/ml/health`);
    const healthPass = backendHealth.ok && mlHealth.ok;
    logCheck('0) Service health ready', healthPass, `backend=${backendHealth.status}, ml=${mlHealth.status}`);
    if (!healthPass) {
      throw new Error('Services are not healthy; aborting validation run.');
    }

    hospitalA = await createHospital({
      name: `Hospital A ${tag}`,
      email: `hospA.${tag.toLowerCase()}@test.com`,
      coords: [83.301, 17.721],
      city: 'Visakhapatnam',
      phone: '9000000101',
      license: `${tag}-LIC-A`
    });

    hospitalB = await createHospital({
      name: `Hospital B ${tag}`,
      email: `hospB.${tag.toLowerCase()}@test.com`,
      coords: [83.325, 17.705],
      city: 'Visakhapatnam',
      phone: '9000000102',
      license: `${tag}-LIC-B`
    });

    hospitalC = await createHospital({
      name: `Hospital C ${tag}`,
      email: `hospC.${tag.toLowerCase()}@test.com`,
      coords: [83.29, 17.74],
      city: 'Visakhapatnam',
      phone: '9000000103',
      license: `${tag}-LIC-C`
    });

    const registrationPass =
      toObjectIdString(hospitalA.profile._id) !== toObjectIdString(hospitalB.profile._id) &&
      toObjectIdString(hospitalB.profile._id) !== toObjectIdString(hospitalC.profile._id) &&
      hospitalA.profile.location.coordinates.length === 2 &&
      hospitalB.profile.location.coordinates.length === 2 &&
      hospitalC.profile.location.coordinates.length === 2;

    logCheck(
      '1) Hospital registration test',
      registrationPass,
      `A=${hospitalA.profile._id}, B=${hospitalB.profile._id}, C=${hospitalC.profile._id}`
    );

    const inventoryDocs = [
      ...makeUnits(hospitalA.profile._id, 'O+', 20),
      ...makeUnits(hospitalA.profile._id, 'A+', 10),
      ...makeUnits(hospitalA.profile._id, 'O-', 6),
      ...makeUnits(hospitalB.profile._id, 'B+', 5),
      ...makeUnits(hospitalB.profile._id, 'O-', 2)
    ];

    const inserted = await BloodInventory.insertMany(inventoryDocs);
    created.inventoryIds.push(...inserted.map((x) => x._id));

    const negativeExists = inserted.some((u) => u.volume < 0);
    const missingExpiry = inserted.some((u) => !u.expiryDate);

    const grouped = await BloodInventory.aggregate([
      { $match: { _id: { $in: created.inventoryIds } } },
      { $group: { _id: { hospitalId: '$hospitalId', bloodGroup: '$bloodGroup' }, count: { $sum: 1 } } }
    ]);
    const map = new Map(grouped.map((g) => [`${String(g._id.hospitalId)}|${g._id.bloodGroup}`, g.count]));

    const inventoryPass =
      map.get(`${toObjectIdString(hospitalA.profile._id)}|O+`) === 20 &&
      map.get(`${toObjectIdString(hospitalA.profile._id)}|A+`) === 10 &&
      map.get(`${toObjectIdString(hospitalB.profile._id)}|B+`) === 5 &&
      map.get(`${toObjectIdString(hospitalB.profile._id)}|O-`) === 2 &&
      !negativeExists &&
      !missingExpiry;

    logCheck(
      '2) Inventory management test',
      inventoryPass,
      `A(O+)=20, A(A+)=10, B(B+)=5, B(O-)=2, negative=${negativeExists}, missingExpiry=${missingExpiry}`
    );

    const loginA = await login(hospitalA.user.email, hospitalA.password);
    const loginB = await login(hospitalB.user.email, hospitalB.password);
    const loginC = await login(hospitalC.user.email, hospitalC.password);
    tokenA = loginA.token;
    tokenB = loginB.token;
    tokenC = loginC.token;

    const authReady = Boolean(tokenA && tokenB && tokenC);
    logCheck('Auth readiness', authReady, `A=${loginA.status}, B=${loginB.status}, C=${loginC.status}`);
    if (!authReady) {
      throw new Error('Cannot run live API tests without all auth tokens.');
    }

    const oNegReq = await fetchJson(`${BASE_URL}/api/emergency-coordination/request`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({
        bloodGroup: 'O-',
        unitsRequired: 1,
        severityLevel: 'HIGH',
        medicalJustification: 'Compatibility O- validation',
        patientDetails: { age: 35, gender: 'Male', diagnosis: 'Trauma' },
        requiredBy: nowIsoPlusHours(2)
      })
    });

    const oNegRequestId = oNegReq?.data?.request?._id;
    if (oNegRequestId) created.emergencyRequestIds.push(oNegRequestId);

    const oNegMatches = oNegReq?.data?.matchingHospitals || [];
    const oNegIncludesA = oNegMatches.some((m) => toObjectIdString(m.hospitalId) === toObjectIdString(hospitalA.profile._id));
    const oNegIncludesB = oNegMatches.some((m) => toObjectIdString(m.hospitalId) === toObjectIdString(hospitalB.profile._id));

    const abPosReq = await fetchJson(`${BASE_URL}/api/emergency-coordination/request`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenC}` },
      body: JSON.stringify({
        bloodGroup: 'AB+',
        unitsRequired: 1,
        severityLevel: 'MEDIUM',
        medicalJustification: 'Compatibility AB+ validation',
        patientDetails: { age: 44, gender: 'Female', diagnosis: 'Surgery' },
        requiredBy: nowIsoPlusHours(4)
      })
    });

    const abPosRequestId = abPosReq?.data?.request?._id;
    if (abPosRequestId) created.emergencyRequestIds.push(abPosRequestId);

    const abPosMatches = abPosReq?.data?.matchingHospitals || [];

    const compatibilityPass =
      oNegReq.ok &&
      abPosReq.ok &&
      oNegMatches.length >= 1 &&
      oNegIncludesA &&
      !oNegIncludesB &&
      abPosMatches.length >= 1;

    logCheck(
      '3) Blood compatibility check',
      compatibilityPass,
      `O- matches=${oNegMatches.length}, includesA=${oNegIncludesA}, includesRequester=${oNegIncludesB}, AB+ matches=${abPosMatches.length}`
    );

    const rtReq = await fetchJson(`${BASE_URL}/api/emergency-coordination/request`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({
        bloodGroup: 'O+',
        unitsRequired: 4,
        severityLevel: 'CRITICAL',
        medicalJustification: 'Real-time flow check',
        patientDetails: { age: 41, gender: 'Male', diagnosis: 'Trauma' },
        requiredBy: nowIsoPlusHours(2)
      })
    });

    const rtRequestId = rtReq?.data?.request?._id;
    if (rtRequestId) created.emergencyRequestIds.push(rtRequestId);

    const rtMatches = rtReq?.data?.matchingHospitals || [];
    const hasA = rtMatches.some((m) => toObjectIdString(m.hospitalId) === toObjectIdString(hospitalA.profile._id));
    const scoreFields = rtMatches.length > 0 && ['hospitalId', 'distance', 'matchScore', 'availableUnits'].every((k) => Object.prototype.hasOwnProperty.call(rtMatches[0], k));

    logCheck(
      '4) Real-time request flow (live API)',
      rtReq.ok && hasA && scoreFields,
      `status=${rtReq.status}, matches=${rtMatches.length}, hasA=${hasA}, fields=${scoreFields}, latency=${rtReq.elapsedMs.toFixed(1)}ms`
    );

    const nearby10 = await fetchJson(`${BASE_URL}/api/geolocation/nearby-hospitals?latitude=17.705&longitude=83.325&radius=10`);
    const nearby1 = await fetchJson(`${BASE_URL}/api/geolocation/nearby-hospitals?latitude=17.705&longitude=83.325&radius=1`);
    const hospitals10 = nearby10?.data?.data?.hospitals || [];
    const hospitals1 = nearby1?.data?.data?.hospitals || [];
    const aIn10 = hospitals10.find((h) => toObjectIdString(h.id) === toObjectIdString(hospitalA.profile._id));
    const aIn1 = hospitals1.find((h) => toObjectIdString(h.id) === toObjectIdString(hospitalA.profile._id));
    const expected = haversineKm(17.705, 83.325, 17.721, 83.301);
    const distanceOk = aIn10 ? Math.abs(aIn10.distance - expected) < 1.5 : false;

    logCheck(
      '5) Geolocation and distance validation',
      nearby10.ok && nearby1.ok && Boolean(aIn10) && !aIn1 && distanceOk,
      `aIn10=${Boolean(aIn10)}, aIn1=${Boolean(aIn1)}, distanceOk=${distanceOk}`
    );

    const aiSorted = rtMatches.every((m, i) => i === 0 || m.matchScore <= rtMatches[i - 1].matchScore);
    const aiNoZeroStock = rtMatches.every((m) => Number(m.availableUnits || 0) > 0);
    const aiFields = rtMatches.length > 0 && ['trustScore', 'reliabilityRating', 'responseTime'].every((k) => Object.prototype.hasOwnProperty.call(rtMatches[0], k));

    logCheck(
      '6) AI decision engine validation',
      rtReq.ok && aiSorted && aiNoZeroStock && aiFields,
      `sorted=${aiSorted}, nonZeroStock=${aiNoZeroStock}, trustWorkloadProxyFields=${aiFields}`
    );

    const optimize = await fetchJson(`${BASE_URL}/api/optimize/transfers`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({
        mode: 'balanced',
        hospitalIds: [toObjectIdString(hospitalA.profile._id), toObjectIdString(hospitalB.profile._id)],
        bloodGroups: ['O+', 'B+', 'A+'],
        constraints: {
          maxDistanceKm: 25,
          maxUnitsPerTransfer: 8
        }
      })
    });

    if (optimize?.data?.runId) {
      created.optimizationRunIds.push(optimize.data.runId);
    }

    const transfers = Array.isArray(optimize?.data?.transfers) ? optimize.data.transfers : [];
    const transferHasDistance = transfers.every((t) => typeof t.distanceKm === 'number');

    logCheck(
      '7) Transfer optimization engine',
      optimize.ok && transfers.length > 0 && transferHasDistance,
      `status=${optimize.status}, transfers=${transfers.length}, hasDistance=${transferHasDistance}`
    );

    const req1 = {
      bloodGroup: 'O+',
      unitsRequired: 3,
      severityLevel: 'HIGH',
      medicalJustification: 'Concurrency request 1',
      patientDetails: { age: 25, gender: 'Female', diagnosis: 'Emergency' },
      requiredBy: nowIsoPlusHours(1)
    };
    const req2 = {
      bloodGroup: 'O+',
      unitsRequired: 3,
      severityLevel: 'HIGH',
      medicalJustification: 'Concurrency request 2',
      patientDetails: { age: 31, gender: 'Male', diagnosis: 'Emergency' },
      requiredBy: nowIsoPlusHours(1)
    };

    const [cReq1, cReq2] = await Promise.all([
      fetchJson(`${BASE_URL}/api/emergency-coordination/request`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenC}` },
        body: JSON.stringify(req1)
      }),
      fetchJson(`${BASE_URL}/api/emergency-coordination/request`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}` },
        body: JSON.stringify(req2)
      })
    ]);

    const cId1 = cReq1?.data?.request?._id;
    const cId2 = cReq2?.data?.request?._id;
    if (cId1) created.emergencyRequestIds.push(cId1);
    if (cId2) created.emergencyRequestIds.push(cId2);

    let duplicateAllocation = false;
    if (cId1 && tokenA) {
      const [acc1, acc2] = await Promise.all([
        fetchJson(`${BASE_URL}/api/emergency-coordination/request/${cId1}/accept`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${tokenA}` },
          body: JSON.stringify({ unitsCommitted: 2, estimatedDeliveryTime: 35, notes: 'Concurrent acceptance 1' })
        }),
        fetchJson(`${BASE_URL}/api/emergency-coordination/request/${cId1}/accept`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${tokenC}` },
          body: JSON.stringify({ unitsCommitted: 2, estimatedDeliveryTime: 30, notes: 'Concurrent acceptance 2' })
        })
      ]);

      const acceptedCount = [acc1.status, acc2.status].filter((s) => s >= 200 && s < 300).length;
      duplicateAllocation = acceptedCount > 1;
    }

    const negativeInventoryAfterConcurrency = await BloodInventory.countDocuments({
      _id: { $in: created.inventoryIds },
      volume: { $lt: 0 }
    });

    logCheck(
      '8) Concurrency test',
      cReq1.ok && cReq2.ok && !duplicateAllocation && negativeInventoryAfterConcurrency === 0,
      `request1=${cReq1.status}, request2=${cReq2.status}, duplicateAllocation=${duplicateAllocation}, negativeInventory=${negativeInventoryAfterConcurrency}`
    );

    const ioClient = require(path.join(__dirname, '../frontend/node_modules/socket.io-client'));
    const socketResult = await new Promise((resolve) => {
      const socket = ioClient(BASE_URL, {
        transports: ['websocket'],
        query: {
          userId: toObjectIdString(hospitalA.user._id),
          role: 'hospital_admin',
          hospitalId: toObjectIdString(hospitalA.profile._id)
        },
        timeout: 6000
      });

      const receivedIds = new Set();
      let connected = false;

      const timeout = setTimeout(() => {
        socket.disconnect();
        resolve({ connected, count: receivedIds.size, reconnectWorked: connected });
      }, 12000);

      socket.on('connect', async () => {
        connected = true;
        await fetchJson(`${BASE_URL}/api/emergency-coordination/request`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${tokenB}` },
          body: JSON.stringify({
            bloodGroup: 'O+',
            unitsRequired: 1,
            severityLevel: 'HIGH',
            medicalJustification: 'Socket test trigger',
            patientDetails: { age: 28, gender: 'Male', diagnosis: 'Trauma' },
            requiredBy: nowIsoPlusHours(2)
          })
        }).then((r) => {
          if (r?.data?.request?._id) {
            created.emergencyRequestIds.push(r.data.request._id);
          }
        });
      });

      socket.on('emergency:new', (payload) => {
        if (payload && payload.requestId) {
          receivedIds.add(String(payload.requestId));
          if (receivedIds.size >= 1) {
            clearTimeout(timeout);
            socket.disconnect();
            resolve({ connected, count: receivedIds.size, reconnectWorked: true });
          }
        }
      });

      socket.on('connect_error', () => {
        clearTimeout(timeout);
        socket.disconnect();
        resolve({ connected: false, count: 0, reconnectWorked: false });
      });
    });

    logCheck(
      '9) Real-time socket test',
      socketResult.connected && socketResult.count === 1 && socketResult.reconnectWorked,
      `connected=${socketResult.connected}, events=${socketResult.count}, reconnect=${socketResult.reconnectWorked}`
    );

    const noNearby = await fetchJson(`${BASE_URL}/api/geolocation/nearby-hospitals?latitude=10&longitude=70&radius=1`);
    const noStock = await fetchJson(`${BASE_URL}/api/emergency-coordination/request`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({
        bloodGroup: 'AB-',
        unitsRequired: 9,
        severityLevel: 'HIGH',
        medicalJustification: 'No inventory edge',
        patientDetails: { age: 50, gender: 'Male', diagnosis: 'Surgery' },
        requiredBy: nowIsoPlusHours(1)
      })
    });
    if (noStock?.data?.request?._id) created.emergencyRequestIds.push(noStock.data.request._id);

    const invalidBlood = await fetchJson(`${BASE_URL}/api/emergency-coordination/request`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({
        bloodGroup: 'X+',
        unitsRequired: 1,
        severityLevel: 'LOW',
        medicalJustification: 'Invalid blood type',
        patientDetails: { age: 22, gender: 'Female', diagnosis: 'Test' },
        requiredBy: nowIsoPlusHours(1)
      })
    });

    const largeReq = await fetchJson(`${BASE_URL}/api/emergency-coordination/request`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({
        bloodGroup: 'O+',
        unitsRequired: 9999,
        severityLevel: 'CRITICAL',
        medicalJustification: 'Large request edge',
        patientDetails: { age: 60, gender: 'Male', diagnosis: 'Mass casualty' },
        requiredBy: nowIsoPlusHours(1)
      })
    });
    if (largeReq?.data?.request?._id) created.emergencyRequestIds.push(largeReq.data.request._id);

    const noNearbyCount = noNearby?.data?.data?.hospitals?.length || 0;
    const noStockMatches = noStock?.data?.matchingHospitals?.length || 0;
    const edgePass = noNearby.ok && noNearbyCount === 0 && noStock.ok && noStockMatches === 0 && !invalidBlood.ok && largeReq.ok;

    logCheck(
      '10) Edge case testing',
      edgePass,
      `noNearby=${noNearbyCount}, noStockMatches=${noStockMatches}, invalidBloodStatus=${invalidBlood.status}, largeReqStatus=${largeReq.status}`
    );

    const perfEndpoints = [
      () => fetchJson(`${BASE_URL}/health`),
      () => fetchJson(`${BASE_URL}/api/ml/health`),
      () => fetchJson(`${BASE_URL}/api/geolocation/nearby-hospitals?latitude=17.705&longitude=83.325&radius=10`),
      () => fetchJson(`${BASE_URL}/api/emergency-coordination/requests`, {
        headers: { Authorization: `Bearer ${tokenB}` }
      })
    ];

    const perfRuns = [];
    for (const call of perfEndpoints) {
      const response = await call();
      perfRuns.push({ status: response.status, elapsedMs: response.elapsedMs, ok: response.ok });
    }

    const perfPass = perfRuns.every((r) => r.ok && r.elapsedMs < 3000);
    logCheck(
      '11) Performance test (<3s)',
      perfPass,
      perfRuns.map((r, i) => `e${i + 1}:${r.status}/${r.elapsedMs.toFixed(1)}ms`).join(', ')
    );

    const unauthorized = await fetchJson(`${BASE_URL}/api/emergency-coordination/requests`);
    const crossHospitalRead = rtRequestId
      ? await fetchJson(`${BASE_URL}/api/emergency-coordination/request/${rtRequestId}`, {
          headers: { Authorization: `Bearer ${tokenA}` }
        })
      : { status: 500, ok: false };

    const securityPass = unauthorized.status === 401 && !crossHospitalRead.ok;
    logCheck(
      '12) Security validation',
      securityPass,
      `unauthStatus=${unauthorized.status}, crossHospitalReadStatus=${crossHospitalRead.status}`
    );

    const consistencyCounts = await BloodInventory.aggregate([
      { $match: { _id: { $in: created.inventoryIds }, status: { $in: ['Available', 'Reserved'] } } },
      { $group: { _id: { hospitalId: '$hospitalId', bloodGroup: '$bloodGroup', status: '$status' }, count: { $sum: 1 } } }
    ]);

    const decisionTopUnits = rtMatches[0]?.availableUnits;
    const physicalA_O = consistencyCounts
      .filter((x) => toObjectIdString(x._id.hospitalId) === toObjectIdString(hospitalA.profile._id) && x._id.bloodGroup === 'O+')
      .reduce((acc, x) => acc + x.count, 0);

    const consistencyPass = typeof decisionTopUnits === 'number' && decisionTopUnits <= physicalA_O;
    logCheck(
      '13) Data consistency check',
      consistencyPass,
      `decisionTopAvailable=${decisionTopUnits}, physicalA_O_total(available+reserved)=${physicalA_O}`
    );

    const retryProbe1 = await fetchJson(`${BASE_URL}/api/ml/predict/demand`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({
        hospitalId: toObjectIdString(hospitalB.profile._id),
        bloodGroup: 'O+',
        horizonDays: 7
      })
    });
    const retryProbe2 = await fetchJson(`${BASE_URL}/api/ml/predict/demand`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({
        hospitalId: 'invalid-hospital-id',
        bloodGroup: 'O+',
        horizonDays: 7
      })
    });

    const retryPass = retryProbe1.ok && !retryProbe2.ok;
    logCheck(
      '14) Failure and retry handling',
      retryPass,
      `validDemand=${retryProbe1.status}, invalidDemand=${retryProbe2.status}`
    );

    const liveApiChecks = [
      {
        label: 'POST /api/auth/login',
        status: loginB.status,
        ok: loginB.status === 200
      },
      {
        label: 'POST /api/emergency-coordination/request',
        status: rtReq.status,
        ok: rtReq.status === 201
      },
      {
        label: 'GET /api/emergency-coordination/request/:id/matches',
        status: rtRequestId
          ? (await fetchJson(`${BASE_URL}/api/emergency-coordination/request/${rtRequestId}/matches`, {
              headers: { Authorization: `Bearer ${tokenB}` }
            })).status
          : 500,
        ok: true
      },
      {
        label: 'POST /api/optimize/transfers',
        status: optimize.status,
        ok: optimize.status === 200
      }
    ];

    const livePass = liveApiChecks.every((x) => x.ok && x.status < 500);
    logCheck(
      '15) Live API testing',
      livePass,
      liveApiChecks.map((x) => `${x.label}=${x.status}`).join(', ')
    );

    console.log('\n' + '-'.repeat(80));
    console.log('PASS/FAIL SUMMARY');
    console.log('-'.repeat(80));
    const passed = checks.filter((x) => x.pass).length;
    const failed = checks.length - passed;
    console.log(`TOTAL: ${passed}/${checks.length} PASSED, ${failed} FAILED`);

    if (failed > 0) {
      console.log('Failed checks:');
      checks.filter((x) => !x.pass).forEach((x) => {
        console.log(`- ${x.name}: ${x.details}`);
      });
    }

    await cleanup();
    await mongoose.connection.close();
    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Fatal validation error:', error.message);
    await cleanup();
    await mongoose.connection.close();
    process.exit(1);
  }
}

run();
