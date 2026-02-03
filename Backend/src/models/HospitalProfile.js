const mongoose = require('mongoose');

const hospitalProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  hospitalName: {
    type: String,
    required: [true, 'Hospital name is required'],
    trim: true
  },
  officialEmail: {
    type: String,
    required: [true, 'Official email is required'],
    lowercase: true,
    trim: true
  },
  licenseNumber: {
    type: String,
    required: [true, 'License number is required'],
    unique: true,
    trim: true
  },
  licenseFilePath: {
    type: String,
    required: [true, 'Hospital license is required']
  },
  // Encryption metadata (visible in MongoDB for security demonstration)
  encryptedLicenseData: {
    type: String, // Base64 encoded encrypted file
    default: null
  },
  encryptedAESKey: {
    type: String, // RSA-encrypted AES key (Base64)
    default: null
  },
  encryptionIV: {
    type: String, // Initialization Vector (Hex)
    default: null
  },
  encryptionMetadata: {
    algorithm: { type: String, default: 'aes-256-cbc' },
    rsaKeyLength: { type: Number, default: 2048 },
    encryptedAt: { type: Date, default: null },
    originalSize: { type: Number, default: null },
    encryptedSize: { type: Number, default: null }
  },
  adminName: {
    type: String,
    required: [true, 'Admin name is required'],
    trim: true
  },
  adminEmail: {
    type: String,
    required: [true, 'Admin email is required'],
    lowercase: true,
    trim: true
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  rejectionReason: {
    type: String,
    default: null
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // Location & Contact Information
  location: {
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null }
  },
  address: {
    type: String,
    default: null,
    trim: true
  },
  phone: {
    type: String,
    default: null,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for faster queries (userId and licenseNumber already have unique indexes)
hospitalProfileSchema.index({ verificationStatus: 1 });

module.exports = mongoose.model('HospitalProfile', hospitalProfileSchema);
