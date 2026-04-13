const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';

function getEncryptionKey() {
  const baseSecret =
    process.env.FIELD_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    'lifelink-default-field-encryption-key';

  return crypto.createHash('sha256').update(baseSecret).digest();
}

function encryptText(value) {
  if (value === null || value === undefined) return value;
  const plaintext = String(value);
  if (!plaintext) return plaintext;

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptText(value) {
  if (value === null || value === undefined) return value;
  const encryptedPayload = String(value);
  if (!encryptedPayload.includes(':')) return encryptedPayload;

  try {
    const [ivHex, encryptedHex] = encryptedPayload.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (error) {
    return encryptedPayload;
  }
}

module.exports = {
  encryptText,
  decryptText
};
