/**
 * Seed Geolocation Data for Blood Bank System
 * 
 * Purpose: Create realistic hospital and blood camp data with proper geolocation
 * for demonstration and testing of geolocation intelligence features
 * 
 * Usage: node seed-geolocation-data.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const HospitalProfile = require('./src/models/HospitalProfile');
const BloodCamp = require('./src/models/BloodCamp');
const bcrypt = require('bcryptjs');

// Sample hospital locations across major Indian cities
const hospitalData = [
  // Hyderabad
  {
    hospitalName: 'Apollo Hospitals Jubilee Hills',
    city: 'Hyderabad',
    state: 'Telangana',
    coordinates: [78.4089, 17.4326], // [longitude, latitude]
    emergencySupport: true,
    phone: '+91-40-2360-7777',
    address: 'Road No. 72, Jubilee Hills'
  },
  {
    hospitalName: 'Care Hospitals Banjara Hills',
    city: 'Hyderabad',
    state: 'Telangana',
    coordinates: [78.4305, 17.4173],
    emergencySupport: true,
    phone: '+91-40-6165-6565',
    address: 'Road No. 1, Banjara Hills'
  },
  {
    hospitalName: 'Yashoda Hospitals Secunderabad',
    city: 'Hyderabad',
    state: 'Telangana',
    coordinates: [78.5003, 17.4401],
    emergencySupport: false,
    phone: '+91-40-4455-5000',
    address: 'Alexander Road, Secunderabad'
  },
  {
    hospitalName: 'Continental Hospitals Gachibowli',
    city: 'Hyderabad',
    state: 'Telangana',
    coordinates: [78.3606, 17.4404],
    emergencySupport: true,
    phone: '+91-40-6700-0000',
    address: 'IT Park Road, Gachibowli'
  },
  
  // Visakhapatnam
  {
    hospitalName: 'Seven Hills Hospital',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    coordinates: [83.2978, 17.7238],
    emergencySupport: true,
    phone: '+91-891-662-2222',
    address: 'Rockdale Layout, Visakhapatnam'
  },
  {
    hospitalName: 'KIMS ICON Hospital',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    coordinates: [83.3223, 17.7311],
    emergencySupport: true,
    phone: '+91-891-304-4444',
    address: 'Gurudwara Junction, MVP Colony'
  },
  {
    hospitalName: 'Queen\'s NRI Hospital',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    coordinates: [83.2951, 17.7306],
    emergencySupport: false,
    phone: '+91-891-660-3456',
    address: 'Seethammadhara, Visakhapatnam'
  },
  
  // Bangalore
  {
    hospitalName: 'Manipal Hospital Whitefield',
    city: 'Bangalore',
    state: 'Karnataka',
    coordinates: [77.7499, 12.9899],
    emergencySupport: true,
    phone: '+91-80-4696-9696',
    address: 'ITPL Main Road, Whitefield'
  },
  {
    hospitalName: 'Fortis Hospital Bannerghatta',
    city: 'Bangalore',
    state: 'Karnataka',
    coordinates: [77.5814, 12.8901],
    emergencySupport: true,
    phone: '+91-80-6621-4444',
    address: 'Bannerghatta Road'
  },
  {
    hospitalName: 'Columbia Asia Hebbal',
    city: 'Bangalore',
    state: 'Karnataka',
    coordinates: [77.5993, 13.0429],
    emergencySupport: false,
    phone: '+91-80-4129-7000',
    address: 'Hebbal, Bangalore'
  },
  
  // Mumbai
  {
    hospitalName: 'Lilavati Hospital Bandra',
    city: 'Mumbai',
    state: 'Maharashtra',
    coordinates: [72.8347, 19.0544],
    emergencySupport: true,
    phone: '+91-22-2640-5000',
    address: 'A-791, Bandra Reclamation'
  },
  {
    hospitalName: 'Kokilaben Dhirubhai Ambani Hospital',
    city: 'Mumbai',
    state: 'Maharashtra',
    coordinates: [72.8333, 19.1348],
    emergencySupport: true,
    phone: '+91-22-6926-6999',
    address: 'Andheri West, Mumbai'
  },
  
  // Delhi
  {
    hospitalName: 'Fortis Escort Heart Institute',
    city: 'New Delhi',
    state: 'Delhi',
    coordinates: [77.2167, 28.5833],
    emergencySupport: true,
    phone: '+91-11-4713-5000',
    address: 'Okhla Road, New Delhi'
  },
  {
    hospitalName: 'Max Super Speciality Saket',
    city: 'New Delhi',
    state: 'Delhi',
    coordinates: [77.2144, 28.5244],
    emergencySupport: true,
    phone: '+91-11-2651-5050',
    address: 'Press Enclave Marg, Saket'
  },
  
  // Pune
  {
    hospitalName: 'Ruby Hall Clinic',
    city: 'Pune',
    state: 'Maharashtra',
    coordinates: [73.8436, 18.5018],
    emergencySupport: true,
    phone: '+91-20-2616-5757',
    address: 'Sassoon Road, Pune'
  },
  {
    hospitalName: 'Sahyadri Hospital Deccan',
    city: 'Pune',
    state: 'Maharashtra',
    coordinates: [73.8291, 18.5165],
    emergencySupport: false,
    phone: '+91-20-6745-0000',
    address: 'Deccan Gymkhana, Pune'
  }
];

// Blood camp data
const bloodCampData = [
  {
    campName: 'Save Lives Blood Donation Drive',
    city: 'Hyderabad',
    state: 'Telangana',
    coordinates: [78.4867, 17.3850],
    venueName: 'HITEC City Convention Center',
    address: 'HITEC City, Hyderabad',
    dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    description: 'Large-scale blood donation camp organized in collaboration with local hospitals',
    organizer: 'Red Cross Society'
  },
  {
    campName: 'Corporate Blood Donation Initiative',
    city: 'Bangalore',
    state: 'Karnataka',
    coordinates: [77.6412, 12.9716],
    venueName: 'Manyata Tech Park',
    address: 'Nagavara, Bangalore',
    dateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    description: 'Tech industry blood donation camp for emergency blood requirements',
    organizer: 'Tech4Good Foundation'
  },
  {
    campName: 'Community Health Blood Drive',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    coordinates: [83.3211, 17.7430],
    venueName: 'RK Beach Community Hall',
    address: 'RK Beach Road, Visakhapatnam',
    dateTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
    description: 'Beach side blood donation camp for coastal community',
    organizer: 'Vizag Welfare Society'
  },
  {
    campName: 'University Blood Donation Camp',
    city: 'Pune',
    state: 'Maharashtra',
    coordinates: [73.8567, 18.5204],
    venueName: 'Pune University Campus',
    address: 'Ganeshkhind, Pune',
    dateTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    description: 'Student-led blood donation initiative for saving lives',
    organizer: 'Students for Humanity'
  },
  {
    campName: 'Mumbai Marathon Blood Drive',
    city: 'Mumbai',
    state: 'Maharashtra',
    coordinates: [72.8258, 18.9388],
    venueName: 'Marine Drive Promenade',
    address: 'Marine Drive, Mumbai',
    dateTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
    description: 'Annual marathon blood donation camp for fitness enthusiasts',
    organizer: 'Mumbai Runners Club'
  }
];

async function seedData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Create hospital users and profiles
    console.log('🏥 Creating hospitals with geolocation data...\n');
    
    for (const hospital of hospitalData) {
      try {
        // Check if hospital already exists
        const existingUser = await User.findOne({ 
          hospitalName: hospital.hospitalName 
        });
        
        if (existingUser) {
          console.log(`⏭️  ${hospital.hospitalName} already exists, skipping...`);
          continue;
        }

        // Create User account
        const hashedPassword = await bcrypt.hash('Hospital@123', 12);
        const user = await User.create({
          email: `${hospital.hospitalName.toLowerCase().replace(/\s+/g, '.')}@hospital.com`,
          password: hashedPassword,
          role: 'HOSPITAL_ADMIN',
          hospitalName: hospital.hospitalName,
          city: hospital.city,
          state: hospital.state,
          address: hospital.address,
          phone: hospital.phone,
          emergencySupport: hospital.emergencySupport,
          location: {
            type: 'Point',
            coordinates: hospital.coordinates
          },
          verificationStatus: 'approved',
          isActive: true
        });

        // Create Hospital Profile
        await HospitalProfile.create({
          userId: user._id,
          hospitalName: hospital.hospitalName,
          officialEmail: user.email,
          licenseNumber: `LIC${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          licenseFilePath: '/demo/license.pdf',
          adminName: `Admin - ${hospital.hospitalName}`,
          adminEmail: user.email,
          verificationStatus: 'approved',
          verifiedAt: new Date(),
          location: {
            latitude: hospital.coordinates[1],
            longitude: hospital.coordinates[0]
          },
          address: hospital.address,
          phone: hospital.phone
        });

        console.log(`✅ Created: ${hospital.hospitalName} (${hospital.city})`);
        console.log(`   📍 Location: ${hospital.coordinates[1]}, ${hospital.coordinates[0]}`);
        console.log(`   🚑 Emergency: ${hospital.emergencySupport ? 'Yes' : 'No'}\n`);
      } catch (error) {
        console.error(`❌ Error creating ${hospital.hospitalName}:`, error.message);
      }
    }

    // Step 2: Create blood camps
    console.log('\n🏕️  Creating blood donation camps...\n');
    
    for (const camp of bloodCampData) {
      try {
        // Find a hospital in the same city to be the organizer
        const organizerHospital = await User.findOne({
          role: 'HOSPITAL_ADMIN',
          city: camp.city
        });

        if (!organizerHospital) {
          console.log(`⚠️  No hospital found in ${camp.city} to organize camp, skipping...`);
          continue;
        }

        // Check if camp already exists
        const existingCamp = await BloodCamp.findOne({
          campName: camp.campName
        });

        if (existingCamp) {
          console.log(`⏭️  ${camp.campName} already exists, skipping...`);
          continue;
        }

        await BloodCamp.create({
          campName: camp.campName,
          description: camp.description,
          organizer: {
            userId: organizerHospital._id,
            userModel: 'User',
            name: camp.organizer,
            type: 'Hospital',
            contactPhone: organizerHospital.phone || '+91-1234567890',
            contactEmail: organizerHospital.email,
            affiliatedHospital: organizerHospital._id
          },
          venue: {
            name: camp.venueName,
            address: camp.address,
            city: camp.city,
            state: camp.state,
            pincode: '500001',
            location: {
              type: 'Point',
              coordinates: camp.coordinates
            },
            type: 'Indoor'
          },
          dateTime: camp.dateTime,
          duration: 6,
          slotsTotal: 100,
          slotsBooked: Math.floor(Math.random() * 30),
          status: 'upcoming',
          isActive: true
        });

        console.log(`✅ Created: ${camp.campName}`);
        console.log(`   📍 Location: ${camp.city}, ${camp.state}`);
        console.log(`   📅 Date: ${camp.dateTime.toDateString()}\n`);
      } catch (error) {
        console.error(`❌ Error creating camp ${camp.campName}:`, error.message);
      }
    }

    // Create indexes for geospatial queries
    console.log('\n📐 Creating geospatial indexes...');
    await User.collection.createIndex({ 'location.coordinates': '2dsphere' });
    await BloodCamp.collection.createIndex({ 'venue.location.coordinates': '2dsphere' });
    console.log('✅ Indexes created successfully');

    console.log('\n✅ Geolocation data seeding completed successfully!');
    console.log('\n📊 Summary:');
    const hospitalCount = await User.countDocuments({ role: 'HOSPITAL_ADMIN' });
    const campCount = await BloodCamp.countDocuments({ isActive: true });
    const emergencyCount = await User.countDocuments({ 
      role: 'HOSPITAL_ADMIN', 
      emergencySupport: true 
    });
    
    console.log(`   🏥 Total Hospitals: ${hospitalCount}`);
    console.log(`   🚑 Emergency Hospitals: ${emergencyCount}`);
    console.log(`   🏕️  Total Blood Camps: ${campCount}`);
    
    console.log('\n🔐 Default Credentials:');
    console.log('   Email: [hospitalname]@hospital.com (lowercase, spaces to dots)');
    console.log('   Password: Hospital@123');
    
    console.log('\n🌍 Test Coordinates:');
    console.log('   Hyderabad: 17.4065, 78.4772');
    console.log('   Visakhapatnam: 17.7231, 83.3012');
    console.log('   Bangalore: 12.9716, 77.5946');
    
  } catch (error) {
    console.error('\n❌ Error seeding data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
}

// Run seeding
seedData();
