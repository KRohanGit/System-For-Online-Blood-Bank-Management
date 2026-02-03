/**
 * FILE ENCRYPTION SERVICE
 * 
 * PURPOSE: Orchestrate the three-layer encryption architecture
 * 
 * LAYER 1: Bcrypt - Password hashing (bcryptUtils.js)
 * LAYER 2: AES-256 - File/document encryption (aesUtils.js)
 * LAYER 3: RSA-2048 - AES key encryption (rsaUtils.js)
 * 
 * This service provides high-level functions to:
 * - Process file uploads with automatic encryption
 * - Store encrypted data with metadata in MongoDB
 * - Retrieve and decrypt files for authorized users
 * 
 * MONGODB VISIBILITY:
 * All encrypted data and keys are stored in MongoDB as:
 * - encryptedFileData (Base64 string)
 * - encryptedAESKey (Base64 string - RSA encrypted)
 * - encryptionIV (Hex string)
 * - encryptionMetadata (algorithm, timestamps, sizes)
 */

const fs = require('fs').promises;
const path = require('path');
const { encryptFile, decryptFile, generateAESKey } = require('./aesUtils');
const { encryptAESKey, decryptAESKey, encryptFileWithRSA, decryptFileWithRSA } = require('./rsaUtils');

/**
 * Process and encrypt an uploaded file
 * Returns complete encryption package for MongoDB storage
 * 
 * @param {Buffer} fileBuffer - The uploaded file buffer
 * @param {Object} fileInfo - { originalName, mimeType, fieldName }
 * @returns {Promise<Object>} - Encryption package for MongoDB
 */
const processEncryptedUpload = async (fileBuffer, fileInfo = {}) => {
  try {
    if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
      throw new Error('Valid file buffer is required');
    }

    console.log(`🔒 Encrypting file: ${fileInfo.originalName || 'unknown'}`);

    // Step 1: Generate unique AES key for this file
    const aesKey = generateAESKey();
    console.log('✅ Generated unique AES-256 key');

    // Step 2: Encrypt file with AES
    const { encryptedData, iv, metadata } = encryptFile(fileBuffer, aesKey);
    console.log('✅ File encrypted with AES-256-CBC');

    // Step 3: Encrypt AES key with RSA
    const encryptedAESKey = encryptAESKey(aesKey);
    console.log('✅ AES key encrypted with RSA-2048');

    // Step 4: Prepare MongoDB storage package
    const encryptionPackage = {
      encryptedFileData: encryptedData.toString('base64'),
      encryptedAESKey,
      encryptionIV: iv.toString('hex'),
      encryptionMetadata: {
        algorithm: metadata.algorithm,
        rsaKeyLength: 2048,
        encryptedAt: new Date(),
        originalSize: metadata.originalSize,
        encryptedSize: metadata.encryptedSize,
        originalName: fileInfo.originalName || 'unknown',
        mimeType: fileInfo.mimeType || 'application/octet-stream',
        fieldName: fileInfo.fieldName || 'file'
      }
    };

    console.log('✅ Encryption package ready for MongoDB storage');
    console.log(`   Original size: ${metadata.originalSize} bytes`);
    console.log(`   Encrypted size: ${metadata.encryptedSize} bytes`);

    return encryptionPackage;

  } catch (error) {
    console.error('❌ File Encryption Service Error:', error.message);
    throw new Error('Failed to process encrypted upload');
  }
};

/**
 * Decrypt and retrieve a file from MongoDB
 * 
 * @param {Object} encryptionPackage - From MongoDB document
 * @returns {Promise<Buffer>} - Decrypted file buffer
 */
const retrieveDecryptedFile = async (encryptionPackage) => {
  try {
    if (!encryptionPackage || !encryptionPackage.encryptedFileData) {
      throw new Error('Valid encryption package is required');
    }

    console.log('🔓 Decrypting file from MongoDB...');

    // Step 1: Decrypt AES key using RSA private key
    const aesKey = decryptAESKey(encryptionPackage.encryptedAESKey);
    console.log('✅ AES key decrypted with RSA private key');

    // Step 2: Decrypt file using AES key
    const encryptedData = Buffer.from(encryptionPackage.encryptedFileData, 'base64');
    const iv = Buffer.from(encryptionPackage.encryptionIV, 'hex');
    const decryptedBuffer = decryptFile(encryptedData, aesKey, iv);
    console.log('✅ File decrypted successfully');

    return decryptedBuffer;

  } catch (error) {
    console.error('❌ File Decryption Service Error:', error.message);
    throw new Error('Failed to retrieve decrypted file');
  }
};

/**
 * Save encrypted file to filesystem (backward compatibility)
 * Also returns encryption metadata for MongoDB
 * 
 * @param {Buffer} fileBuffer - The file to encrypt and save
 * @param {string} savePath - Where to save the encrypted file
 * @param {Object} fileInfo - File metadata
 * @returns {Promise<Object>} - { filePath, encryptionMetadata }
 */
const saveEncryptedFile = async (fileBuffer, savePath, fileInfo = {}) => {
  try {
    // Get encryption package
    const encryptionPackage = await processEncryptedUpload(fileBuffer, fileInfo);

    // Ensure directory exists
    const directory = path.dirname(savePath);
    await fs.mkdir(directory, { recursive: true });

    // Convert encrypted data to buffer
    const encryptedBuffer = Buffer.from(encryptionPackage.encryptedFileData, 'base64');

    // Save encrypted file
    await fs.writeFile(savePath, encryptedBuffer);
    console.log(`✅ Encrypted file saved to: ${savePath}`);

    return {
      filePath: savePath,
      encryptionMetadata: {
        encryptedAESKey: encryptionPackage.encryptedAESKey,
        encryptionIV: encryptionPackage.encryptionIV,
        ...encryptionPackage.encryptionMetadata
      }
    };

  } catch (error) {
    console.error('❌ Save Encrypted File Error:', error.message);
    throw new Error('Failed to save encrypted file');
  }
};

/**
 * Load and decrypt file from filesystem (backward compatibility)
 * 
 * @param {string} filePath - Path to encrypted file
 * @param {Object} encryptionMetadata - Metadata with encryptedAESKey and IV
 * @returns {Promise<Buffer>} - Decrypted file buffer
 */
const loadDecryptedFile = async (filePath, encryptionMetadata) => {
  try {
    // Read encrypted file
    const encryptedBuffer = await fs.readFile(filePath);
    
    // Prepare decryption package
    const decryptionPackage = {
      encryptedFileData: encryptedBuffer.toString('base64'),
      encryptedAESKey: encryptionMetadata.encryptedAESKey,
      encryptionIV: encryptionMetadata.encryptionIV
    };

    // Decrypt and return
    return await retrieveDecryptedFile(decryptionPackage);

  } catch (error) {
    console.error('❌ Load Decrypted File Error:', error.message);
    throw new Error('Failed to load decrypted file');
  }
};

/**
 * Verify encryption integrity
 * Encrypts and then decrypts data to ensure system is working
 * 
 * @returns {Promise<boolean>} - True if encryption/decryption works
 */
const verifyEncryptionSystem = async () => {
  try {
    console.log('🔍 Verifying encryption system...');

    // Test data
    const testData = Buffer.from('Blood Bank Management System - Encryption Test');

    // Encrypt
    const encrypted = await processEncryptedUpload(testData, {
      originalName: 'test.txt',
      mimeType: 'text/plain'
    });

    // Decrypt
    const decrypted = await retrieveDecryptedFile(encrypted);

    // Verify
    const success = testData.equals(decrypted);

    if (success) {
      console.log('✅ Encryption system verification PASSED');
    } else {
      console.error('❌ Encryption system verification FAILED');
    }

    return success;

  } catch (error) {
    console.error('❌ Encryption System Verification Error:', error.message);
    return false;
  }
};

/**
 * Get encryption status summary
 * Useful for admin dashboards and debugging
 * 
 * @returns {Object} - System encryption status
 */
const getEncryptionStatus = () => {
  try {
    const { getRSAKeys } = require('./rsaUtils');
    const keys = getRSAKeys();

    return {
      status: 'active',
      layers: {
        bcrypt: {
          algorithm: 'bcrypt',
          saltRounds: 12,
          purpose: 'Password hashing'
        },
        aes: {
          algorithm: 'aes-256-cbc',
          keyLength: 256,
          purpose: 'File encryption'
        },
        rsa: {
          algorithm: 'rsa',
          keyLength: 2048,
          purpose: 'AES key encryption',
          publicKeyPresent: !!keys.publicKey,
          privateKeyPresent: !!keys.privateKey
        }
      },
      mongodb: {
        visibleFields: [
          'password (bcrypt hashed)',
          'encryptedFileData (Base64)',
          'encryptedAESKey (Base64)',
          'encryptionIV (Hex)',
          'encryptionMetadata (Object)'
        ]
      }
    };

  } catch (error) {
    return {
      status: 'error',
      error: error.message
    };
  }
};

module.exports = {
  processEncryptedUpload,
  retrieveDecryptedFile,
  saveEncryptedFile,
  loadDecryptedFile,
  verifyEncryptionSystem,
  getEncryptionStatus
};
