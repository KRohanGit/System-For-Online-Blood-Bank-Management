/*
  Live validation for:
  1) Blood camp realtime propagation
  2) Community post/reaction APIs + realtime events
  3) Public-user AI features: P2P donor chain + blood QR trace
*/

require('dotenv').config();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { io } = require('socket.io-client');
const PublicUser = require('./src/models/PublicUser');

const BASE = 'http://localhost:5000';
const API = `${BASE}/api`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function makeSocket(role) {
  return io(BASE, {
    query: { userId: `${role}-${Date.now()}-${Math.random()}`, role },
    transports: ['websocket', 'polling']
  });
}

async function waitForEvent(socket, event, timeoutMs = 6000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ ok: false, event }), timeoutMs);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve({ ok: true, event, payload });
    });
  });
}

async function run() {
  const results = [];
  let adminToken = null;
  let campId = null;
  let communityPostId = null;
  let publicToken = null;
  let publicUser = null;
  let unitId = null;

  try {
    // 1) hospital admin login
    const login = await api('/auth/login', {
      method: 'POST',
      body: { email: 'admin@lifelink.com', password: 'Admin@123' }
    });
    adminToken = login.data?.token || login.data?.data?.token;
    results.push({ test: 'Hospital admin login', pass: !!adminToken, status: login.status });

    // 2) realtime sockets for camp/community updates
    const sPublic = makeSocket('public_user');
    const sHospital = makeSocket('hospital_admin');
    const sDoctor = makeSocket('doctor');
    await sleep(800);

    const campPublicEvt = waitForEvent(sPublic, 'camp.created');
    const campHospitalEvt = waitForEvent(sHospital, 'camp.created');
    const campDoctorEvt = waitForEvent(sDoctor, 'camp.created');

    // 3) create camp using live API
    const campRes = await api('/blood-camps', {
      method: 'POST',
      token: adminToken,
      body: {
        title: `Realtime Camp ${Date.now()}`,
        description: 'Realtime propagation validation camp',
        location: {
          type: 'Point',
          coordinates: [83.3013, 17.7231],
          address: 'MVP Colony',
          city: 'Visakhapatnam',
          state: 'Andhra Pradesh',
          pincode: '530017'
        },
        dateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        capacity: 60,
        duration: { hours: 4 },
        bloodGroupsNeeded: ['O+', 'A+'],
        organizerContact: { phone: '9876543210', email: 'admin@lifelink.com' }
      }
    });
    campId = campRes.data?.data?.camp?._id;
    results.push({ test: 'Create camp API', pass: campRes.status === 201 && !!campId, status: campRes.status });

    const campEvtResults = await Promise.all([campPublicEvt, campHospitalEvt, campDoctorEvt]);
    results.push({ test: 'Camp realtime to public_user', pass: campEvtResults[0].ok });
    results.push({ test: 'Camp realtime to hospital_admin', pass: campEvtResults[1].ok });
    results.push({ test: 'Camp realtime to doctor', pass: campEvtResults[2].ok });

    // 4) community realtime tests
    const communityCreateEvt = waitForEvent(sPublic, 'community.post.created');
    const communityLikeEvt = waitForEvent(sPublic, 'community.post.liked');
    const communityCommentEvt = waitForEvent(sPublic, 'community.post.commented');

    const postRes = await api('/community', {
      method: 'POST',
      token: adminToken,
      body: {
        title: `Community test ${Date.now()}`,
        content: 'Checking post propagation and reactions',
        type: 'general',
        urgency: 'high',
        bloodGroup: 'O+',
        location: {
          type: 'Point',
          coordinates: [83.3013, 17.7231],
          city: 'Visakhapatnam',
          state: 'Andhra Pradesh'
        },
        contactInfo: { phone: '9876543210', email: 'admin@lifelink.com' }
      }
    });
    communityPostId = postRes.data?.post?._id;
    results.push({ test: 'Create community post API', pass: postRes.status === 201 && !!communityPostId, status: postRes.status });

    const likeRes = await api(`/community/${communityPostId}/like`, {
      method: 'POST',
      token: adminToken
    });
    results.push({ test: 'Community like API', pass: likeRes.status === 200, status: likeRes.status });

    const commentRes = await api(`/community/${communityPostId}/comment`, {
      method: 'POST',
      token: adminToken,
      body: { content: 'Realtime comment check' }
    });
    results.push({ test: 'Community comment API', pass: commentRes.status === 200, status: commentRes.status });

    const cEvtResults = await Promise.all([communityCreateEvt, communityLikeEvt, communityCommentEvt]);
    results.push({ test: 'Community realtime post created', pass: cEvtResults[0].ok });
    results.push({ test: 'Community realtime like update', pass: cEvtResults[1].ok });
    results.push({ test: 'Community realtime comment update', pass: cEvtResults[2].ok });

    // 5) AI Feature A: P2P chain API (public user)
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    publicUser = await PublicUser.findOne({ verificationStatus: 'verified', isActive: true }).select('_id email bloodGroup location').lean();

    if (publicUser) {
      publicToken = jwt.sign(
        { userId: String(publicUser._id), role: 'PUBLIC_USER' },
        process.env.JWT_SECRET,
        { expiresIn: '2h' }
      );

      const p2pRes = await api('/emergency/request', {
        method: 'POST',
        token: publicToken,
        body: {
          bloodGroup: publicUser.bloodGroup || 'O+',
          urgency: 'HIGH',
          unitsNeeded: 1,
          location: {
            lat: publicUser.location?.coordinates?.[1] || 17.7231,
            lng: publicUser.location?.coordinates?.[0] || 83.3013,
            address: 'Public user test location'
          }
        }
      });
      results.push({ test: 'P2P donor chain create API', pass: p2pRes.status === 201, status: p2pRes.status });

      // 6) AI Feature B: Blood unit create + QR trace API
      const createUnitRes = await api('/blood/create', {
        method: 'POST',
        token: adminToken,
        body: {
          donorId: String(publicUser._id),
          bloodGroup: publicUser.bloodGroup || 'O+',
          component: 'WHOLE_BLOOD',
          volume: 450
        }
      });
      unitId = createUnitRes.data?.data?.unitId || createUnitRes.data?.data?._id;
      results.push({ test: 'Blood unit create API', pass: createUnitRes.status === 201, status: createUnitRes.status });

      const traceTarget = createUnitRes.data?.data?.unitId || unitId;
      const traceRes = await fetch(`${API}/blood/trace/${traceTarget}`);
      const traceData = await traceRes.json().catch(() => ({}));
      results.push({ test: 'Blood QR trace API', pass: traceRes.status === 200 && traceData?.success === true, status: traceRes.status });
    } else {
      results.push({ test: 'P2P donor chain create API', pass: false, status: 0, note: 'No verified public user found' });
      results.push({ test: 'Blood unit create API', pass: false, status: 0, note: 'No verified public user found' });
      results.push({ test: 'Blood QR trace API', pass: false, status: 0, note: 'No verified public user found' });
    }

    sPublic.disconnect();
    sHospital.disconnect();
    sDoctor.disconnect();

    const passed = results.filter((r) => r.pass).length;
    const total = results.length;

    console.log('\n=== PUBLIC REALTIME + COMMUNITY + AI VALIDATION ===');
    results.forEach((r) => {
      console.log(`${r.pass ? 'PASS' : 'FAIL'} | ${r.test} | status=${r.status}${r.note ? ` | ${r.note}` : ''}`);
    });
    console.log(`\nTOTAL: ${passed}/${total} passed`);

    process.exit(passed === total ? 0 : 1);
  } catch (err) {
    console.error('Validation run failed:', err.message);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  }
}

run();
