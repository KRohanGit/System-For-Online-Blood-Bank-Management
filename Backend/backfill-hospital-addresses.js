require('dotenv').config();
const mongoose = require('mongoose');
const HospitalProfile = require('./src/models/HospitalProfile');

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
const REQUEST_DELAY_MS = 1100;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === '';
}

function hasValidCoords(coords) {
  if (!Array.isArray(coords) || coords.length !== 2) return false;
  const lon = Number(coords[0]);
  const lat = Number(coords[1]);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return false;
  if (lon === 0 && lat === 0) return false;
  return lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90;
}

function buildAddressString(addressObj, displayName) {
  if (displayName && displayName.trim()) {
    return displayName.trim();
  }

  const parts = [
    addressObj.house_number,
    addressObj.road,
    addressObj.suburb,
    addressObj.city_district,
    addressObj.city || addressObj.town || addressObj.village,
    addressObj.state,
    addressObj.postcode,
    addressObj.country
  ].filter((v) => v && String(v).trim());

  return parts.join(', ');
}

function buildGeoData(payload) {
  const address = payload?.address || {};
  return {
    address: buildAddressString(address, payload?.display_name || ''),
    city: address.city || address.town || address.village || address.county || '',
    state: address.state || '',
    pincode: address.postcode || ''
  };
}

async function reverseGeocode(lat, lon) {
  const params = new URLSearchParams({
    format: 'jsonv2',
    lat: String(lat),
    lon: String(lon),
    addressdetails: '1'
  });

  const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'LifeLink-Backfill/1.0 (hospital-address-backfill)'
    }
  });

  if (!response.ok) {
    throw new Error(`Reverse geocode failed: HTTP ${response.status}`);
  }

  const payload = await response.json();
  return buildGeoData(payload);
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  const hospitals = await HospitalProfile.find({
    $or: [
      { address: { $in: [null, ''] } },
      { city: { $in: [null, ''] } },
      { state: { $in: [null, ''] } },
      { pincode: { $in: [null, ''] } }
    ]
  }).select('hospitalName location address city state pincode').lean();

  console.log(`Found ${hospitals.length} hospital(s) with missing address fields.`);

  const cache = new Map();
  let updated = 0;
  let skippedInvalidCoords = 0;
  let skippedNoNewData = 0;
  let errors = 0;

  for (const hospital of hospitals) {
    const coords = hospital?.location?.coordinates;

    if (!hasValidCoords(coords)) {
      skippedInvalidCoords += 1;
      console.log(`SKIP invalid coords: ${hospital.hospitalName}`);
      continue;
    }

    const lon = Number(coords[0]);
    const lat = Number(coords[1]);
    const cacheKey = `${lat.toFixed(6)},${lon.toFixed(6)}`;

    let geo;
    try {
      if (cache.has(cacheKey)) {
        geo = cache.get(cacheKey);
      } else {
        geo = await reverseGeocode(lat, lon);
        cache.set(cacheKey, geo);
        await sleep(REQUEST_DELAY_MS);
      }
    } catch (error) {
      errors += 1;
      console.log(`ERROR geocoding ${hospital.hospitalName}: ${error.message}`);
      continue;
    }

    const patch = {};
    if (isBlank(hospital.address) && !isBlank(geo.address)) patch.address = geo.address;
    if (isBlank(hospital.city) && !isBlank(geo.city)) patch.city = geo.city;
    if (isBlank(hospital.state) && !isBlank(geo.state)) patch.state = geo.state;
    if (isBlank(hospital.pincode) && !isBlank(geo.pincode)) patch.pincode = geo.pincode;

    if (Object.keys(patch).length === 0) {
      skippedNoNewData += 1;
      console.log(`SKIP no new data: ${hospital.hospitalName}`);
      continue;
    }

    await HospitalProfile.updateOne({ _id: hospital._id }, { $set: patch });
    updated += 1;
    console.log(`UPDATED ${hospital.hospitalName}: ${JSON.stringify(patch)}`);
  }

  console.log('\nBackfill Summary');
  console.log(`updated=${updated}`);
  console.log(`skippedInvalidCoords=${skippedInvalidCoords}`);
  console.log(`skippedNoNewData=${skippedNoNewData}`);
  console.log(`errors=${errors}`);

  await mongoose.connection.close();
}

main().catch(async (error) => {
  console.error('Backfill failed:', error);
  try {
    await mongoose.connection.close();
  } catch (_) {
    // ignore
  }
  process.exit(1);
});
