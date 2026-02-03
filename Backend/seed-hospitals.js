const mongoose = require('mongoose');
const HospitalProfile = require('./src/models/HospitalProfile');
const CommunityPost = require('./src/models/CommunityPost');
require('dotenv').config();

const testHospitals = [
  {
    userId: new mongoose.Types.ObjectId(),
    hospitalName: 'City General Hospital',
    registrationNumber: 'CGH2024001',
    officialEmail: 'official@citygeneralhospital.com',
    licenseNumber: 'LIC-CGH-2024-001',
    licenseFilePath: '/uploads/licenses/cgh-license.pdf',
    adminName: 'Dr. Rajesh Kumar',
    adminEmail: 'admin@citygeneralhospital.com',
    address: 'MG Road, Bangalore',
    city: 'Bangalore',
    state: 'Karnataka',
    pincode: '560001',
    phone: '080-12345678',
    email: 'contact@citygeneralhospital.com',
    location: {
      type: 'Point',
      coordinates: [77.5946, 12.9716]
    },
    emergencyContact: '080-12345679',
    bloodBankAvailable: true,
    approved: true,
    isVerified: true
  },
  {
    userId: new mongoose.Types.ObjectId(),
    hospitalName: 'Apollo Hospitals',
    registrationNumber: 'APL2024002',
    officialEmail: 'official@apolloblr.com',
    licenseNumber: 'LIC-APL-2024-002',
    licenseFilePath: '/uploads/licenses/apollo-license.pdf',
    adminName: 'Dr. Priya Sharma',
    adminEmail: 'admin@apolloblr.com',
    address: 'Madhurawada, Visakhapatnam',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    pincode: '560011',
    phone: '080-23456789',
    email: 'contact@apolloblr.com',
    location: {
      type: 'Point',
      coordinates: [83.3780, 17.7831]
    },
    emergencyContact: '080-23456790',
    bloodBankAvailable: true,
    approved: true,
    isVerified: true
  },
  {
    userId: new mongoose.Types.ObjectId(),
    hospitalName: 'Manipal Hospital',
    registrationNumber: 'MNP2024003',
    officialEmail: 'official@manipalblr.com',
    licenseNumber: 'LIC-MNP-2024-003',
    licenseFilePath: '/uploads/licenses/manipal-license.pdf',
    adminName: 'Dr. Arun Menon',
    adminEmail: 'admin@manipalblr.com',
    address: 'Hanumanthawaka, Visakhapatnam',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    pincode: '560017',
    phone: '080-34567890',
    email: 'contact@manipalblr.com',
    location: {
      type: 'Point',
      coordinates: [83.2833, 17.7500]
    },
    emergencyContact: '080-34567891',
    bloodBankAvailable: true,
    approved: true,
    isVerified: true
  },
  {
    userId: new mongoose.Types.ObjectId(),
    hospitalName: 'Fortis Hospital',
    registrationNumber: 'FRT2024004',
    officialEmail: 'official@fortisblr.com',
    licenseNumber: 'LIC-FRT-2024-004',
    licenseFilePath: '/uploads/licenses/fortis-license.pdf',
    adminName: 'Dr. Meena Iyer',
    adminEmail: 'admin@fortisblr.com',
    address: 'Yendada, Visakhapatnam',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    pincode: '560076',
    phone: '080-45678901',
    email: 'contact@fortisblr.com',
    location: {
      type: 'Point',
      coordinates: [83.3629, 17.7697]
    },
    emergencyContact: '080-45678902',
    bloodBankAvailable: true,
    approved: true,
    isVerified: true
  },
  {
    userId: new mongoose.Types.ObjectId(),
    hospitalName: 'Columbia Asia Hospital',
    registrationNumber: 'COL2024005',
    officialEmail: 'official@columbiaasiawhitefield.com',
    licenseNumber: 'LIC-COL-2024-005',
    licenseFilePath: '/uploads/licenses/columbia-license.pdf',
    adminName: 'Dr. Suresh Reddy',
    adminEmail: 'admin@columbiaasiawhitefield.com',
    address: 'Rushikonda, Visakhapatnam',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    pincode: '560066',
    phone: '080-56789012',
    email: 'contact@columbiaasiawhitefield.com',
    location: {
      type: 'Point',
      coordinates: [83.3850, 17.7860]
    },
    emergencyContact: '080-56789013',
    bloodBankAvailable: true,
    approved: true,
    isVerified: true
  }
];

async function seedHospitals() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    await HospitalProfile.deleteMany({ licenseNumber: { $regex: '^LIC-' } });
    
    const hospitals = await HospitalProfile.insertMany(testHospitals);
    console.log(`Created ${hospitals.length} test hospitals`);
    
    const fullHospitals = await HospitalProfile.find({ _id: { $in: hospitals.map(h => h._id) } });
    
    const posts = fullHospitals.map((hospital, index) => ({
      authorId: hospital._id,
      authorModel: 'HospitalProfile',
      authorName: hospital.hospitalName,
      title: `Urgent: ${['O+', 'A+', 'B+', 'AB+', 'O-'][index]} Blood Needed`,
      content: `We are in urgent need of ${['O+', 'A+', 'B+', 'AB+', 'O-'][index]} blood for emergency surgeries. Please come forward to donate.`,
      type: 'request',
      bloodGroup: ['O+', 'A+', 'B+', 'AB+', 'O-'][index],
      urgency: ['critical', 'high', 'medium', 'high', 'critical'][index],
      location: {
        type: 'Point',
        coordinates: hospital.location?.coordinates || [77.5946, 12.9716],
        address: hospital.address,
        city: hospital.city,
        state: hospital.state
      },
      contactInfo: {
        phone: hospital.emergencyContact,
        email: hospital.email
      },
      status: 'active'
    }));
    
    await CommunityPost.insertMany(posts);
    console.log(`Created ${posts.length} community posts`);
    
    console.log('\nTest hospitals created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding hospitals:', error);
    process.exit(1);
  }
}

seedHospitals();
