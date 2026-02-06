# Three-Layer Hybrid Encryption Architecture

## Blood Bank Management System - Security Documentation

---

## 🎯 Overview

This document explains the **three-layer hybrid encryption architecture** implemented in our blood bank management system to protect sensitive healthcare data including:

- User passwords
- Medical certificates  
- Hospital licenses
- Identity documents
- Digital signatures

---

## 🔐 Architecture Layers

### Layer 1: Password Security (Bcrypt)
**Purpose:** Hash user passwords before storing in database

**Algorithm:** bcrypt  
**Salt Rounds:** 12  
**Key Length:** N/A (adaptive hashing)

**Why Bcrypt?**
- Specifically designed for password hashing
- Built-in salt generation prevents rainbow table attacks
- Adaptive: can increase salt rounds as computing power grows
- Intentionally slow to prevent brute-force attacks

**Implementation:**
- Location: `/Backend/src/utils/bcryptUtils.js`
- Used in: All user models (User, PublicUser)
- Triggers: Pre-save middleware automatically hashes passwords

**MongoDB Storage:**
```javascript
{
  email: "doctor@hospital.com",
  password: "$2a$12$XYZ..." // Bcrypt hashed password
  role: "doctor"
}
```

---

### Layer 2: File Encryption (AES-256)
**Purpose:** Encrypt uploaded documents and files

**Algorithm:** AES-256-CBC  
**Key Length:** 256 bits (32 bytes)  
**IV Length:** 128 bits (16 bytes)  
**Mode:** CBC (Cipher Block Chaining)

**Why AES-256?**
- Industry standard for symmetric encryption
- HIPAA and GDPR compliant
- Fast and efficient for large files
- Each file gets a unique AES key for maximum security

**Implementation:**
- Location: `/Backend/src/utils/aesUtils.js`
- Used in: Document uploads (certificates, ID proofs, signatures)
- Process: Generate random AES key → Encrypt file → Store encrypted data

**MongoDB Storage:**
```javascript
{
  encryptedFileData: "SGVsbG8gV29ybGQ...", // Base64 encrypted file
  encryptionIV: "a1b2c3d4e5f6...", // Hex IV
  encryptionMetadata: {
    algorithm: "aes-256-cbc",
    encryptedAt: ISODate("2026-02-02"),
    originalSize: 245680,
    encryptedSize: 245696
  }
}
```

---

### Layer 3: Key Protection (RSA-2048)
**Purpose:** Encrypt AES keys for secure storage

**Algorithm:** RSA with OAEP padding  
**Key Length:** 2048 bits  
**Padding:** PKCS1_OAEP with SHA-256

**Why RSA?**
- Asymmetric encryption: public key encrypts, private key decrypts
- Perfect for protecting small data (AES keys are only 32 bytes)
- Enables secure key distribution
- Private key never exposed to clients

**Why NOT RSA for Files?**
- RSA is SLOW for large data
- Limited by key size (can't encrypt data larger than key)
- AES is designed for bulk encryption, RSA for key exchange

**Implementation:**
- Location: `/Backend/src/utils/rsaUtils.js`
- Used in: Protecting AES keys before MongoDB storage
- Process: AES key → RSA encrypt → Store encrypted AES key

**MongoDB Storage:**
```javascript
{
  encryptedFileData: "SGVsbG8...", // AES encrypted
  encryptedAESKey: "MIGfMA0GCS...", // RSA encrypted AES key (Base64)
  encryptionIV: "a1b2c3d4...",
  encryptionMetadata: {
    algorithm: "aes-256-cbc",
    rsaKeyLength: 2048,
    rsaPadding: "RSA_PKCS1_OAEP_PADDING"
  }
}
```

---

## 📊 Complete Encryption Flow

### Upload Flow (Doctor Certificate Example)

```
1. Doctor uploads certificate.pdf
   ↓
2. [LAYER 2] Generate random 256-bit AES key
   ↓
3. [LAYER 2] Encrypt file with AES-256-CBC
   Result: encryptedFileData + IV
   ↓
4. [LAYER 3] Encrypt AES key with RSA public key
   Result: encryptedAESKey
   ↓
5. Store in MongoDB:
   - encryptedFileData (Base64)
   - encryptedAESKey (Base64)
   - encryptionIV (Hex)
   - encryptionMetadata (Object)
```

### Retrieval Flow (Authorized Access)

```
1. Admin requests to view certificate
   ↓
2. Fetch from MongoDB:
   - encryptedFileData
   - encryptedAESKey
   - encryptionIV
   ↓
3. [LAYER 3] Decrypt AES key with RSA private key
   Result: Original AES key
   ↓
4. [LAYER 2] Decrypt file with AES key + IV
   Result: Original certificate.pdf
   ↓
5. Send to authorized user
```

---

## 📂 File Structure

```
Backend/src/utils/
├── bcryptUtils.js          # Layer 1: Password hashing
├── aesUtils.js             # Layer 2: File encryption
├── rsaUtils.js             # Layer 3: Key encryption
├── fileEncryptionService.js # Orchestration layer
├── encryption.js           # Legacy (backward compatibility)
├── jwt.js                  # Token generation
└── validation.js           # Input validation
```

---

## 🗄️ MongoDB Visibility

### User Collection (Password Security)
```javascript
{
  "_id": ObjectId("..."),
  "email": "doctor@hospital.com",
  "password": "$2a$12$L3xN9..." // ← Bcrypt hashed (visible in MongoDB)
  "role": "doctor",
  "isVerified": false
}
```

### DoctorProfile Collection (Document Encryption)
```javascript
{
  "_id": ObjectId("..."),
  "userId": ObjectId("..."),
  "fullName": "Dr. John Smith",
  "certificateFilePath": "uploads/certificates/cert_123.pdf",
  
  // ↓ Encryption metadata (visible in MongoDB)
  "encryptedCertificateData": "U2FsdGVkX1+...", // Base64
  "encryptedAESKey": "MIGfMA0GCSqG...", // RSA encrypted (Base64)
  "encryptionIV": "a1b2c3d4e5f6a7b8...", // Hex
  "encryptionMetadata": {
    "algorithm": "aes-256-cbc",
    "rsaKeyLength": 2048,
    "encryptedAt": ISODate("2026-02-02T10:30:00.000Z"),
    "originalSize": 245680,
    "encryptedSize": 245696
  }
}
```

### PublicUser Collection (Multiple Document Encryption)
```javascript
{
  "_id": ObjectId("..."),
  "fullName": "K. Rohan",
  "email": "k.rohan@example.com",
  "password": "$2a$12$xyz...", // ← Bcrypt hashed
  
  // Identity Proof Encryption
  "identityProofEncryption": {
    "encryptedData": "SGVsbG8gV29ybGQ...",
    "encryptedAESKey": "MIGfMA0GCS...",
    "iv": "a1b2c3d4e5f6...",
    "metadata": {
      "algorithm": "aes-256-cbc",
      "encryptedAt": ISODate("2026-02-02")
    }
  },
  
  // Signature Encryption
  "signatureEncryption": {
    "encryptedData": "QXNkZmdoams...",
    "encryptedAESKey": "MIIBIjANBgk...",
    "iv": "b2c3d4e5f6a7...",
    "metadata": {
      "algorithm": "aes-256-cbc",
      "encryptedAt": ISODate("2026-02-02")
    }
  }
}
```

---

## 🔧 Configuration

### Environment Variables (.env)

```env
# JWT Secret (for authentication tokens)
JWT_SECRET=your-jwt-secret-key-here

# Legacy AES encryption secret (backward compatibility)
ENCRYPTION_SECRET=your-32-character-secret-key

# RSA Keys (generate using rsaUtils.generateRSAKeyPair())
RSA_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMIIBIjANBgk...\n-----END PUBLIC KEY-----"
RSA_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBAD...\n-----END PRIVATE KEY-----"

# Optional: Show passwords in MongoDB (for college review only)
SHOW_PASSWORDS=false
```

### Generating RSA Keys

```javascript
// Run this script to generate RSA keys
const { generateRSAKeyPair } = require('./Backend/src/utils/rsaUtils');

const { publicKey, privateKey } = generateRSAKeyPair();

console.log('Add to .env file:');
console.log('RSA_PUBLIC_KEY="' + publicKey.replace(/\n/g, '\\n') + '"');
console.log('RSA_PRIVATE_KEY="' + privateKey.replace(/\n/g, '\\n') + '"');
```

---

## 🧪 Testing Encryption

### Verify System Integrity

```javascript
const { verifyEncryptionSystem } = require('./Backend/src/utils/fileEncryptionService');

// Test all encryption layers
verifyEncryptionSystem().then(success => {
  if (success) {
    console.log('✅ All encryption layers working correctly');
  } else {
    console.log('❌ Encryption system has issues');
  }
});
```

### Check Encryption Status

```javascript
const { getEncryptionStatus } = require('./Backend/src/utils/fileEncryptionService');

const status = getEncryptionStatus();
console.log(JSON.stringify(status, null, 2));
```

---

## 🛡️ Security Best Practices

### ✅ DO:
- Generate new RSA keys for production
- Store private keys securely (never commit to Git)
- Use environment variables for sensitive data
- Rotate RSA keys every 6-12 months
- Log encryption/decryption operations for audit trails
- Validate file types before encryption
- Implement rate limiting on upload endpoints

### ❌ DON'T:
- Hardcode encryption keys in source code
- Use the same AES key for multiple files
- Store plaintext passwords anywhere
- Log sensitive data (passwords, keys)
- Use RSA for bulk file encryption
- Expose private keys to clients
- Skip input validation

---

## 📝 Code Examples

### Doctor Registration with Encryption

```javascript
// Backend/src/controllers/authController.js

const registerDoctor = async (req, res) => {
  // 1. Create user (password automatically hashed by User model)
  const user = new User({
    email: email.toLowerCase(),
    password, // ← Will be bcrypt hashed by pre-save hook
    role: 'doctor'
  });
  await user.save();

  // 2. Encrypt certificate with three-layer encryption
  const fileBuffer = await fs.readFile(req.file.path);
  const encryptionPackage = await processEncryptedUpload(fileBuffer, {
    originalName: req.file.originalname,
    mimeType: req.file.mimetype
  });

  // 3. Save profile with encryption metadata
  const doctorProfile = new DoctorProfile({
    userId: user._id,
    fullName: name,
    encryptedCertificateData: encryptionPackage.encryptedFileData,
    encryptedAESKey: encryptionPackage.encryptedAESKey,
    encryptionIV: encryptionPackage.encryptionIV,
    encryptionMetadata: encryptionPackage.encryptionMetadata
  });
  await doctorProfile.save();
};
```

### Public User Registration with Multiple Files

```javascript
// Backend/src/controllers/publicUserAuth.js

const register = async (req, res) => {
  // 1. Encrypt identity proof
  const identityBuffer = req.files.identityProof[0].buffer;
  const identityEncryption = await processEncryptedUpload(identityBuffer);

  // 2. Encrypt signature
  const signatureBuffer = req.files.signature[0].buffer;
  const signatureEncryption = await processEncryptedUpload(signatureBuffer);

  // 3. Create user with encryption metadata
  const publicUser = new PublicUser({
    fullName,
    email,
    password, // ← Will be bcrypt hashed
    identityProofEncryption: {
      encryptedData: identityEncryption.encryptedFileData,
      encryptedAESKey: identityEncryption.encryptedAESKey,
      iv: identityEncryption.encryptionIV
    },
    signatureEncryption: {
      encryptedData: signatureEncryption.encryptedFileData,
      encryptedAESKey: signatureEncryption.encryptedAESKey,
      iv: signatureEncryption.encryptionIV
    }
  });
  await publicUser.save();
};
```

---

## 🔍 Compliance & Standards

### Healthcare Standards
- **HIPAA Compliant:** AES-256 encryption meets HIPAA requirements
- **GDPR Compliant:** Data encryption at rest and in transit
- **ISO 27001:** Information security management

### Cryptographic Standards
- **NIST Approved:** AES-256 is NIST FIPS 197 approved
- **RSA PKCS#1:** Industry-standard RSA implementation
- **Bcrypt:** OWASP recommended for password hashing

---

## 📞 Support & Maintenance

### Key Rotation Process
1. Generate new RSA key pair
2. Update environment variables
3. Re-encrypt all AES keys with new RSA public key
4. Maintain old private key for legacy data
5. Gradual migration over time

### Troubleshooting

**Issue:** "RSA decryption failed"
- **Cause:** Private key mismatch or corrupted encrypted key
- **Solution:** Verify RSA_PRIVATE_KEY in .env matches the public key used for encryption

**Issue:** "AES decryption failed"  
- **Cause:** Incorrect IV or corrupted encrypted data
- **Solution:** Check MongoDB data integrity, verify IV format (hex string)

**Issue:** "Bcrypt comparison failed"
- **Cause:** Password not properly hashed or salt rounds mismatch
- **Solution:** Ensure User model pre-save hook is running

---

## 📚 References

- [AES Specification (NIST)](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.197.pdf)
- [RSA PKCS#1 Standard](https://tools.ietf.org/html/rfc8017)
- [Bcrypt Algorithm](https://en.wikipedia.org/wiki/Bcrypt)
- [OWASP Password Storage Guide](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

---

**Last Updated:** February 2, 2026  
**Version:** 1.0  
**Maintained By:** CapStone Project Team
