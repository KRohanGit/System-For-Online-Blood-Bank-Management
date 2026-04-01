require('dotenv').config();
const mongoose = require('mongoose');
const HospitalProfile = require('./src/models/HospitalProfile');

function isInvalidCoordinates(coords) {
  if (!Array.isArray(coords) || coords.length !== 2) return true;

  const lon = Number(coords[0]);
  const lat = Number(coords[1]);

  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return true;
  if (lon === 0 && lat === 0) return true;
  if (lon < -180 || lon > 180) return true;
  if (lat < -90 || lat > 90) return true;

  return false;
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  const hospitals = await HospitalProfile.find({
    verificationStatus: 'approved'
  }).select('hospitalName verificationStatus rejectionReason location').lean();

  const invalid = hospitals.filter((h) => isInvalidCoordinates(h?.location?.coordinates));

  console.log(`Approved hospitals scanned: ${hospitals.length}`);
  console.log(`Invalid-coordinate hospitals found: ${invalid.length}`);

  if (invalid.length === 0) {
    await mongoose.connection.close();
    return;
  }

  for (const h of invalid) {
    const reason = 'Auto-flagged by coordinate cleanup: invalid or placeholder location coordinates.';

    await HospitalProfile.updateOne(
      { _id: h._id },
      {
        $set: {
          verificationStatus: 'pending',
          rejectionReason: reason,
          emergencySupport: false
        }
      }
    );

    console.log(`FLAGGED ${h.hospitalName} (${h._id})`);
  }

  console.log('Cleanup complete. Flagged hospitals are moved to pending until corrected.');

  await mongoose.connection.close();
}

main().catch(async (error) => {
  console.error('Cleanup failed:', error);
  try {
    await mongoose.connection.close();
  } catch (_) {
    // ignore close errors
  }
  process.exit(1);
});
