const PublicUser = require('../models/PublicUser');
const jwt = require('jsonwebtoken');
const { validatePublicUserRegistration } = require('../utils/validation');
const { processEncryptedUpload } = require('../utils/fileEncryptionService');
const fs = require('fs').promises;
const path = require('path');

const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const register = async (req, res) => {
  try {
    const { fullName, email, phone, password, city, state, bloodGroup } = req.body;

    const validation = validatePublicUserRegistration({ fullName, email, phone, password });
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        errors: validation.errors
      });
    }

    const existingUser = await PublicUser.findOne({
      $or: [{ email }, { phone }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email or phone already registered'
      });
    }

    if (!req.files || !req.files.identityProof) {
      return res.status(400).json({
        success: false,
        message: 'Identity proof is required'
      });
    }

    let encryptedIdentityPath = null;
    let encryptedSignaturePath = null;
    let identityEncryptionData = null;
    let signatureEncryptionData = null;

    // Encrypt identity proof with three-layer encryption
    if (req.files.identityProof) {
      const identityBuffer = req.files.identityProof[0].buffer;
      const identityEncryption = await processEncryptedUpload(identityBuffer, {
        originalName: req.files.identityProof[0].originalname,
        mimeType: req.files.identityProof[0].mimetype,
        fieldName: 'identityProof'
      });

      // Save encrypted file to disk (backward compatibility)
      const identityFilename = `identity_${Date.now()}_${req.files.identityProof[0].originalname}`;
      const identityPath = path.join(__dirname, '../../uploads/identity-proofs', identityFilename);
      await fs.writeFile(identityPath, Buffer.from(identityEncryption.encryptedFileData, 'base64'));
      encryptedIdentityPath = `uploads/identity-proofs/${identityFilename}`;

      // Store encryption metadata for MongoDB
      identityEncryptionData = {
        encryptedData: identityEncryption.encryptedFileData,
        encryptedAESKey: identityEncryption.encryptedAESKey,
        iv: identityEncryption.encryptionIV,
        metadata: identityEncryption.encryptionMetadata
      };
    }

    // Encrypt signature with three-layer encryption
    if (req.files.signature) {
      const signatureBuffer = req.files.signature[0].buffer;
      const signatureEncryption = await processEncryptedUpload(signatureBuffer, {
        originalName: req.files.signature[0].originalname,
        mimeType: req.files.signature[0].mimetype,
        fieldName: 'signature'
      });

      // Save encrypted file to disk (backward compatibility)
      const signatureFilename = `signature_${Date.now()}_${req.files.signature[0].originalname}`;
      const signaturePath = path.join(__dirname, '../../uploads/signatures', signatureFilename);
      await fs.writeFile(signaturePath, Buffer.from(signatureEncryption.encryptedFileData, 'base64'));
      encryptedSignaturePath = `uploads/signatures/${signatureFilename}`;

      // Store encryption metadata for MongoDB
      signatureEncryptionData = {
        encryptedData: signatureEncryption.encryptedFileData,
        encryptedAESKey: signatureEncryption.encryptedAESKey,
        iv: signatureEncryption.encryptionIV,
        metadata: signatureEncryption.encryptionMetadata
      };
    }

    const coordinates = req.body.latitude && req.body.longitude 
      ? [parseFloat(req.body.longitude), parseFloat(req.body.latitude)]
      : [0, 0];

    const publicUser = new PublicUser({
      fullName,
      email,
      phone,
      password,
      encryptedIdentityProofPath: encryptedIdentityPath,
      encryptedSignaturePath: encryptedSignaturePath,
      identityProofEncryption: identityEncryptionData,
      signatureEncryption: signatureEncryptionData,
      identityProofType: req.body.identityProofType || 'other',
      location: {
        type: 'Point',
        coordinates,
        city: city || null,
        state: state || null
      },
      bloodGroup: bloodGroup || null,
      verificationStatus: 'pending'
    });

    await publicUser.save();

    res.status(201).json({
      success: true,
      message: 'Registration successful. Awaiting verification.',
      data: {
        userId: publicUser._id,
        email: publicUser.email,
        verificationStatus: publicUser.verificationStatus
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const user = await PublicUser.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          verificationStatus: user.verificationStatus,
          bloodGroup: user.bloodGroup
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

module.exports = {
  register,
  login
};
