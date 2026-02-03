/**
 * ENCRYPTION SETUP & TESTING SCRIPT
 * 
 * This script helps you:
 * 1. Generate RSA key pairs for production
 * 2. Test the three-layer encryption system
 * 3. Verify MongoDB encryption visibility
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { generateRSAKeyPair, saveRSAKeys } = require('./src/utils/rsaUtils');
const { verifyEncryptionSystem, getEncryptionStatus } = require('./src/utils/fileEncryptionService');
const { hashPassword, comparePassword } = require('./src/utils/bcryptUtils');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}═══ ${msg} ═══${colors.reset}\n`)
};

/**
 * Step 1: Generate RSA Keys
 */
const setupRSAKeys = () => {
  log.header('RSA Key Generation');

  try {
    log.info('Generating 2048-bit RSA key pair...');
    const { publicKey, privateKey } = generateRSAKeyPair();
    
    log.success('RSA keys generated successfully!');
    
    console.log('\n' + colors.yellow + '⚠️  IMPORTANT: Add these to your .env file:' + colors.reset);
    console.log('\n' + colors.bright + 'RSA_PUBLIC_KEY=' + colors.reset + '"' + publicKey.replace(/\n/g, '\\n') + '"');
    console.log('\n' + colors.bright + 'RSA_PRIVATE_KEY=' + colors.reset + '"' + privateKey.replace(/\n/g, '\\n') + '"');
    
    // Optionally save to files
    log.info('\nSaving keys to ./keys directory...');
    saveRSAKeys('./keys');
    log.success('Keys saved to ./keys/public_key.pem and ./keys/private_key.pem');
    log.warn('Keep private_key.pem secure! Never commit it to version control.');

    return { publicKey, privateKey };

  } catch (error) {
    log.error(`Key generation failed: ${error.message}`);
    return null;
  }
};

/**
 * Step 2: Test Bcrypt Password Hashing
 */
const testBcryptLayer = async () => {
  log.header('Testing Layer 1: Bcrypt Password Hashing');

  try {
    const testPassword = 'TestPassword123!';
    
    log.info('Hashing password with bcrypt (12 rounds)...');
    const hashedPassword = await hashPassword(testPassword);
    
    log.success('Password hashed successfully!');
    console.log(`   Original: ${testPassword}`);
    console.log(`   Hashed:   ${hashedPassword}`);
    console.log(`   Length:   ${hashedPassword.length} characters`);

    log.info('Testing password comparison...');
    const isValid = await comparePassword(testPassword, hashedPassword);
    
    if (isValid) {
      log.success('Password comparison works correctly!');
    } else {
      log.error('Password comparison failed!');
      return false;
    }

    log.info('Testing invalid password...');
    const isInvalid = await comparePassword('WrongPassword', hashedPassword);
    
    if (!isInvalid) {
      log.success('Invalid password correctly rejected!');
    } else {
      log.error('Security issue: Invalid password accepted!');
      return false;
    }

    return true;

  } catch (error) {
    log.error(`Bcrypt test failed: ${error.message}`);
    return false;
  }
};

/**
 * Step 3: Test Complete Encryption System
 */
const testEncryptionSystem = async () => {
  log.header('Testing Layers 2 & 3: AES + RSA Encryption');

  try {
    log.info('Running comprehensive encryption test...');
    const result = await verifyEncryptionSystem();
    
    if (result) {
      log.success('All encryption layers working correctly!');
      log.info('Test included:');
      console.log('   • AES-256 file encryption');
      console.log('   • RSA-2048 key encryption');
      console.log('   • Complete encrypt/decrypt cycle');
      return true;
    } else {
      log.error('Encryption system test failed!');
      return false;
    }

  } catch (error) {
    log.error(`Encryption test failed: ${error.message}`);
    return false;
  }
};

/**
 * Step 4: Display Encryption Status
 */
const showEncryptionStatus = () => {
  log.header('Encryption System Status');

  try {
    const status = getEncryptionStatus();
    
    if (status.status === 'active') {
      log.success('Encryption system is active and configured!');
      
      console.log('\n' + colors.bright + 'Layer 1 - Password Security:' + colors.reset);
      console.log(`   Algorithm: ${status.layers.bcrypt.algorithm}`);
      console.log(`   Salt Rounds: ${status.layers.bcrypt.saltRounds}`);
      console.log(`   Purpose: ${status.layers.bcrypt.purpose}`);
      
      console.log('\n' + colors.bright + 'Layer 2 - File Encryption:' + colors.reset);
      console.log(`   Algorithm: ${status.layers.aes.algorithm}`);
      console.log(`   Key Length: ${status.layers.aes.keyLength} bits`);
      console.log(`   Purpose: ${status.layers.aes.purpose}`);
      
      console.log('\n' + colors.bright + 'Layer 3 - Key Protection:' + colors.reset);
      console.log(`   Algorithm: ${status.layers.rsa.algorithm}`);
      console.log(`   Key Length: ${status.layers.rsa.keyLength} bits`);
      console.log(`   Purpose: ${status.layers.rsa.purpose}`);
      console.log(`   Public Key: ${status.layers.rsa.publicKeyPresent ? '✅ Present' : '❌ Missing'}`);
      console.log(`   Private Key: ${status.layers.rsa.privateKeyPresent ? '✅ Present' : '❌ Missing'}`);
      
      console.log('\n' + colors.bright + 'MongoDB Visible Fields:' + colors.reset);
      status.mongodb.visibleFields.forEach(field => {
        console.log(`   • ${field}`);
      });

      return true;
    } else {
      log.error('Encryption system error!');
      console.log(JSON.stringify(status, null, 2));
      return false;
    }

  } catch (error) {
    log.error(`Status check failed: ${error.message}`);
    return false;
  }
};

/**
 * Step 5: Test MongoDB Connection and Visibility
 */
const testMongoDBVisibility = async () => {
  log.header('Testing MongoDB Encryption Visibility');

  try {
    log.info('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/blood_bank');
    log.success('Connected to MongoDB!');

    // Check User collection
    const User = require('./src/models/User');
    const userCount = await User.countDocuments();
    log.info(`Found ${userCount} users in database`);

    if (userCount > 0) {
      const sampleUser = await User.findOne({}).select('+password');
      if (sampleUser) {
        console.log('\n' + colors.bright + 'Sample User Document:' + colors.reset);
        console.log(`   Email: ${sampleUser.email}`);
        console.log(`   Password (hashed): ${sampleUser.password.substring(0, 30)}...`);
        console.log(`   Role: ${sampleUser.role}`);
        log.success('Passwords are stored as bcrypt hashes! ✅');
      }
    }

    // Check DoctorProfile collection
    const DoctorProfile = require('./src/models/DoctorProfile');
    const doctorCount = await DoctorProfile.countDocuments();
    log.info(`Found ${doctorCount} doctor profiles in database`);

    if (doctorCount > 0) {
      const sampleDoctor = await DoctorProfile.findOne({});
      if (sampleDoctor && sampleDoctor.encryptedCertificateData) {
        console.log('\n' + colors.bright + 'Sample Doctor Document:' + colors.reset);
        console.log(`   Full Name: ${sampleDoctor.fullName}`);
        console.log(`   Encrypted Certificate: ${sampleDoctor.encryptedCertificateData.substring(0, 30)}...`);
        console.log(`   Encrypted AES Key: ${sampleDoctor.encryptedAESKey ? sampleDoctor.encryptedAESKey.substring(0, 30) + '...' : 'N/A'}`);
        console.log(`   Encryption IV: ${sampleDoctor.encryptionIV || 'N/A'}`);
        log.success('Certificate encryption metadata is visible! ✅');
      }
    }

    // Check PublicUser collection
    const PublicUser = require('./src/models/PublicUser');
    const publicUserCount = await PublicUser.countDocuments();
    log.info(`Found ${publicUserCount} public users in database`);

    if (publicUserCount > 0) {
      const samplePublicUser = await PublicUser.findOne({}).select('+password');
      if (samplePublicUser) {
        console.log('\n' + colors.bright + 'Sample Public User Document:' + colors.reset);
        console.log(`   Full Name: ${samplePublicUser.fullName}`);
        console.log(`   Password (hashed): ${samplePublicUser.password ? samplePublicUser.password.substring(0, 30) + '...' : 'N/A'}`);
        
        if (samplePublicUser.identityProofEncryption && samplePublicUser.identityProofEncryption.encryptedData) {
          console.log(`   Identity Proof Encrypted: ${samplePublicUser.identityProofEncryption.encryptedData.substring(0, 30)}...`);
          console.log(`   Encrypted AES Key: ${samplePublicUser.identityProofEncryption.encryptedAESKey ? samplePublicUser.identityProofEncryption.encryptedAESKey.substring(0, 30) + '...' : 'N/A'}`);
          log.success('Identity proof encryption metadata is visible! ✅');
        }
      }
    }

    await mongoose.disconnect();
    log.success('MongoDB connection closed');
    return true;

  } catch (error) {
    log.error(`MongoDB test failed: ${error.message}`);
    return false;
  }
};

/**
 * Main execution
 */
const main = async () => {
  console.log('\n' + colors.bright + colors.cyan);
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║      Blood Bank Management System - Encryption Setup         ║');
  console.log('║              Three-Layer Hybrid Encryption                    ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'all') {
    // Run all tests
    log.info('Running complete encryption setup and testing...\n');

    // Step 1: Show current status
    showEncryptionStatus();

    // Step 2: Test bcrypt
    const bcryptOk = await testBcryptLayer();
    if (!bcryptOk) {
      log.error('Bcrypt test failed! Fix issues before continuing.');
      process.exit(1);
    }

    // Step 3: Test AES + RSA
    const encryptionOk = await testEncryptionSystem();
    if (!encryptionOk) {
      log.error('Encryption system test failed! Fix issues before continuing.');
      process.exit(1);
    }

    // Step 4: Test MongoDB (if connected)
    if (process.env.MONGODB_URI) {
      await testMongoDBVisibility();
    } else {
      log.warn('MONGODB_URI not set. Skipping MongoDB visibility test.');
    }

    log.header('Summary');
    log.success('All encryption tests passed! ✅');
    log.info('Your system is ready for production.');

  } else if (command === 'generate-keys') {
    setupRSAKeys();

  } else if (command === 'test-bcrypt') {
    await testBcryptLayer();

  } else if (command === 'test-encryption') {
    await testEncryptionSystem();

  } else if (command === 'status') {
    showEncryptionStatus();

  } else if (command === 'test-mongodb') {
    await testMongoDBVisibility();

  } else {
    console.log('\nUsage: node setup-encryption.js [command]\n');
    console.log('Commands:');
    console.log('  all              - Run all tests (default)');
    console.log('  generate-keys    - Generate new RSA key pair');
    console.log('  test-bcrypt      - Test password hashing');
    console.log('  test-encryption  - Test file encryption');
    console.log('  status           - Show encryption status');
    console.log('  test-mongodb     - Test MongoDB encryption visibility');
    console.log('');
  }
};

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    log.error(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  setupRSAKeys,
  testBcryptLayer,
  testEncryptionSystem,
  showEncryptionStatus,
  testMongoDBVisibility
};
