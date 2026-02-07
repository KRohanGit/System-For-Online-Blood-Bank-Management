const mongoose = require('mongoose');

const donorCredentialSchema = new mongoose.Schema({
  donorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PublicUser',
    required: true
  },
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true
  },
  otpHash: {
    type: String,
    default: null
  },
  otpExpiry: {
    type: Date,
    default: null
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isOtpUsed: {
    type: Boolean,
    default: false
  },
  mustChangePassword: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('DonorCredential', donorCredentialSchema);
