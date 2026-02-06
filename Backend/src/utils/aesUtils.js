const crypto = require('crypto');

// AES Configuration
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // 16 bytes for AES
const KEY_LENGTH = 32; // 32 bytes = 256 bits

const generateAESKey = () => {
  return crypto.randomBytes(KEY_LENGTH);
};

const generateIV = () => {
  return crypto.randomBytes(IV_LENGTH);
};

const encryptFile = (fileBuffer, aesKey = null) => {
  try {
    if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
      throw new Error('Valid file buffer is required for encryption');
    }

    const key = aesKey || generateAESKey();
    const iv = generateIV();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encryptedData = Buffer.concat([
      cipher.update(fileBuffer),
      cipher.final()
    ]);

    return {
      encryptedData,
      aesKey: key,
      iv,
      metadata: {
        algorithm: ALGORITHM,
        ivLength: IV_LENGTH,
        keyLength: KEY_LENGTH,
        encryptedAt: new Date().toISOString(),
        originalSize: fileBuffer.length,
        encryptedSize: encryptedData.length
      }
    };
  } catch (error) {
    console.error('❌ AES Encryption Error:', error.message);
    throw new Error('File encryption failed');
  }
};

/**
 * Decrypt a file using AES-256-CBC
 * @param {Buffer} encryptedData - The encrypted file data
 * @param {Buffer} aesKey - The AES key (decrypted from RSA)
 * @param {Buffer} iv - The initialization vector
 * @returns {Buffer} - The decrypted file data
 * @throws {Error} - If decryption fails
 */
const decryptFile = (encryptedData, aesKey, iv) => {
  try {
    if (!encryptedData || !Buffer.isBuffer(encryptedData)) {
      throw new Error('Valid encrypted data buffer is required');
    }

    if (!aesKey || !Buffer.isBuffer(aesKey) || aesKey.length !== KEY_LENGTH) {
      throw new Error('Valid AES key is required for decryption');
    }

    if (!iv || !Buffer.isBuffer(iv) || iv.length !== IV_LENGTH) {
      throw new Error('Valid IV is required for decryption');
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, aesKey, iv);
    const decryptedData = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final()
    ]);

    return decryptedData;
  } catch (error) {
    console.error('❌ AES Decryption Error:', error.message);
    throw new Error('File decryption failed');
  }
};

const encryptText = (plainText, aesKey = null) => {
  try {
    if (!plainText) {
      throw new Error('Text is required for encryption');
    }

    const key = aesKey || generateAESKey();
    const iv = generateIV();
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      encryptedText: `${iv.toString('hex')}:${encrypted}`,
      aesKey: key,
      iv
    };
  } catch (error) {
    console.error('❌ AES Text Encryption Error:', error.message);
    throw new Error('Text encryption failed');
  }
};

const decryptText = (encryptedText, aesKey) => {
  try {
    if (!encryptedText || !encryptedText.includes(':')) {
      throw new Error('Invalid encrypted text format');
    }

    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];

    const decipher = crypto.createDecipheriv(ALGORITHM, aesKey, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('❌ AES Text Decryption Error:', error.message);
    throw new Error('Text decryption failed');
  }
};

// Legacy function for backward compatibility
const encryptFileLegacy = (buffer) => {
  try {
    const secret = process.env.ENCRYPTION_SECRET || 'your-32-character-secret-key!!';
    const key = crypto.createHash('sha256').update(secret).digest();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    return Buffer.concat([iv, encrypted]);
  } catch (error) {
    console.error('❌ Legacy Encryption Error:', error.message);
    throw new Error('File encryption failed');
  }
};

/**
 * Legacy function for backward compatibility
 * Decrypts file with embedded IV (old format)
 */
const decryptFileLegacy = (encryptedBuffer) => {
  try {
    const secret = process.env.ENCRYPTION_SECRET || 'your-32-character-secret-key!!';
    const key = crypto.createHash('sha256').update(secret).digest();
    const iv = encryptedBuffer.slice(0, IV_LENGTH);
    const encryptedData = encryptedBuffer.slice(IV_LENGTH);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
    return decrypted;
  } catch (error) {
    console.error('❌ Legacy Decryption Error:', error.message);
    throw new Error('File decryption failed');
  }
};

module.exports = {
  generateAESKey,
  generateIV,
  encryptFile,
  decryptFile,
  encryptText,
  decryptText,
  // Legacy functions for backward compatibility
  encryptFileLegacy,
  decryptFileLegacy,
  // Constants
  ALGORITHM,
  IV_LENGTH,
  KEY_LENGTH
};
