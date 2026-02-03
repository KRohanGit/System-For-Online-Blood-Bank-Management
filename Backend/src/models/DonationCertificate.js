const mongoose = require('mongoose');

const donationCertificateSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PublicUser',
    required: [true, 'User ID is required']
  },
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Hospital ID is required']
  },
  certificateNumber: {
    type: String,
    unique: true,
    required: true
  },
  donorName: {
    type: String,
    required: true
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: true
  },
  donationDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  units: {
    type: Number,
    default: 1,
    min: 1
  },
  certificateUrl: {
    type: String,
    default: null
  },
  verificationHash: {
    type: String,
    required: true,
    unique: true
  },
  isVerified: {
    type: Boolean,
    default: true
  },
  remarks: {
    type: String,
    maxlength: 500,
    default: null
  },
  expiryDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

donationCertificateSchema.index({ userId: 1 });
donationCertificateSchema.index({ hospitalId: 1 });
donationCertificateSchema.index({ certificateNumber: 1 });
donationCertificateSchema.index({ verificationHash: 1 });

donationCertificateSchema.pre('save', function(next) {
  if (!this.certificateNumber) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    this.certificateNumber = `CERT-${timestamp}-${random}`;
  }
  next();
});

donationCertificateSchema.statics.generateCertificateNumber = function() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 100000);
  return `CERT-${timestamp}-${random}`;
};

donationCertificateSchema.statics.verifyCertificate = function(certificateNumber, hash) {
  return this.findOne({ 
    certificateNumber, 
    verificationHash: hash,
    isVerified: true 
  });
};

module.exports = mongoose.model('DonationCertificate', donationCertificateSchema);
