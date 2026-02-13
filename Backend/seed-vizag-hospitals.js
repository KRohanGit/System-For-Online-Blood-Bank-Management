/**
 * Seed script to populate Vizag (Visakhapatnam) hospitals for demonstration
 * Run with: node seed-vizag-hospitals.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const HospitalProfile = require('./src/models/HospitalProfile');
const BloodInventory = require('./src/models/BloodInventory');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lifelink';

// Vizag (Visakhapatnam) Hospital Data
const vizagHospitals = [
  {
    email: 'admin@kgh.gov.in',
    password: 'KGH@2026',
    hospitalName: 'King George Hospital (KGH)',
    officialEmail: 'admin@kgh.gov.in',
    licenseNumber: 'AP/VZG/KGH/001',
    adminName: 'Dr. K. Rohan',
    adminEmail: 'dr.k.rohan@kgh.gov.in',
    location: { latitude: 17.7231, longitude: 83.3012 },
    address: 'Maharani Peta, Visakhapatnam, Andhra Pradesh 530002',
    phone: '+91 891 256 2555',
    inventory: { 'A+': 45, 'O+': 38, 'B+': 28, 'AB+': 15, 'A-': 8, 'O-': 12, 'B-': 6, 'AB-': 3 }
  },
  {
    email: 'admin@queenmary.gov.in',
    password: 'QMH@2026',
    hospitalName: 'Queen Mary Hospital',
    officialEmail: 'admin@queenmary.gov.in',
    licenseNumber: 'AP/VZG/QMH/002',
    adminName: 'Dr. L. Gaveshna',
    adminEmail: 'dr.l.gaveshna@queenmary.gov.in',
    location: { latitude: 17.7145, longitude: 83.3089 },
    address: 'Beach Road, Visakhapatnam, Andhra Pradesh 530001',
    phone: '+91 891 256 1234',
    inventory: { 'A+': 22, 'O+': 18, 'B+': 15, 'AB+': 8, 'A-': 4, 'O-': 6, 'B-': 3, 'AB-': 2 }
  },
  {
    email: 'admin@gitam.edu',
    password: 'GITAM@2026',
    hospitalName: 'GITAM Institute of Medical Sciences',
    officialEmail: 'admin@gitam.edu',
    licenseNumber: 'AP/VZG/GITAM/003',
    adminName: 'Dr. G. Giri',
    adminEmail: 'dr.g.giri@gitam.edu',
    location: { latitude: 17.7842, longitude: 83.3776 },
    address: 'Rushikonda, Visakhapatnam, Andhra Pradesh 530045',
    phone: '+91 891 280 5555',
    inventory: { 'A+': 35, 'O+': 30, 'B+': 20, 'AB+': 12, 'A-': 6, 'O-': 8, 'B-': 4, 'AB-': 2 }
  },
  {
    email: 'admin@sevenhills.in',
    password: 'SevenHills@2026',
    hospitalName: 'Seven Hills Hospital',
    officialEmail: 'admin@sevenhills.in',
    licenseNumber: 'AP/VZG/SHH/004',
    adminName: 'Dr. S. Dinesh',
    adminEmail: 'dr.s.dinesh@sevenhills.in',
    location: { latitude: 17.7306, longitude: 83.3185 },
    address: 'Rockdale Layout, Visakhapatnam, Andhra Pradesh 530002',
    phone: '+91 891 278 4444',
    inventory: { 'A+': 18, 'O+': 15, 'B+': 12, 'AB+': 6, 'A-': 3, 'O-': 4, 'B-': 2, 'AB-': 1 }
  },
  {
    email: 'vizag@apollohospitals.com',
    password: 'Apollo@2026',
    hospitalName: 'Apollo Hospitals Visakhapatnam',
    officialEmail: 'vizag@apollohospitals.com',
    licenseNumber: 'AP/VZG/APOLLO/005',
    adminName: 'Dr. K. Rohan',
    adminEmail: 'dr.k.rohan@apollovizag.com',
    location: { latitude: 17.7452, longitude: 83.3142 },
    address: 'Waltair Main Road, Visakhapatnam, Andhra Pradesh 530002',
    phone: '+91 891 254 0000',
    inventory: { 'A+': 28, 'O+': 25, 'B+': 18, 'AB+': 10, 'A-': 5, 'O-': 7, 'B-': 3, 'AB-': 2 }
  },
  {
    email: 'vizag@carehospitals.com',
    password: 'Care@2026',
    hospitalName: 'Care Hospital Visakhapatnam',
    officialEmail: 'vizag@carehospitals.com',
    licenseNumber: 'AP/VZG/CARE/006',
    adminName: 'Dr. S. Dinesh',
    adminEmail: 'dr.s.dinesh@carevizag.com',
    location: { latitude: 17.7398, longitude: 83.3252 },
    address: 'Ramnagar, Visakhapatnam, Andhra Pradesh 530002',
    phone: '+91 891 667 1000',
    inventory: { 'A+': 20, 'O+': 17, 'B+': 14, 'AB+': 7, 'A-': 4, 'O-': 5, 'B-': 2, 'AB-': 1 }
  }
];

async function seedVizagHospitals() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    for (const hospitalData of vizagHospitals) {
      console.log(`\n🏥 Processing ${hospitalData.hospitalName}...`);

      // Check if user already exists
      let user = await User.findOne({ email: hospitalData.email });
      
      if (!user) {
        // Create hospital user account
        user = new User({
          email: hospitalData.email,
          password: hospitalData.password,
          role: 'hospital',
          isVerified: true
        });
        await user.save();
        console.log(`  ✅ Created user account: ${hospitalData.email}`);
      } else {
        console.log(`  ℹ️  User already exists: ${hospitalData.email}`);
      }

      // Check if hospital profile exists
      let profile = await HospitalProfile.findOne({ userId: user._id });
      
      if (!profile) {
        // Create hospital profile
        profile = new HospitalProfile({
          userId: user._id,
          hospitalName: hospitalData.hospitalName,
          officialEmail: hospitalData.officialEmail,
          licenseNumber: hospitalData.licenseNumber,
          licenseFilePath: `/dummy/licenses/${hospitalData.licenseNumber}.pdf`,
          adminName: hospitalData.adminName,
          adminEmail: hospitalData.adminEmail,
          verificationStatus: 'approved',
          verifiedAt: new Date(),
          location: hospitalData.location,
          address: hospitalData.address,
          phone: hospitalData.phone
        });
        await profile.save();
        console.log(`  ✅ Created hospital profile`);
      } else {
        console.log(`  ℹ️  Hospital profile already exists`);
      }

      // Seed blood inventory
      const existingInventory = await BloodInventory.countDocuments({ hospitalId: profile._id });
      
      if (existingInventory === 0) {
        const inventoryDocs = [];
        const collectionDate = new Date();
        collectionDate.setDate(collectionDate.getDate() - 5); // 5 days ago

        for (const [bloodGroup, count] of Object.entries(hospitalData.inventory)) {
          for (let i = 0; i < count; i++) {
            const daysUntilExpiry = bloodGroup.includes('-') ? 30 : 35; // Rare blood slightly shorter shelf life
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + daysUntilExpiry);

            inventoryDocs.push({
              bloodGroup,
              hospitalId: profile._id,
              donorId: null, // Anonymous donors
              collectionDate,
              expiryDate,
              status: 'Available',
              storageType: i % 4 === 0 ? 'Plasma' : i % 4 === 1 ? 'Platelets' : i % 4 === 2 ? 'Red Cells' : 'Whole Blood'
            });
          }
        }

        await BloodInventory.insertMany(inventoryDocs);
        console.log(`  ✅ Added ${inventoryDocs.length} blood inventory units`);
      } else {
        console.log(`  ℹ️  Blood inventory already exists (${existingInventory} units)`);
      }

      console.log(`  🎉 ${hospitalData.hospitalName} setup complete!`);
    }

    console.log('\n' + '='.repeat(60));
    console.log(' All Vizag hospitals seeded successfully!');
    console.log('='.repeat(60));
    console.log('\n Hospital Login Credentials:');
    console.log('─'.repeat(60));
    vizagHospitals.forEach(h => {
      console.log(` ${h.hospitalName}`);
      console.log(`   Email: ${h.email}`);
      console.log(`   Password: ${h.password}`);
      console.log('');
    });
    console.log('─'.repeat(60));

  } catch (error) {
    console.error(' Error: Seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log(' Database connection closed');
    process.exit(0);
  }
}

// Run the seeding
seedVizagHospitals();
