const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

const getEncryptionKey = () => {
  const secret = process.env.ENCRYPTION_SECRET || 'your-32-character-secret-key!!';
  return crypto.createHash('sha256').update(secret).digest();
};

const encryptFile = (buffer) => {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    return Buffer.concat([iv, encrypted]);
  } catch (error) {
    console.error('Encryption Error:', error.message);
    throw new Error('File encryption failed');
  }
};

const decryptFile = (encryptedBuffer) => {
  try {
    const iv = encryptedBuffer.slice(0, IV_LENGTH);
    const encryptedData = encryptedBuffer.slice(IV_LENGTH);
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
    return decrypted;
  } catch (error) {
    console.error('Decryption Error:', error.message);
    throw new Error('File decryption failed');
  }
};

const encryptText = (text) => {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Text Encryption Error:', error.message);
    throw new Error('Text encryption failed');
  }
};

const decryptText = (encryptedText) => {
  try {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Text Decryption Error:', error.message);
    throw new Error('Text decryption failed');
  }
};

const generateHash = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

module.exports = {
  encryptFile,
  decryptFile,
  encryptText,
  decryptText,
  generateHash
};
