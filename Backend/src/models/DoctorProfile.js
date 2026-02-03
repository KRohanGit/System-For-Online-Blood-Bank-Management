const mongoose = require('mongoose');

const doctorProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  // Medical credentials
  medicalRegistrationNumber: {
    type: String,
    required: false, // Changed from true to false for backward compatibility
    trim: true,
    sparse: true // Allow multiple null/undefined values
  },
  specialization: {
    type: String,
    required: false, // Changed from true to false for backward compatibility
    enum: [
      'Hematology',
      'Transfusion Medicine',
      'Emergency Medicine',
      'Critical Care',
      'Trauma Surgery',
      'Pediatrics',
      'Oncology',
      'General Practice',
      'Other',
      null // Allow null values
    ]
  },
  specializationOther: String,

  // Hospital affiliations (many-to-many)
  affiliatedHospitals: [{
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'HospitalProfile' },
    hospitalName: String,
    affiliatedSince: { type: Date, default: Date.now },
    isPrimary: { type: Boolean, default: false },
    role: String
  }],

  // Legacy field for backward compatibility
  hospitalName: {
    type: String,
    trim: true
  },

  // Certificate/License
  certificateFilePath: {
    type: String,
    required: [true, 'Medical certificate is required']
  },
  licenseNumber: String,
  licenseExpiryDate: Date,
  // Encryption metadata (visible in MongoDB for security demonstration)
  encryptedCertificateData: {
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
  }
}, {
  timestamps: true
});

// Index for faster queries (userId already has unique index, no need to add again)
doctorProfileSchema.index({ verificationStatus: 1 });

module.exports = mongoose.model('DoctorProfile', doctorProfileSchema);
