require('dotenv').config();

const BASE_URL = process.env.SMOKE_BASE_URL || process.env.BACKEND_BASE_URL;
const TRANSFER_ID = process.env.TRANSFER_ID || process.argv[2];
const START_LAT = Number(process.env.START_LAT || process.argv[3]);
const START_LNG = Number(process.env.START_LNG || process.argv[4]);
const END_LAT = Number(process.env.END_LAT || process.argv[5]);
const END_LNG = Number(process.env.END_LNG || process.argv[6]);
const STEP_COUNT = Math.max(5, Number(process.env.STEP_COUNT || process.argv[7] || 12));
const STEP_DELAY_MS = Math.max(1000, Number(process.env.STEP_DELAY_MS || 3000));
const TOKEN = process.env.SMOKE_TOKEN || process.env.API_TOKEN || '';

if (!BASE_URL) {
  throw new Error('Missing SMOKE_BASE_URL or BACKEND_BASE_URL environment variable.');
}

if (!TRANSFER_ID || [START_LAT, START_LNG, END_LAT, END_LNG].some((value) => !Number.isFinite(value))) {
  console.error('Usage: node scripts/simulate-delivery-session.js <transferId> <startLat> <startLng> <endLat> <endLng> [stepCount]');
  process.exit(1);
}

function interpolate(start, end, factor) {
  return start + ((end - start) * factor);
}

async function updateLocation(latitude, longitude, status, notes) {
  const response = await fetch(`${BASE_URL}/api/emergency-coordination/transfer/${TRANSFER_ID}/location`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {})
    },
    body: JSON.stringify({ latitude, longitude, status, notes })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || `Update failed with status ${response.status}`);
  }
  return payload;
}

async function runSimulation() {
  console.log(`Starting delivery simulation for transfer ${TRANSFER_ID}`);

  for (let step = 0; step <= STEP_COUNT; step += 1) {
    const factor = step / STEP_COUNT;
    const latitude = Number(interpolate(START_LAT, END_LAT, factor).toFixed(6));
    const longitude = Number(interpolate(START_LNG, END_LNG, factor).toFixed(6));
    const status = step === STEP_COUNT ? 'DELIVERED' : 'IN_TRANSIT';
    const notes = status === 'DELIVERED' ? 'Delivery completed by simulation' : `Simulated GPS update ${step + 1}/${STEP_COUNT + 1}`;

    const result = await updateLocation(latitude, longitude, status, notes);
    console.log(JSON.stringify({ step: step + 1, status, latitude, longitude, eta: result?.deliverySession?.eta ?? null }, null, 2));

    if (step < STEP_COUNT) {
      await new Promise((resolve) => setTimeout(resolve, STEP_DELAY_MS));
    }
  }

  console.log('Delivery simulation complete');
}

runSimulation().catch((error) => {
  console.error('Delivery simulation failed:', error.message || error);
  process.exit(1);
});