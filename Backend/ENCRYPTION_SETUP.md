# Encryption Implementation Guide

## Quick Start

### 1. Install Dependencies
```bash
cd Backend
npm install bcryptjs dotenv
```

### 2. Generate RSA Keys
```bash
node setup-encryption.js generate-keys
```

### 3. Add Keys to .env
Copy the generated keys and add to your `.env` file:

```env
# RSA Keys for AES Key Encryption
RSA_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMIIBIjAN...\n-----END PUBLIC KEY-----"
RSA_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQI...\n-----END PRIVATE KEY-----"

# JWT Secret
JWT_SECRET=your-jwt-secret-here

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/blood_bank
```

### 4. Test Encryption System
```bash
# Test all encryption layers
node setup-encryption.js all

# Test specific components
node setup-encryption.js test-bcrypt
node setup-encryption.js test-encryption
node setup-encryption.js status
```

### 5. Start Server
```bash
npm start
```

---

## Architecture Overview

### Three-Layer Hybrid Encryption

```
┌─────────────────────────────────────────────────────┐
│  Layer 1: BCRYPT (Password Hashing)                 │
│  • Salt rounds: 12                                  │
│  • Used for: User passwords                         │
│  • Storage: MongoDB (hashed string)                 │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  Layer 2: AES-256-CBC (File Encryption)             │
│  • Key length: 256 bits                             │
│  • Used for: Documents, certificates, ID proofs     │
│  • Storage: MongoDB (Base64 encrypted data)         │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  Layer 3: RSA-2048 (Key Protection)                 │
│  • Key length: 2048 bits                            │
│  • Used for: Encrypting AES keys                    │
│  • Storage: MongoDB (Base64 encrypted AES key)      │
└─────────────────────────────────────────────────────┘
```

---

## File Structure

```
Backend/
├── src/
│   ├── utils/
│   │   ├── bcryptUtils.js           ← Layer 1: Password hashing
│   │   ├── aesUtils.js              ← Layer 2: File encryption
│   │   ├── rsaUtils.js              ← Layer 3: Key encryption
│   │   └── fileEncryptionService.js ← Orchestration
│   │
│   ├── models/
│   │   ├── User.js                  ← Password hashing (bcrypt)
│   │   ├── PublicUser.js            ← Password + file encryption
│   │   ├── DoctorProfile.js         ← Certificate encryption
│   │   └── HospitalProfile.js       ← License encryption
│   │
│   └── controllers/
│       ├── authController.js        ← Doctor/Hospital registration
│       └── publicUserAuth.js        ← Public user registration
│
├── setup-encryption.js              ← Setup & testing script
├── ENCRYPTION_ARCHITECTURE.md       ← Detailed documentation
└── .env                             ← Configuration (RSA keys)
```

---

## Usage Examples

### Doctor Registration (Certificate Encryption)

**Frontend (React):**
```javascript
const formData = new FormData();
formData.append('email', 'doctor@hospital.com');
formData.append('password', 'SecurePass123!');
formData.append('name', 'Dr. John Smith');
formData.append('hospitalName', 'City Hospital');
formData.append('certificate', certificateFile); // PDF/Image file

const response = await fetch('/api/auth/register-doctor', {
  method: 'POST',
  body: formData
});
```

**Backend Processing:**
1. Password hashed with bcrypt (automatic via User model)
2. Certificate encrypted with AES-256
3. AES key encrypted with RSA
4. All stored in MongoDB with metadata

**MongoDB Result:**
```javascript
// User Collection
{
  email: "doctor@hospital.com",
  password: "$2a$12$XYZ...", // ← Bcrypt hash visible
  role: "doctor"
}

// DoctorProfile Collection
{
  fullName: "Dr. John Smith",
  encryptedCertificateData: "SGVsbG8gV29...", // ← AES encrypted
  encryptedAESKey: "MIGfMA0GCS...",           // ← RSA encrypted
  encryptionIV: "a1b2c3d4e5f6...",            // ← Hex IV
  encryptionMetadata: {
    algorithm: "aes-256-cbc",
    rsaKeyLength: 2048,
    encryptedAt: ISODate("2026-02-02")
  }
}
```

---

### Public User Registration (Multiple File Encryption)

**Frontend (React):**
```javascript
const formData = new FormData();
formData.append('fullName', 'Rohan Kumar');
formData.append('email', 'rohan@example.com');
formData.append('password', 'SecurePass123!');
formData.append('phone', '9876543210');
formData.append('identityProof', idProofFile);
formData.append('signature', signatureFile);

const response = await fetch('/api/public-auth/register', {
  method: 'POST',
  body: formData
});
```

**MongoDB Result:**
```javascript
{
  fullName: "Rohan Kumar",
  email: "rohan@example.com",
  password: "$2a$12$ABC...", // ← Bcrypt hash
  
  identityProofEncryption: {
    encryptedData: "SGVsbG8...",      // ← AES encrypted
    encryptedAESKey: "MIGfMA...",     // ← RSA encrypted
    iv: "a1b2c3d4...",                // ← Hex IV
    metadata: { algorithm: "aes-256-cbc" }
  },
  
  signatureEncryption: {
    encryptedData: "QXNkZmdoa...",    // ← AES encrypted
    encryptedAESKey: "MIIBIjAN...",   // ← RSA encrypted
    iv: "b2c3d4e5...",                // ← Hex IV
    metadata: { algorithm: "aes-256-cbc" }
  }
}
```

---

## MongoDB Visibility Verification

### Check Encrypted Data in MongoDB Compass

1. **Connect to MongoDB:**
   ```
   mongodb://localhost:27017/blood_bank
   ```

2. **Check User Collection:**
   - Look for `password` field
   - Should see: `$2a$12$...` (bcrypt hash)
   - ✅ If you see this, Layer 1 is working!

3. **Check DoctorProfile Collection:**
   - Look for `encryptedCertificateData`
   - Should see: Base64 string (long random characters)
   - Look for `encryptedAESKey`
   - Should see: Base64 string (RSA encrypted)
   - ✅ If you see these, Layers 2 & 3 are working!

4. **Check PublicUser Collection:**
   - Look for `identityProofEncryption` object
   - Should contain: `encryptedData`, `encryptedAESKey`, `iv`
   - ✅ All encryption layers visible!

---

## API Testing with Postman

### 1. Doctor Registration
```
POST http://localhost:5000/api/auth/register-doctor
Content-Type: multipart/form-data

Body (form-data):
- email: doctor@hospital.com
- password: TestPass123!
- name: Dr. John Smith
- hospitalName: City Hospital
- certificate: [Upload PDF file]
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Doctor registration successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1...",
    "user": {
      "id": "65f...",
      "email": "doctor@hospital.com",
      "role": "doctor"
    }
  }
}
```

### 2. Login (Test Password Comparison)
```
POST http://localhost:5000/api/auth/login
Content-Type: application/json

Body:
{
  "email": "doctor@hospital.com",
  "password": "TestPass123!",
  "role": "doctor"
}
```

**Expected:** Login successful (bcrypt comparison works!)

### 3. Check MongoDB
Open MongoDB Compass and verify:
- User document has bcrypt hashed password
- DoctorProfile has encrypted certificate data
- All encryption metadata is visible

---

## Security Checklist

### ✅ Before Deployment

- [ ] Generated unique RSA keys for production
- [ ] Added RSA keys to .env file
- [ ] Tested bcrypt password hashing
- [ ] Tested AES file encryption
- [ ] Tested RSA key encryption
- [ ] Verified MongoDB shows encrypted data
- [ ] Removed any test passwords from code
- [ ] Added .env to .gitignore
- [ ] Tested all registration endpoints
- [ ] Tested all login endpoints
- [ ] Documented encryption architecture

### ✅ Production Best Practices

- [ ] Use strong JWT_SECRET (32+ characters)
- [ ] Rotate RSA keys every 6-12 months
- [ ] Enable MongoDB encryption at rest
- [ ] Use HTTPS for all API calls
- [ ] Implement rate limiting on auth endpoints
- [ ] Add request validation middleware
- [ ] Log all encryption operations (without sensitive data)
- [ ] Regular security audits

---

## Troubleshooting

### Issue: "RSA keys not found in environment"

**Solution:**
```bash
# Generate keys
node setup-encryption.js generate-keys

# Copy output to .env file
# Make sure to use double quotes and \\n for newlines
```

### Issue: "Bcrypt hashing failed"

**Solution:**
```bash
# Make sure bcryptjs is installed
npm install bcryptjs

# Check User model has pre-save hook
# Should be in src/models/User.js
```

### Issue: "File encryption failed"

**Solution:**
```bash
# Test encryption system
node setup-encryption.js test-encryption

# Check console for specific error
# Verify RSA keys are properly formatted in .env
```

### Issue: "MongoDB not showing encrypted data"

**Solution:**
1. Register a new user after implementing encryption
2. Old data won't be encrypted automatically
3. Check if processEncryptedUpload is being called in controllers
4. Verify model schemas have encryption metadata fields

---

## Performance Considerations

### Bcrypt (Layer 1)
- **Speed:** ~100-200ms per hash
- **Impact:** Only during registration/password change
- **Recommendation:** Keep salt rounds at 12

### AES-256 (Layer 2)
- **Speed:** ~1-5ms for typical document (1-5MB)
- **Impact:** During file upload
- **Recommendation:** Optimal for large files

### RSA-2048 (Layer 3)
- **Speed:** ~1-2ms per key encryption
- **Impact:** Only encrypts 32-byte AES keys (fast!)
- **Recommendation:** Perfect for key encryption

### Overall Upload Time
```
1MB certificate upload:
- Original file upload: 100ms
- AES encryption: 2ms
- RSA key encryption: 1ms
- MongoDB save: 50ms
Total: ~153ms (negligible overhead!)
```

---

## Documentation Links

- **Architecture Details:** [ENCRYPTION_ARCHITECTURE.md](./ENCRYPTION_ARCHITECTURE.md)
- **API Documentation:** [API_INTEGRATION_GUIDE.md](./API_INTEGRATION_GUIDE.md)
- **Setup Script:** [setup-encryption.js](./setup-encryption.js)

---

## Support

For issues or questions:
1. Check [ENCRYPTION_ARCHITECTURE.md](./ENCRYPTION_ARCHITECTURE.md)
2. Run `node setup-encryption.js status`
3. Test with `node setup-encryption.js all`

**Last Updated:** February 2, 2026  
**Version:** 1.0
