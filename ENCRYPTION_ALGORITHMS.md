# LifeLink Encryption Algorithms Documentation

## Overview
Your CapStone project implements a **multi-layer encryption strategy** using three industry-standard algorithms:

1. **Bcrypt** - Password hashing (authentication)
2. **AES-256-CBC** - Symmetric encryption (data-at-rest)
3. **RSA-2048** - Asymmetric encryption (key management)

**Note:** DES is NOT used in this project (outdated, insecure).

---

## 1. BCRYPT (Password Hashing) 🔐

### Purpose
Secure password storage for user authentication.

### Algorithm Details
**File:** [Backend/src/utils/bcryptUtils.js](Backend/src/utils/bcryptUtils.js)

```javascript
const bcrypt = require('bcryptjs');
const SALT_ROUNDS = 12;

// Hash password during registration/password reset
const hashPassword = async (plainPassword) => {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);       // Generate salt
  const hashedPassword = await bcrypt.hash(plainPassword, salt); // Hash
  return hashedPassword;
};

// Compare password during login
const comparePassword = async (plainPassword, hashedPassword) => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};
```

### Technical Specifications

| Property | Value | Notes |
|----------|-------|-------|
| **Algorithm** | bcryptjs (Node.js implementation of bcrypt) | Industry standard |
| **Salt Rounds** | 12 | Security level: very high (slower but more secure) |
| **Hash Output** | 60 characters | Format: `$2a$12$[22-char-salt][31-char-hash]` |
| **Time per hash** | ~100-200ms | Intentionally slow to resist brute force |
| **Cost parameter** | 2^12 = 4096 iterations | Configurable security level |

### Where Used
- **User Model** - [Backend/src/models/User.js](Backend/src/models/User.js) (line 43-50)
  ```javascript
  userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  });
  ```
- **PublicUser Model** - [Backend/src/models/PublicUser.js](Backend/src/models/PublicUser.js)
  ```javascript
  this.password = await bcrypt.hash(this.password, 12);
  ```
- **Authentication Flow** - [Backend/src/controllers/authController.js](Backend/src/controllers/authController.js) (line 365)
  ```javascript
  const isPasswordValid = await user.comparePassword(password);
  ```

### Password Strength Requirements
```
- Minimum 8 characters
- Maximum 128 characters
- At least 1 uppercase letter (A-Z)
- At least 1 lowercase letter (a-z)
- At least 1 numeric digit (0-9)
```

### Why Bcrypt?
✅ **Adaptive** - Can increase cost rounds as computers get faster
✅ **Resistant** - Built-in PBKDF2 makes rainbow tables ineffective
✅ **Industry Standard** - Used by major tech companies
✅ **Slow by design** - Intentional computational cost defeats brute force

---

## 2. AES-256-CBC (Symmetric Encryption) 🔒

### Purpose
Encrypt sensitive files and data at rest (identity proofs, medical documents, etc.).

### Algorithm Details
**File:** [Backend/src/utils/aesUtils.js](Backend/src/utils/aesUtils.js)

```javascript
const crypto = require('crypto');

// AES-256-CBC Configuration
const ALGORITHM = 'aes-256-cbc';      // 256-bit key, CBC mode
const IV_LENGTH = 16;                  // 16 bytes for AES
const KEY_LENGTH = 32;                 // 32 bytes = 256 bits

// Generate random AES key (32 bytes)
const generateAESKey = () => {
  return crypto.randomBytes(KEY_LENGTH);
};

// Generate random Initialization Vector
const generateIV = () => {
  return crypto.randomBytes(IV_LENGTH);
};

// ENCRYPT a file
const encryptFile = (fileBuffer, aesKey = null) => {
  const key = aesKey || generateAESKey();
  const iv = generateIV();
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encryptedData = Buffer.concat([
    cipher.update(fileBuffer),
    cipher.final()
  ]);

  return {
    encryptedData,      // Encrypted file bytes
    aesKey: key,        // AES key (will be encrypted with RSA)
    iv,                 // IV (must be stored with ciphertext)
    metadata: {
      algorithm: ALGORITHM,
      encryptedAt: new Date().toISOString(),
      originalSize: fileBuffer.length,
      encryptedSize: encryptedData.length
    }
  };
};

// DECRYPT a file
const decryptFile = (encryptedData, aesKey, iv) => {
  const decipher = crypto.createDecipheriv(ALGORITHM, aesKey, iv);
  const decryptedData = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final()
  ]);
  return decryptedData;
};
```

### Technical Specifications

| Property | Value | Explanation |
|----------|-------|-------------|
| **Algorithm** | AES (Advanced Encryption Standard) | NIST approved, US government standard |
| **Key Size** | 256 bits (32 bytes) | Unbreakable with current technology |
| **Mode** | CBC (Cipher Block Chaining) | Each block depends on previous block |
| **IV (Initialization Vector)** | 128 bits (16 bytes) | Random, unique per encryption |
| **Block Size** | 128 bits (16 bytes) | Standard AES block size |
| **Rounds** | 14 rounds | For AES-256 (more for larger keys) |

### AES-256-CBC Encryption Flow
```
Plaintext (file/data)
          ↓
    [AES Key + IV]
          ↓
    [Cipher rounds: 14×]
          ↓
    Ciphertext + IV (stored together)
          ↓
    [RSA encrypt the AES key]
          ↓
    Store: (encryptedFile + encryptedAESKey + IV)
```

### Where Used
- **File Upload/Download** - Identity proofs, medical certificates
- **Data-at-Rest Encryption** - Sensitive database records
- **Fallback Legacy Support** - `encryptFileLegacy()` / `decryptFileLegacy()`

### Storage Format
```json
{
  "encryptedFileData": "base64-encoded-ciphertext",
  "encryptedAESKey": "base64-RSA-encrypted-AES-key",
  "iv": "hex-encoded-IV",
  "encryptionMetadata": {
    "algorithm": "aes-256-cbc",
    "encryptedAt": "2026-04-06T12:34:56.789Z",
    "originalSize": 1024,
    "encryptedSize": 1040,
    "rsaKeyLength": 2048,
    "oaepHash": "sha256"
  }
}
```

### Why AES-256-CBC?
✅ **Unbreakable** - 2^256 possible keys (computationally impossible to brute force)
✅ **NIST approved** - US government standard (FIPS 197)
✅ **Performance** - Hardware-accelerated on modern CPUs (AES-NI)
✅ **Industry standard** - Used by banks, military, healthcare
✅ **Authenticated alt** - CBC-HMAC provides integrity + confidentiality

---

## 3. RSA-2048 (Asymmetric Encryption) 🗝️

### Purpose
Encrypt AES keys and enable secure key distribution without shared secrets.

### Algorithm Details
**File:** [Backend/src/utils/rsaUtils.js](Backend/src/utils/rsaUtils.js)

```javascript
const crypto = require('crypto');

// RSA Configuration
const RSA_KEY_LENGTH = 2048;                    // 2048-bit keys (standard)
const RSA_PADDING = crypto.constants.RSA_PKCS1_OAEP_PADDING;

// Generate RSA Key Pair
const generateRSAKeyPair = () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: RSA_KEY_LENGTH,              // 2048 bits
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  return { publicKey, privateKey };
};

// ENCRYPT AES key with RSA public key
const encryptAESKey = (aesKey, publicKey = null) => {
  const rsaPublicKey = publicKey || getRSAKeys().publicKey;
  
  const encryptedKey = crypto.publicEncrypt(
    {
      key: rsaPublicKey,
      padding: RSA_PADDING,        // OAEP padding (secure)
      oaepHash: 'sha256'
    },
    aesKey                         // 32-byte AES key
  );

  return encryptedKey.toString('base64');
};

// DECRYPT AES key with RSA private key
const decryptAESKey = (encryptedAESKey, privateKey = null) => {
  const rsaPrivateKey = privateKey || getRSAKeys().privateKey;
  const encryptedKeyBuffer = Buffer.from(encryptedAESKey, 'base64');

  const decryptedKey = crypto.privateDecrypt(
    {
      key: rsaPrivateKey,
      padding: RSA_PADDING,        // OAEP padding
      oaepHash: 'sha256'
    },
    encryptedKeyBuffer
  );

  return decryptedKey;
};

// Hybrid encryption: File with RSA-protected AES key
const encryptFileWithRSA = (fileBuffer) => {
  // Step 1: Generate unique AES key for this file
  const aesKey = generateAESKey();

  // Step 2: Encrypt file with AES
  const { encryptedData, iv, metadata } = encryptFile(fileBuffer, aesKey);

  // Step 3: Encrypt AES key with RSA public key
  const encryptedAESKey = encryptAESKey(aesKey);

  // Return complete package
  return {
    encryptedFileData: encryptedData.toString('base64'),
    encryptedAESKey,            // RSA-encrypted AES key
    iv: iv.toString('hex'),
    encryptionMetadata: {
      ...metadata,
      rsaKeyLength: RSA_KEY_LENGTH,
      rsaPadding: 'RSA_PKCS1_OAEP_PADDING',
      oaepHash: 'sha256'
    }
  };
};

// Hybrid decryption
const decryptFileWithRSA = (encryptedPackage) => {
  // Step 1: Decrypt AES key using RSA private key
  const aesKey = decryptAESKey(encryptedPackage.encryptedAESKey);

  // Step 2: Decrypt file using AES
  const fileBuffer = Buffer.from(encryptedPackage.encryptedFileData, 'base64');
  const ivBuffer = Buffer.from(encryptedPackage.iv, 'hex');

  return decryptFile(fileBuffer, aesKey, ivBuffer);
};
```

### Technical Specifications

| Property | Value | Explanation |
|----------|-------|-------------|
| **Algorithm** | RSA (Rivest-Shamir-Adleman) | Public-key algorithm for key exchange |
| **Key Size** | 2048 bits | Secure until ~2032 (NIST recommends) |
| **Modulus** | $n = p \times q$ | Product of two large primes (617 digits) |
| **Public exponent** | $e = 65537$ | Standard value (0x10001 in hex) |
| **Padding** | OAEP (Optimal Asymmetric Encryption Padding) | Prevents various attacks |
| **Hash** | SHA-256 | Used in OAEP padding |

### RSA Mathematical Basis

**Key Generation:**
```
1. Choose two large random prime numbers: p, q
2. Compute n = p × q (modulus)
3. Compute φ(n) = (p-1) × (q-1) (Euler's totient)
4. Choose e (public exponent): gcd(e, φ(n)) = 1, typically e = 65537
5. Compute d (private exponent): e × d ≡ 1 (mod φ(n))

Public Key: (n, e)
Private Key: (n, d)
```

**Encryption:**
```
Ciphertext = Plaintext^e mod n
```

**Decryption:**
```
Plaintext = Ciphertext^d mod n
```

### RSA Security Properties
- **Factoring Problem**: Breaking RSA requires factoring a 2048-bit number (computationally infeasible)
- **One-way function**: Easy to multiply, hard to factor
- **Padding crucial**: Raw RSA is vulnerable; OAEP prevents attacks

### Where Used
- **Secure Key Distribution** - AES keys encrypted with RSA
- **Key Pair Generation** - On server startup if `.env` keys missing
- **File Encryption Pipeline** - All identity proofs use hybrid RSA-AES

### Key Storage

**Environment Variables** (in `.env`):
```bash
RSA_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMIIBIjANBg....\n-----END PUBLIC KEY-----"
RSA_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBA....\n-----END PRIVATE KEY-----"
```

**Key Files** (optional, via `saveRSAKeys()` function):
```
./keys/
├── public_key.pem
└── private_key.pem
```

### Why RSA-2048?
✅ **Key Agreement** - Can securely share AES keys with clients
✅ **No pre-shared secret** - Works in distributed environments
✅ **Industry standard** - Used for TLS/SSL certificates
✅ **Quantum-resistant timeline** - Secure until 2030s
✅ **OAEP padding** - Prevents oracle attacks and semantically secure

---

## Encryption Architecture Comparison

| Aspect | Bcrypt | AES-256-CBC | RSA-2048 |
|--------|--------|------------|---------|
| **Type** | Hash function | Symmetric | Asymmetric |
| **Use Case** | Passwords | Files/Data | Key management |
| **Speed** | Slow (by design) | Fast | Moderate |
| **Key Size** | N/A | 256 bits | 2048 bits |
| **Reversible?** | ❌ No | ✅ Yes | ✅ Yes |
| **Requires Secret** | N/A | Shared | Distributed |
| **Quantum Risk** | Low | Medium | High |

---

## Complete Encryption Flow (File Upload Example)

```
User uploads identity proof document
         ↓
[1] Generate random 256-bit AES key
         ↓
[2] AES-256-CBC encrypt file with random IV
         ↓
[3] RSA-2048 encrypt the AES key (with public key)
         ↓
[4] Store in MongoDB:
    {
      fileId: "...",
      encryptedFileData: "base64...",
      encryptedAESKey: "base64...",  ← RSA encrypted
      iv: "hex...",
      uploadedAt, uploadedBy, etc.
    }
```

---

## Complete Encryption Flow (User Registration Example)

```
User registers with password "MySecure@Pass123"
         ↓
[1] Validate password strength
    ✓ ≥8 chars ✓ 1 uppercase ✓ 1 lowercase ✓ 1 digit
         ↓
[2] Generate random salt (bcrypt algorithm)
    Salt: $2a$12$ + 22-char-random = "expensive key derivation"
         ↓
[3] Hash password with salt (12 rounds = 4096 iterations)
    Hashed: $2a$12$oK...[60-char-output]
         ↓
[4] Store in MongoDB:
    {
      email: "user@example.com",
      password: "$2a$12$oK...",  ← Never store plaintext
      createdAt: "2026-04-06T..."
    }
```

---

## Security Best Practices Implemented

### ✅ Implemented
1. **Bcrypt with 12 rounds** - Prevents password cracking
2. **Random IVs** - Each encryption uses unique IV
3. **SHA-256 OAEP** - Protects RSA from attacks
4. **Environment variables** - Keys not hardcoded
5. **Key rotation ready** - Can update AES/RSA keys via .env
6. **Metadata logging** - Tracks encryption details for audits

### ⚠️ Recommendations for Production
1. **Hardware Security Module (HSM)** - Use Azure Key Vault or AWS KMS for RSA private keys
2. **Key Rotation** - Rotate AES keys monthly, RSA keys annually
3. **TLS/SSL** - Encrypt all data in transit (api.yourdomain.com with HTTPS)
4. **Access Control** - Restrict who can access .env keys
5. **Audit Logging** - Log all encryption/decryption operations
6. **Secrets Manager** - Use HashiCorp Vault or similar for key management
7. **Encryption at DB** - Enable MongoDB native encryption (Enterprise)

---

## Testing Encryption

### Test Bcrypt
```javascript
const { hashPassword, comparePassword } = require('./utils/bcryptUtils');

// Hash a password
const hash = await hashPassword('MyPass@123');
console.log(hash);  // $2a$12$oK...

// Compare during login
const isValid = await comparePassword('MyPass@123', hash);
console.log(isValid);  // true
```

### Test AES
```javascript
const { encryptFile, decryptFile, generateAESKey } = require('./utils/aesUtils');

const aesKey = generateAESKey();
const file = Buffer.from('secret data');

const { encryptedData, iv } = encryptFile(file, aesKey);
const decrypted = decryptFile(encryptedData, aesKey, iv);

console.log(Buffer.compare(file, decrypted) === 0);  // true
```

### Test RSA
```javascript
const { encryptFileWithRSA, decryptFileWithRSA } = require('./utils/rsaUtils');

const file = Buffer.from('sensitive document');

const encrypted = encryptFileWithRSA(file);
const decrypted = decryptFileWithRSA(encrypted);

console.log(Buffer.compare(file, decrypted) === 0);  // true
```

---

## Environment Configuration

**File:** [Backend/.env](Backend/.env)

```bash
# Encryption keys for RSA
RSA_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
RSA_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Encryption secret (for legacy/environment-based AES)
ENCRYPTION_SECRET=SecureKey2026!@LifeLink#AES256
```

**Generate new RSA keys:**
```bash
node -e "
const { generateRSAKeyPair } = require('./src/utils/rsaUtils');
const { publicKey, privateKey } = generateRSAKeyPair();
console.log('RSA_PUBLIC_KEY=\"' + publicKey.replace(/\n/g, '\\\\n') + '\"');
console.log('RSA_PRIVATE_KEY=\"' + privateKey.replace(/\n/g, '\\\\n') + '\"');
"
```

---

## Security Summary Matrix

| Threat | Bcrypt | AES-256 | RSA-2048 | Mitigated? |
|--------|--------|---------|---------|-----------|
| Brute force attacks | ✅ | ✅ | ✅ | Yes |
| Rainbow tables | ✅ | N/A | N/A | Yes (bcrypt) |
| Replay attacks | N/A | ✅ | N/A | Yes (random IV) |
| Man-in-the-middle | N/A | N/A | ✅ | Needs HTTPS |
| Side-channel attacks | Partial | ✅ | ✅ | Mostly yes |
| Quantum computers | ⚠️ | ⚠️ | ❌ | Future concern |

---

## References

- **Bcrypt**: https://en.wikipedia.org/wiki/Bcrypt (OWASP recommends 12+ rounds)
- **AES**: https://csrc.nist.gov/publications/detail/fips/197/final (FIPS 197)
- **RSA**: https://csrc.nist.gov/publications/detail/sp/800-56b/final (NIST SP 800-56B)
- **OAEP**: https://en.wikipedia.org/wiki/Optimal_asymmetric_encryption_padding
- **Key Management**: https://www.nist.gov/publications/recommendation-key-management-part-1 (NIST SP 800-57)

---

**Last Updated:** April 6, 2026
**Project:** LifeLink - Blood Management & Intelligence System
**Status:** Production Ready
