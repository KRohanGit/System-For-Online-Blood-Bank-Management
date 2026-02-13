require('dotenv').config();
const mongoose = require('mongoose');
const HospitalProfile = require('./src/models/HospitalProfile');
const User = require('./src/models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lifelink';

const testHospitals = [
  {
    hospitalName: 'King George Hospital (KGH)',
    coordinates: [83.3012, 17.7231],
    address: 'Maharani Peta, Visakhapatnam',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    phone: '+91 891 256 2555',
    emergencySupport: true
  },
  {
    hospitalName: 'Queen Mary Hospital',
    coordinates: [83.3089, 17.7145],
    address: 'Beach Road, Visakhapatnam',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    phone: '+91 891 256 1234',
    emergencySupport: true
  },
  {
    hospitalName: 'GITAM Medical College',
    coordinates: [83.3776, 17.7842],
    address: 'Rushikonda, Visakhapatnam',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    phone: '+91 891 280 5555',
    emergencySupport: false
  },
  {
    hospitalName: 'Seven Hills Hospital',
    coordinates: [83.3185, 17.7306],
    address: 'Rockdale Layout, Visakhapatnam',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    phone: '+91 891 278 4444',
    emergencySupport: true
  },
  {
    hospitalName: 'Apollo Hospitals Vizag',
    coordinates: [83.3142, 17.7452],
    address: 'Waltair Main Road, Visakhapatnam',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    phone: '+91 891 254 0000',
    emergencySupport: true
  },
  {
    hospitalName: 'Care Hospital Visakhapatnam',
    coordinates: [83.3252, 17.7398],
    address: 'Ramnagar, Visakhapatnam',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    phone: '+91 891 667 1000',
    emergencySupport: true
  },
  {
    hospitalName: 'Visakha Institute of Medical Sciences',
    coordinates: [83.2985, 17.7102],
    address: 'Asilmetta Junction, Visakhapatnam',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    phone: '+91 891 255 7779',
    emergencySupport: false
  },
  {
    hospitalName: 'Government Hospital for Mental Care',
    coordinates: [83.3134, 17.7284],
    address: 'Pedda Waltair, Visakhapatnam',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    phone: '+91 891 256 8432',
    emergencySupport: false
  },
  {
    hospitalName: 'Ramesh Hospitals',
    coordinates: [83.3201, 17.7191],
    address: 'Vijaya Rama Raju Road, Visakhapatnam',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    phone: '+91 891 256 8999',
    emergencySupport: true
  },
  {
    hospitalName: 'Medicover Hospitals',
    coordinates: [83.3298, 17.7367],
    address: 'NH-16, Madhurawada, Visakhapatnam',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    phone: '+91 891 304 0100',
    emergencySupport: false
  },
  {
    hospitalName: 'Indus Hospitals',
    coordinates: [83.3165, 17.7218],
    address: 'Seethammapeta, Visakhapatnam',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    phone: '+91 891 673 5555',
    emergencySupport: true
  },
  {
    hospitalName: 'GSL Medical College',
    coordinates: [83.2894, 17.7045],
    address: 'NH-16, Rajahmundry Road, Visakhapatnam',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    phone: '+91 891 289 5000',
    emergencySupport: false
  }
];

async function seedGeoHospitals() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const adminUser = await User.findOne({ role: 'hospital_admin' });
    if (!adminUser) {
      console.log('⚠️  No hospital admin found. Creating dummy admin...');
      const dummyAdmin = await User.create({
        email: 'geo_admin@test.com',
        password: '$2a$12$dummyHashForDemo',
        role: 'hospital_admin'
      });
      console.log('✅ Created dummy admin\n');
    }

    const userId = adminUser ? adminUser._id : (await User.findOne({ role: 'hospital_admin' }))._id;

    console.log('🏥 Seeding hospitals with GeoJSON coordinates...\n');

    for (const hospital of testHospitals) {
      const existing = await HospitalProfile.findOne({ hospitalName: hospital.hospitalName });
      
      if (existing) {
        await HospitalProfile.updateOne(
          { _id: existing._id },
          {
            $set: {
              location: {
                type: 'Point',
                coordinates: hospital.coordinates
              },
              address: hospital.address,
              city: hospital.city,
              state: hospital.state,
              phone: hospital.phone,
              emergencySupport: hospital.emergencySupport,
              verificationStatus: 'approved'
            }
          }
        );
        console.log(`✅ Updated: ${hospital.hospitalName} at [${hospital.coordinates}]`);
      } else {
        await HospitalProfile.create({
          userId: userId,
          hospitalName: hospital.hospitalName,
          officialEmail: `${hospital.hospitalName.toLowerCase().replace(/\s/g, '')}@hospital.com`,
          licenseNumber: `LIC${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          licenseFilePath: '/dummy/license.pdf',
          adminName: 'Admin',
          adminEmail: `admin@${hospital.hospitalName.toLowerCase().replace(/\s/g, '')}.com`,
          location: {
            type: 'Point',
            coordinates: hospital.coordinates
          },
          address: hospital.address,
          city: hospital.city,
          state: hospital.state,
          phone: hospital.phone,
          emergencySupport: hospital.emergencySupport,
          verificationStatus: 'approved'
        });
        console.log(`✅ Created: ${hospital.hospitalName} at [${hospital.coordinates}]`);
      }
    }

    console.log(`\n✅ Successfully seeded ${testHospitals.length} hospitals in Visakhapatnam!`);
    console.log('\n📍 Test location:');
    console.log('  - Visakhapatnam: 17.7231, 83.3012');
    console.log('\n🌐 Navigate to: http://localhost:3000/geo-intelligence');
    console.log('🔍 Use "Detect My Location" or click "Visakhapatnam" quick test button');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

seedGeoHospitals();
