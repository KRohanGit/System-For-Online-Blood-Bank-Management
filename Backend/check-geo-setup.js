#!/usr/bin/env node

/**
 * Geolocation Module - Complete Setup & Demo Script
 * 
 * This script will:
 * 1. Verify MongoDB connection
 * 2. Check if seed data exists
 * 3. Create indexes if missing
 * 4. Provide quick test commands
 */

require('dotenv').config();
const mongoose = require('mongoose');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkSetup() {
  try {
    log('\n🔍 GEOLOCATION MODULE - SETUP VERIFICATION\n', 'bold');
    
    // Step 1: MongoDB Connection
    log('Step 1: Checking MongoDB connection...', 'blue');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    log('✅ MongoDB connected successfully\n', 'green');

    // Step 2: Check Collections
    log('Step 2: Checking collections...', 'blue');
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    const hasUsers = collectionNames.includes('users');
    const hasBloodCamps = collectionNames.includes('bloodcamps');
    
    if (hasUsers) {
      log('✅ Users collection exists', 'green');
    } else {
      log('⚠️  Users collection not found', 'yellow');
    }
    
    if (hasBloodCamps) {
      log('✅ BloodCamps collection exists', 'green');
    } else {
      log('⚠️  BloodCamps collection not found', 'yellow');
    }
    console.log('');

    // Step 3: Check Data Count
    log('Step 3: Checking data counts...', 'blue');
    const User = require('./src/models/User');
    const BloodCamp = require('./src/models/BloodCamp');
    
    const hospitalCount = await User.countDocuments({ role: 'HOSPITAL_ADMIN' });
    const campCount = await BloodCamp.countDocuments({ isActive: true });
    
    log(`📊 Hospitals: ${hospitalCount}`, hospitalCount > 0 ? 'green' : 'yellow');
    log(`📊 Blood Camps: ${campCount}`, campCount > 0 ? 'green' : 'yellow');
    
    if (hospitalCount === 0 || campCount === 0) {
      log('\n⚠️  WARNING: No data found! Run seed script:', 'yellow');
      log('   node seed-geolocation-data.js\n', 'bold');
    } else {
      log('✅ Seed data exists\n', 'green');
    }

    // Step 4: Check Indexes
    log('Step 4: Checking geospatial indexes...', 'blue');
    
    const userIndexes = await db.collection('users').indexes();
    const campIndexes = await db.collection('bloodcamps').indexes();
    
    const hasUserGeoIndex = userIndexes.some(idx => 
      idx.key && idx.key['location.coordinates'] === '2dsphere'
    );
    
    const hasCampGeoIndex = campIndexes.some(idx => 
      idx.key && idx.key['venue.location.coordinates'] === '2dsphere'
    );
    
    if (hasUserGeoIndex) {
      log('✅ Users 2dsphere index exists', 'green');
    } else {
      log('⚠️  Users 2dsphere index missing', 'yellow');
      log('   Creating index...', 'blue');
      await db.collection('users').createIndex({ 'location.coordinates': '2dsphere' });
      log('   ✅ Index created', 'green');
    }
    
    if (hasCampGeoIndex) {
      log('✅ BloodCamps 2dsphere index exists', 'green');
    } else {
      log('⚠️  BloodCamps 2dsphere index missing', 'yellow');
      log('   Creating index...', 'blue');
      await db.collection('bloodcamps').createIndex({ 'venue.location.coordinates': '2dsphere' });
      log('   ✅ Index created', 'green');
    }
    console.log('');

    // Step 5: Test Query
    log('Step 5: Testing geospatial query...', 'blue');
    const testLat = 17.4065;
    const testLon = 78.4772;
    const testRadius = 50000; // 50km in meters
    
    const nearbyHospitals = await User.countDocuments({
      role: 'HOSPITAL_ADMIN',
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [testLon, testLat]
          },
          $maxDistance: testRadius
        }
      }
    });
    
    log(`✅ Query successful: Found ${nearbyHospitals} hospitals near Hyderabad`, 'green');
    console.log('');

    // Summary
    log('═══════════════════════════════════════════════', 'bold');
    log('  SETUP STATUS', 'bold');
    log('═══════════════════════════════════════════════', 'bold');
    log(`✅ MongoDB: Connected`, 'green');
    log(`${hospitalCount > 0 ? '✅' : '⚠️ '} Data: ${hospitalCount} hospitals, ${campCount} camps`, hospitalCount > 0 ? 'green' : 'yellow');
    log(`✅ Indexes: Configured`, 'green');
    log(`✅ Queries: Working`, 'green');
    log('═══════════════════════════════════════════════\n', 'bold');

    // Next Steps
    if (hospitalCount === 0) {
      log('📋 NEXT STEPS:', 'bold');
      log('1. Run seed script:', 'blue');
      log('   node seed-geolocation-data.js\n', 'yellow');
    } else {
      log('🎉 READY TO DEMO!', 'bold');
      log('\n📋 DEMO INSTRUCTIONS:', 'blue');
      log('1. Start backend server:', 'blue');
      log('   npm run dev\n', 'yellow');
      log('2. Start frontend (new terminal):', 'blue');
      log('   cd ../frontend');
      log('   npm start\n', 'yellow');
      log('3. Open browser:', 'blue');
      log('   http://localhost:3000/geo-intelligence\n', 'yellow');
      
      log('🧪 TEST API ENDPOINTS:', 'blue');
      log(`curl "http://localhost:5000/api/geolocation/nearby-hospitals?latitude=${testLat}&longitude=${testLon}&radius=10"\n`, 'yellow');
      
      log('📊 SAMPLE LOCATIONS:', 'blue');
      log('   Hyderabad: 17.4065, 78.4772', 'yellow');
      log('   Visakhapatnam: 17.7231, 83.3012', 'yellow');
      log('   Bangalore: 12.9716, 77.5946\n', 'yellow');
    }

  } catch (error) {
    log('\n❌ ERROR:', 'red');
    log(error.message, 'red');
    
    if (error.message.includes('ECONNREFUSED')) {
      log('\n💡 TIP: Make sure MongoDB is running', 'yellow');
    } else if (error.message.includes('MONGO_URI')) {
      log('\n💡 TIP: Check your .env file for MONGO_URI', 'yellow');
    }
    
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    log('🔌 Database connection closed\n', 'blue');
  }
}

// Run the check
checkSetup();
