require('dotenv').config();
const mongoose = require('mongoose');

async function fixGeolocation() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const col = db.collection('hospitalprofiles');

  // Default Vizag coordinates
  const vizagCoords = [83.3184, 17.7231]; // [lng, lat]
  const geoLoc = { type: 'Point', coordinates: vizagCoords };

  // Fix hospitals with null location
  const r1 = await col.updateMany(
    { location: null },
    { $set: { location: geoLoc } }
  );
  console.log(`Fixed ${r1.modifiedCount} hospitals with null location`);

  // Fix hospitals with {latitude: null, longitude: null}
  const r2 = await col.updateMany(
    { 'location.latitude': null },
    { $set: { location: geoLoc } }
  );
  console.log(`Fixed ${r2.modifiedCount} hospitals with lat/lng null`);

  // Fix hospitals with coordinates [0,0]
  const r3 = await col.updateMany(
    { 'location.coordinates': [0, 0] },
    { $set: { location: { type: 'Point', coordinates: [83.2983, 17.6868] } } }
  );
  console.log(`Fixed ${r3.modifiedCount} hospitals with [0,0] coordinates`);

  // Drop old index if exists
  try { await col.dropIndex('location_2dsphere'); } catch (e) { /* ok */ }

  // Create 2dsphere index
  await col.createIndex({ location: '2dsphere' });
  console.log('Created 2dsphere index on hospitalprofiles.location');

  // Verify
  const hospitals = await col.find({}).project({ hospitalName: 1, location: 1 }).toArray();
  hospitals.forEach(h => console.log(`  ${h.hospitalName}: ${JSON.stringify(h.location)}`));

  await mongoose.disconnect();
  console.log('\nDone!');
}

fixGeolocation().catch(console.error);
