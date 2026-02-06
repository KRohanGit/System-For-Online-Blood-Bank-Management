const mongoose = require('mongoose');
const BloodCamp = require('./src/models/BloodCamp');
const HospitalProfile = require('./src/models/HospitalProfile');
require('dotenv').config();

const seedCamps = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const hospitals = await HospitalProfile.find().limit(3);
    
    if (hospitals.length === 0) {
      console.log('Please seed hospitals first');
      process.exit(1);
    }

    console.log('Found hospitals:', hospitals.map(h => ({ 
      name: h.hospitalName, 
      phone: h.phone, 
      email: h.email 
    })));

    await BloodCamp.deleteMany({});

    const camps = [
      {
        campName: 'Community Blood Drive - Madhurawada',
        description: 'Join us for a community blood donation drive. Help save lives by donating blood. All blood types needed.',
        organizer: {
          userId: hospitals[0]._id,
          userModel: 'HospitalProfile',
          name: hospitals[0].hospitalName || 'City General Hospital',
          type: 'Hospital',
          contactPhone: hospitals[0].phone || hospitals[0].emergencyContact || '080-12345678',
          contactEmail: hospitals[0].email || hospitals[0].officialEmail || 'contact@hospital.com',
          affiliatedHospital: hospitals[0]._id
        },
        venue: {
          name: 'Madhurawada Community Hall',
          address: 'Madhurawada Main Road, Madhurawada',
          city: 'Visakhapatnam',
          state: 'Andhra Pradesh',
          pincode: '530048',
          location: {
            type: 'Point',
            coordinates: [83.3780, 17.7831]
          },
          type: 'Indoor',
          seatingCapacity: 100,
          expectedDonors: 80
        },
        schedule: {
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          startTime: '09:00',
          endTime: '17:00',
          category: 'Community'
        },
        medicalSupport: {
          coordinatingHospital: hospitals[0]._id,
          emergencyContactName: 'Dr. K. Rohan',
          emergencyContactPhone: '9876543210',
          medicalSupportAvailable: true
        },
        facilities: {
          hygieneSanitation: true,
          powerSupply: true,
          screeningArea: true,
          waitingRefreshmentArea: true
        },
        authorization: {
          permissionStatus: 'Approved',
          issuingAuthority: 'BBMP Health Department'
        },
        lifecycle: {
          status: 'Pre-Camp',
          approvalStatus: 'Approved',
          approvedAt: new Date()
        },
        stats: {
          registeredAttendees: 45,
          actualDonors: 0,
          bloodUnitsCollected: 0
        },
        bloodGroupsNeeded: ['O+', 'A+', 'B+', 'AB+']
      },
      {
        campName: 'Corporate Blood Donation - Tech Park',
        description: 'Annual corporate blood donation camp organized by IT companies in Tech Park. Join us in this noble cause.',
        organizer: {
          userId: hospitals[1]._id,
          userModel: 'HospitalProfile',
          name: 'Tech Park Welfare Association',
          type: 'Institution',
          contactPhone: '9988776655',
          contactEmail: 'welfare@techpark.com',
          affiliatedHospital: hospitals[1]._id
        },
        venue: {
          name: 'Tech Park Convention Center',
          address: 'NH16, Gajuwaka',
          city: 'Visakhapatnam',
          state: 'Andhra Pradesh',
          pincode: '530026',
          location: {
            type: 'Point',
            coordinates: [83.2167, 17.7000]
          },
          type: 'Indoor',
          seatingCapacity: 150,
          expectedDonors: 120
        },
        schedule: {
          date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
          startTime: '10:00',
          endTime: '16:00',
          category: 'Corporate'
        },
        medicalSupport: {
          coordinatingHospital: hospitals[1]._id,
          emergencyContactName: 'Dr. L. Gaveshna',
          emergencyContactPhone: '9876543211',
          medicalSupportAvailable: true
        },
        facilities: {
          hygieneSanitation: true,
          powerSupply: true,
          screeningArea: true,
          waitingRefreshmentArea: true
        },
        authorization: {
          permissionStatus: 'Approved',
          issuingAuthority: 'State Blood Transfusion Council'
        },
        lifecycle: {
          status: 'Pre-Camp',
          approvalStatus: 'Approved',
          approvedAt: new Date()
        },
        stats: {
          registeredAttendees: 78,
          actualDonors: 0,
          bloodUnitsCollected: 0
        },
        bloodGroupsNeeded: ['O+', 'O-', 'A+', 'B+']
      },
      {
        campName: 'College Blood Donation Camp',
        description: 'Student-led initiative to organize blood donation camp. Be a hero, donate blood!',
        organizer: {
          userId: hospitals[2]._id,
          userModel: 'HospitalProfile',
          name: 'RV College NSS Unit',
          type: 'Institution',
          contactPhone: '9988776656',
          contactEmail: 'nss@rvcollege.edu',
          affiliatedHospital: hospitals[2]._id
        },
        venue: {
          name: 'RV College Auditorium',
          address: 'Dwaraka Nagar, Visakhapatnam',
          city: 'Visakhapatnam',
          state: 'Andhra Pradesh',
          pincode: '530016',
          location: {
            type: 'Point',
            coordinates: [83.3145, 17.7231]
          },
          type: 'Indoor',
          seatingCapacity: 80,
          expectedDonors: 60
        },
        schedule: {
          date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
          startTime: '09:00',
          endTime: '15:00',
          category: 'College'
        },
        medicalSupport: {
          coordinatingHospital: hospitals[2]._id,
          emergencyContactName: 'Dr. G. Giri',
          emergencyContactPhone: '9876543212',
          medicalSupportAvailable: true
        },
        facilities: {
          hygieneSanitation: true,
          powerSupply: true,
          screeningArea: true,
          waitingRefreshmentArea: true
        },
        authorization: {
          permissionStatus: 'Approved',
          issuingAuthority: 'College Administration'
        },
        lifecycle: {
          status: 'Pre-Camp',
          approvalStatus: 'Approved',
          approvedAt: new Date()
        },
        stats: {
          registeredAttendees: 32,
          actualDonors: 0,
          bloodUnitsCollected: 0
        },
        bloodGroupsNeeded: ['A+', 'B+', 'O+']
      },
      {
        campName: 'Mega Blood Donation Drive - Rushikonda',
        description: 'Large scale blood donation camp with multiple hospitals participating. Urgent need for all blood groups.',
        organizer: {
          userId: hospitals[0]._id,
          userModel: 'HospitalProfile',
          name: 'Rushikonda Blood Bank Consortium',
          type: 'Hospital',
          contactPhone: '9988776657',
          contactEmail: 'rushikonda@bloodbank.org',
          affiliatedHospital: hospitals[0]._id
        },
        venue: {
          name: 'CMR Central',
          address: 'Rushikonda Beach Road',
          city: 'Visakhapatnam',
          state: 'Andhra Pradesh',
          pincode: '530045',
          location: {
            type: 'Point',
            coordinates: [83.3850, 17.7860]
          },
          type: 'Indoor',
          seatingCapacity: 200,
          expectedDonors: 180
        },
        schedule: {
          date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days from now
          startTime: '08:00',
          endTime: '18:00',
          category: 'Voluntary'
        },
        medicalSupport: {
          coordinatingHospital: hospitals[0]._id,
          emergencyContactName: 'Dr. S. Dinesh',
          emergencyContactPhone: '9876543213',
          medicalSupportAvailable: true
        },
        facilities: {
          hygieneSanitation: true,
          powerSupply: true,
          screeningArea: true,
          waitingRefreshmentArea: true
        },
        authorization: {
          permissionStatus: 'Approved',
          issuingAuthority: 'Karnataka State Blood Transfusion Council'
        },
        lifecycle: {
          status: 'Pre-Camp',
          approvalStatus: 'Approved',
          approvedAt: new Date()
        },
        stats: {
          registeredAttendees: 112,
          actualDonors: 0,
          bloodUnitsCollected: 0
        },
        bloodGroupsNeeded: ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']
      },
      {
        campName: 'Annual Blood Camp - MVP Colony 2025',
        description: 'Completed blood donation camp with great success. Thank you to all donors!',
        organizer: {
          userId: hospitals[1]._id,
          userModel: 'HospitalProfile',
          name: hospitals[1].hospitalName || 'Apollo Hospitals',
          type: 'Hospital',
          contactPhone: hospitals[1].phone || hospitals[1].emergencyContact || '080-23456789',
          contactEmail: hospitals[1].email || hospitals[1].officialEmail || 'contact@apolloblr.com',
          affiliatedHospital: hospitals[1]._id
        },
        venue: {
          name: 'MVP Colony Club',
          address: 'Sector 2, MVP Colony',
          city: 'Visakhapatnam',
          state: 'Andhra Pradesh',
          pincode: '530017',
          location: {
            type: 'Point',
            coordinates: [77.6408, 12.9716]
          },
          type: 'Indoor',
          seatingCapacity: 120,
          expectedDonors: 100
        },
        schedule: {
          date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          startTime: '09:00',
          endTime: '17:00',
          category: 'Community'
        },
        medicalSupport: {
          coordinatingHospital: hospitals[1]._id,
          emergencyContactName: 'Dr. L. Gaveshna',
          emergencyContactPhone: '9876543214',
          medicalSupportAvailable: true
        },
        facilities: {
          hygieneSanitation: true,
          powerSupply: true,
          screeningArea: true,
          waitingRefreshmentArea: true
        },
        authorization: {
          permissionStatus: 'Approved',
          issuingAuthority: 'BBMP Health Department'
        },
        lifecycle: {
          status: 'Completed',
          approvalStatus: 'Approved',
          approvedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)
        },
        stats: {
          registeredAttendees: 95,
          actualDonors: 87,
          bloodUnitsCollected: 85
        },
        feedback: [
          {
            userName: 'K. Rohan',
            rating: 5,
            comment: 'Excellent organization! Very smooth process and friendly staff.',
            createdAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000)
          },
          {
            userName: 'L. Gaveshna',
            rating: 5,
            comment: 'Great experience. Will definitely participate again!',
            createdAt: new Date(Date.now() - 27 * 24 * 60 * 60 * 1000)
          },
          {
            userName: 'G. Giri',
            rating: 4,
            comment: 'Good camp. Waiting time was a bit long but overall good.',
            createdAt: new Date(Date.now() - 26 * 24 * 60 * 60 * 1000)
          }
        ],
        bloodGroupsNeeded: ['O+', 'A+', 'B+']
      }
    ];

    const createdCamps = await BloodCamp.insertMany(camps);
    console.log(`✓ Created ${createdCamps.length} blood camps`);
    console.log('Seed completed successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding camps:', error);
    process.exit(1);
  }
};

seedCamps();
