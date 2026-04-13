const { io } = require('socket.io-client');

const BASE = 'http://localhost:5000';
const API = `${BASE}/api`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function loginAdmin() {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@lifelink.com', password: 'Admin@123' })
  });
  const data = await res.json();
  return data.token || data.data?.token;
}

function waitEvent(socket, name, timeout = 7000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeout);
    socket.once(name, () => {
      clearTimeout(timer);
      resolve(true);
    });
  });
}

async function main() {
  const token = await loginAdmin();
  const sPublic = io(BASE, { query: { userId: 'pub-test', role: 'public_user' } });
  const sHospital = io(BASE, { query: { userId: 'hos-test', role: 'hospital_admin' } });
  const sDoctor = io(BASE, { query: { userId: 'doc-test', role: 'doctor' } });

  await sleep(1000);

  const campPublic = waitEvent(sPublic, 'camp.created');
  const campHospital = waitEvent(sHospital, 'camp.created');
  const campDoctor = waitEvent(sDoctor, 'camp.created');

  await fetch(`${API}/blood-camps`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      title: `Realtime camp ${Date.now()}`,
      description: 'socket propagation test',
      dateTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      capacity: 40,
      location: {
        type: 'Point',
        coordinates: [83.3013, 17.7231],
        address: 'MVP',
        city: 'Visakhapatnam',
        state: 'Andhra Pradesh',
        pincode: '530017'
      },
      organizerContact: { phone: '9876543210', email: 'admin@lifelink.com' }
    })
  });

  const campResults = await Promise.all([campPublic, campHospital, campDoctor]);

  const commCreate = waitEvent(sPublic, 'community.post.created');
  const commLike = waitEvent(sPublic, 'community.post.liked');
  const commComment = waitEvent(sPublic, 'community.post.commented');

  const postRes = await fetch(`${API}/community`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      title: `Realtime community ${Date.now()}`,
      content: 'community socket test',
      type: 'general',
      urgency: 'high',
      location: {
        type: 'Point',
        coordinates: [83.3013, 17.7231],
        city: 'Visakhapatnam',
        state: 'Andhra Pradesh'
      }
    })
  });

  const post = await postRes.json();
  const postId = post.post?._id;

  await fetch(`${API}/community/${postId}/like`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });

  await fetch(`${API}/community/${postId}/comment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ content: 'socket comment' })
  });

  const commResults = await Promise.all([commCreate, commLike, commComment]);

  console.log('PASS/FAIL camp.created public:', campResults[0]);
  console.log('PASS/FAIL camp.created hospital:', campResults[1]);
  console.log('PASS/FAIL camp.created doctor:', campResults[2]);
  console.log('PASS/FAIL community.post.created:', commResults[0]);
  console.log('PASS/FAIL community.post.liked:', commResults[1]);
  console.log('PASS/FAIL community.post.commented:', commResults[2]);

  sPublic.disconnect();
  sHospital.disconnect();
  sDoctor.disconnect();

  const allPass = [...campResults, ...commResults].every(Boolean);
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
