/**
 * RSA UTILITY MODULE
 * 
 * PURPOSE: AES Key Protection Layer (Layer 3)
 * 
 * WHY RSA?
 * - Asymmetric encryption: public key encrypts, private key decrypts
 * - Perfect for protecting AES keys (small data, high security)
 * - Public key can be shared; private key stays secure
 * - Enables secure key distribution and management
 * 
 * WHY NOT RSA FOR FILES?
 * - RSA is SLOW for large data (certificates, documents)
 * - Limited by key size (can't encrypt files larger than key size)
 * - AES is designed for bulk encryption, RSA for key exchange
 * 
 * ARCHITECTURE:
 * AES Key (32 bytes) → [RSA Public Key] → Encrypted AES Key → Store in MongoDB
 * Encrypted AES Key → [RSA Private Key] → AES Key → Decrypt File
 * 
 * MONGODB STORAGE:
 * {
 *   encryptedFileData: Buffer,
 *   encryptedAESKey: String (Base64),
 *   iv: String (Hex),
 *   encryptionMetadata: {
 *     algorithm: 'aes-256-cbc',
 *     rsaKeyLength: 2048,
 *     encryptedAt: ISODate
 *   }
 * }
 * 
 * SECURITY:
 * - RSA keys stored in environment variables
 * - Private key NEVER exposed in responses
 * - Keys rotated periodically (recommended every 6-12 months)
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// RSA Configuration
const RSA_KEY_LENGTH = 2048; // 2048-bit RSA keys (standard security)
const RSA_PADDING = crypto.constants.RSA_PKCS1_OAEP_PADDING;

/**
 * Generate RSA key pair (public and private keys)
 * @returns {Object} - { publicKey, privateKey }
 */
const generateRSAKeyPair = () => {
  try {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: RSA_KEY_LENGTH,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    return { publicKey, privateKey };
  } catch (error) {
    console.error('❌ RSA Key Generation Error:', error.message);
    throw new Error('Failed to generate RSA key pair');
  }
};

/**
 * Get RSA keys from environment variables or generate new ones
 * @returns {Object} - { publicKey, privateKey }
 */
const getRSAKeys = () => {
  try {
    let publicKey = process.env.RSA_PUBLIC_KEY;
    let privateKey = process.env.RSA_PRIVATE_KEY;

    // If keys don't exist, generate and save them
    if (!publicKey || !privateKey) {
      console.warn('⚠️ RSA keys not found in environment. Generating new keys...');
      const keys = generateRSAKeyPair();
      publicKey = keys.publicKey;
      privateKey = keys.privateKey;

      // Save to .env file (for development only)
      console.warn('⚠️ Add these keys to your .env file:');
      console.log('RSA_PUBLIC_KEY="' + publicKey.replace(/\n/g, '\\n') + '"');
      console.log('RSA_PRIVATE_KEY="' + privateKey.replace(/\n/g, '\\n') + '"');
    } else {
      // Convert escaped newlines back to actual newlines
      publicKey = publicKey.replace(/\\n/g, '\n');
      privateKey = privateKey.replace(/\\n/g, '\n');
    }

    return { publicKey, privateKey };
  } catch (error) {
    console.error('❌ RSA Key Retrieval Error:', error.message);
    throw new Error('Failed to retrieve RSA keys');
  }
};

/**
 * Encrypt AES key using RSA public key
 * @param {Buffer} aesKey - The AES key to encrypt
 * @param {string} publicKey - Optional RSA public key (PEM format)
 * @returns {string} - Base64 encoded encrypted AES key
 * @throws {Error} - If encryption fails
 */
const encryptAESKey = (aesKey, publicKey = null) => {
  try {
    if (!aesKey || !Buffer.isBuffer(aesKey)) {
      throw new Error('Valid AES key buffer is required');
    }

    // Get RSA public key
    const rsaPublicKey = publicKey || getRSAKeys().publicKey;

    // Encrypt AES key with RSA public key
    const encryptedKey = crypto.publicEncrypt(
      {
        key: rsaPublicKey,
        padding: RSA_PADDING,
        oaepHash: 'sha256'
      },
      aesKey
    );

    // Return as Base64 string for easy storage
    return encryptedKey.toString('base64');
  } catch (error) {
    console.error('❌ RSA Encryption Error:', error.message);
    throw new Error('Failed to encrypt AES key with RSA');
  }
};

/**
 * Decrypt AES key using RSA private key
 * @param {string} encryptedAESKey - Base64 encoded encrypted AES key
 * @param {string} privateKey - Optional RSA private key (PEM format)
 * @returns {Buffer} - The decrypted AES key
 * @throws {Error} - If decryption fails
 */
const decryptAESKey = (encryptedAESKey, privateKey = null) => {
  try {
    if (!encryptedAESKey) {
      throw new Error('Encrypted AES key is required');
    }

    // Get RSA private key
    const rsaPrivateKey = privateKey || getRSAKeys().privateKey;

    // Convert Base64 to Buffer
    const encryptedKeyBuffer = Buffer.from(encryptedAESKey, 'base64');

    // Decrypt AES key with RSA private key
    const decryptedKey = crypto.privateDecrypt(
      {
        key: rsaPrivateKey,
        padding: RSA_PADDING,
        oaepHash: 'sha256'
      },
      encryptedKeyBuffer
    );

    return decryptedKey;
  } catch (error) {
    console.error('❌ RSA Decryption Error:', error.message);
    throw new Error('Failed to decrypt AES key with RSA');
  }
};

/**
 * Encrypt file data with complete encryption metadata
 * Combines AES file encryption + RSA key encryption
 * @param {Buffer} fileBuffer - The file to encrypt
 * @returns {Object} - Complete encryption package for MongoDB storage
 */
const encryptFileWithRSA = (fileBuffer) => {
  try {
    const { encryptFile, generateAESKey } = require('./aesUtils');

    // Generate unique AES key for this file
    const aesKey = generateAESKey();

    // Encrypt file with AES
    const { encryptedData, iv, metadata } = encryptFile(fileBuffer, aesKey);

    // Encrypt AES key with RSA
    const encryptedAESKey = encryptAESKey(aesKey);

    // Return complete package for MongoDB
    return {
      encryptedFileData: encryptedData.toString('base64'),
      encryptedAESKey,
      iv: iv.toString('hex'),
      encryptionMetadata: {
        ...metadata,
        rsaKeyLength: RSA_KEY_LENGTH,
        rsaPadding: 'RSA_PKCS1_OAEP_PADDING',
        oaepHash: 'sha256'
      }
    };
  } catch (error) {
    console.error('❌ Complete File Encryption Error:', error.message);
    throw new Error('Failed to encrypt file with RSA-protected AES key');
  }
};

/**
 * Decrypt file data with RSA-encrypted AES key
 * @param {Object} encryptedPackage - From MongoDB
 * @returns {Buffer} - The decrypted file
 */
const decryptFileWithRSA = (encryptedPackage) => {
  try {
    const { decryptFile } = require('./aesUtils');

    const { encryptedFileData, encryptedAESKey, iv } = encryptedPackage;

    // Decrypt AES key using RSA
    const aesKey = decryptAESKey(encryptedAESKey);

    // Decrypt file using AES
    const fileBuffer = Buffer.from(encryptedFileData, 'base64');
    const ivBuffer = Buffer.from(iv, 'hex');

    return decryptFile(fileBuffer, aesKey, ivBuffer);
  } catch (error) {
    console.error('❌ Complete File Decryption Error:', error.message);
    throw new Error('Failed to decrypt file with RSA-protected AES key');
  }
};

/**
 * Save RSA keys to files (for backup/production deployment)
 * @param {string} directory - Directory to save keys
 */
const saveRSAKeys = (directory = './keys') => {
  try {
    const { publicKey, privateKey } = getRSAKeys();

    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }

    fs.writeFileSync(path.join(directory, 'public_key.pem'), publicKey);
    fs.writeFileSync(path.join(directory, 'private_key.pem'), privateKey);

    console.log('✅ RSA keys saved successfully to', directory);
  } catch (error) {
    console.error('❌ Error saving RSA keys:', error.message);
    throw error;
  }
};

module.exports = {
  generateRSAKeyPair,
  getRSAKeys,
  encryptAESKey,
  decryptAESKey,
  encryptFileWithRSA,
  decryptFileWithRSA,
  saveRSAKeys,
  RSA_KEY_LENGTH
};
