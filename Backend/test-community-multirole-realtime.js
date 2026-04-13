require('dotenv').config();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { io } = require('socket.io-client');

const PublicUser = require('./src/models/PublicUser');
const User = require('./src/models/User');

const BASE = process.env.TEST_BASE_URL || 'http://localhost:5000';
const API = `${BASE}/api`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

function tokenFor(userId, role) {
  return jwt.sign(
    { userId: String(userId), role },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
  );
}

function connectClient(userId, role) {
  return io(BASE, {
    query: { userId: String(userId), role: String(role) },
    transports: ['websocket', 'polling'],
    reconnection: false
  });
}

function waitForConnect(socket, timeoutMs = 8000) {
  return new Promise((resolve) => {
    if (socket.connected) {
      resolve(true);
      return;
    }

    const timer = setTimeout(() => resolve(false), timeoutMs);
    socket.once('connect', () => {
      clearTimeout(timer);
      resolve(true);
    });
    socket.once('connect_error', () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}

function waitForEvent(socket, eventName, predicate = () => true, timeoutMs = 7000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      socket.off(eventName, listener);
      resolve({ ok: false, eventName, reason: 'timeout' });
    }, timeoutMs);

    const listener = (payload) => {
      if (!predicate(payload)) {
        return;
      }
      clearTimeout(timer);
      socket.off(eventName, listener);
      resolve({ ok: true, eventName, payload });
    };

    socket.on(eventName, listener);
  });
}

async function main() {
  const results = [];
  const sockets = [];

  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI/MONGO_URI not set in Backend/.env');
    }

    await mongoose.connect(mongoUri);

    const publicUsers = await PublicUser.find({
      verificationStatus: 'verified',
      isActive: true
    })
      .select('_id fullName bloodGroup location')
      .limit(2)
      .lean();

    if (publicUsers.length < 2) {
      throw new Error('Need at least 2 verified PUBLIC_USER accounts to run this test');
    }

    const doctor = await User.findOne({ role: 'doctor' }).select('_id name email role').lean();
    const hospitalAdmin = await User.findOne({ role: 'hospital_admin' }).select('_id name email role').lean();

    if (!doctor) {
      throw new Error('No doctor account found in User collection');
    }
    if (!hospitalAdmin) {
      throw new Error('No hospital_admin account found in User collection');
    }

    const author = publicUsers[0];
    const reactor = publicUsers[1];

    const authorToken = tokenFor(author._id, 'PUBLIC_USER');
    const reactorToken = tokenFor(reactor._id, 'PUBLIC_USER');
    const doctorToken = tokenFor(doctor._id, 'doctor');
    const hospitalToken = tokenFor(hospitalAdmin._id, 'hospital_admin');

    const socketAuthor = connectClient(author._id, 'public_user');
    const socketReactor = connectClient(reactor._id, 'public_user');
    const socketDoctor = connectClient(doctor._id, 'doctor');
    const socketHospital = connectClient(hospitalAdmin._id, 'hospital_admin');
    sockets.push(socketAuthor, socketReactor, socketDoctor, socketHospital);

    const connected = await Promise.all([
      waitForConnect(socketAuthor),
      waitForConnect(socketReactor),
      waitForConnect(socketDoctor),
      waitForConnect(socketHospital)
    ]);
    results.push({ name: 'Socket connect -> author public user', ok: connected[0], detail: connected[0] ? 'connected' : 'not connected' });
    results.push({ name: 'Socket connect -> second public user', ok: connected[1], detail: connected[1] ? 'connected' : 'not connected' });
    results.push({ name: 'Socket connect -> doctor', ok: connected[2], detail: connected[2] ? 'connected' : 'not connected' });
    results.push({ name: 'Socket connect -> hospital admin', ok: connected[3], detail: connected[3] ? 'connected' : 'not connected' });

    if (!connected.every(Boolean)) {
      throw new Error('One or more realtime sockets failed to connect');
    }

    await sleep(300);

    const postTitle = `Realtime Community Test ${Date.now()}`;

    const createdAuthorEvt = waitForEvent(socketAuthor, 'community.post.created', (p) => p && p.title === postTitle);
    const createdReactorEvt = waitForEvent(socketReactor, 'community.post.created', (p) => p && p.title === postTitle);
    const createdDoctorEvt = waitForEvent(socketDoctor, 'community.post.created', (p) => p && p.title === postTitle);
    const createdHospitalEvt = waitForEvent(socketHospital, 'community.post.created', (p) => p && p.title === postTitle);

    const createPost = await api('/community', {
      method: 'POST',
      token: authorToken,
      body: {
        title: postTitle,
        content: 'Checking realtime multi-role propagation and reactions',
        type: 'general',
        urgency: 'high',
        bloodGroup: author.bloodGroup || 'O+',
        location: {
          type: 'Point',
          coordinates: [
            author.location?.coordinates?.[0] || 83.3013,
            author.location?.coordinates?.[1] || 17.7231
          ],
          city: 'Visakhapatnam',
          state: 'Andhra Pradesh'
        }
      }
    });

    const postId = createPost.data?.post?._id;

    results.push({ name: 'POST /api/community', ok: createPost.status === 201 && !!postId, detail: createPost.status });

    const createEvents = await Promise.all([createdAuthorEvt, createdReactorEvt, createdDoctorEvt, createdHospitalEvt]);
    results.push({ name: 'Realtime created -> author public user', ok: createEvents[0].ok, detail: createEvents[0].reason || 'received' });
    results.push({ name: 'Realtime created -> second public user', ok: createEvents[1].ok, detail: createEvents[1].reason || 'received' });
    results.push({ name: 'Realtime created -> doctor', ok: createEvents[2].ok, detail: createEvents[2].reason || 'received' });
    results.push({ name: 'Realtime created -> hospital admin', ok: createEvents[3].ok, detail: createEvents[3].reason || 'received' });

    const likedAuthorEvt = waitForEvent(socketAuthor, 'community.post.liked', (p) => String(p?.postId) === String(postId));
    const likedDoctorEvt = waitForEvent(socketDoctor, 'community.post.liked', (p) => String(p?.postId) === String(postId));

    const likeRes = await api(`/community/${postId}/like`, {
      method: 'POST',
      token: reactorToken
    });

    results.push({ name: 'POST /api/community/:id/like', ok: likeRes.status === 200, detail: likeRes.status });

    const likeEvents = await Promise.all([likedAuthorEvt, likedDoctorEvt]);
    results.push({ name: 'Realtime like -> author', ok: likeEvents[0].ok, detail: likeEvents[0].reason || 'received' });
    results.push({ name: 'Realtime like -> doctor', ok: likeEvents[1].ok, detail: likeEvents[1].reason || 'received' });

    const commentedAuthorEvt = waitForEvent(socketAuthor, 'community.post.commented', (p) => String(p?.postId) === String(postId));
    const commentedHospitalEvt = waitForEvent(socketHospital, 'community.post.commented', (p) => String(p?.postId) === String(postId));

    const commentRes = await api(`/community/${postId}/comment`, {
      method: 'POST',
      token: doctorToken,
      body: { content: 'Doctor reacted: this is a realtime comment test.' }
    });

    results.push({ name: 'POST /api/community/:id/comment', ok: commentRes.status === 200, detail: commentRes.status });

    const commentEvents = await Promise.all([commentedAuthorEvt, commentedHospitalEvt]);
    results.push({ name: 'Realtime comment -> author', ok: commentEvents[0].ok, detail: commentEvents[0].reason || 'received' });
    results.push({ name: 'Realtime comment -> hospital admin', ok: commentEvents[1].ok, detail: commentEvents[1].reason || 'received' });

    const listRes = await api('/community');
    const getByIdRes = await api(`/community/${postId}`);
    const updateStatusRes = await api(`/community/${postId}/status`, {
      method: 'PATCH',
      token: authorToken,
      body: { status: 'resolved' }
    });

    results.push({ name: 'GET /api/community', ok: listRes.status === 200, detail: listRes.status });
    results.push({ name: 'GET /api/community/:id', ok: getByIdRes.status === 200, detail: getByIdRes.status });
    results.push({ name: 'PATCH /api/community/:id/status', ok: updateStatusRes.status === 200, detail: updateStatusRes.status });

    const deleteRes = await api(`/community/${postId}`, {
      method: 'DELETE',
      token: authorToken
    });

    results.push({ name: 'DELETE /api/community/:id', ok: deleteRes.status === 200, detail: deleteRes.status });

    console.log('\n=== COMMUNITY MULTIROLE REALTIME/API CHECK ===');
    for (const item of results) {
      console.log(`${item.ok ? 'PASS' : 'FAIL'} | ${item.name} | ${item.detail}`);
    }

    const passed = results.filter((r) => r.ok).length;
    console.log(`\nTOTAL: ${passed}/${results.length} passed`);

    process.exit(passed === results.length ? 0 : 1);
  } catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
  } finally {
    for (const s of sockets) {
      try {
        s.disconnect();
      } catch (_) {
      }
    }
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  }
}

main();
