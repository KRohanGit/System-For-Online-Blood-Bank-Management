const mongoose = require('mongoose');

const donationReadinessLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PublicUser',
    required: true
  },
  
  // Basic Information
  age: {
    type: Number,
    required: true,
    min: 1,
    max: 120
  },
  weight: {
    type: Number,
    required: true,
    min: 1
  },
  gender: {
    type: String,
    required: true,
    enum: ['Male', 'Female', 'Other']
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', '']
  },
  lastDonationDate: Date,
  hemoglobinLevel: Number,
  
  // Health Status
  medicationStatus: {
    type: Boolean,
    default: false
  },
  illnessHistory: {
    type: Boolean,
    default: false
  },
  recentFever: {
    type: Boolean,
    default: false
  },
  chronicConditions: {
    type: Boolean,
    default: false
  },
  anemiaHistory: {
    type: Boolean,
    default: false
  },
  bleedingDisorders: {
    type: Boolean,
    default: false
  },
  
  // Lifestyle & Risk
  recentAlcohol: {
    type: Boolean,
    default: false
  },
  recentTattoo: {
    type: Boolean,
    default: false
  },
  recentVaccination: {
    type: Boolean,
    default: false
  },
  
  // Female-specific
  isPregnant: {
    type: Boolean,
    default: false
  },
  isBreastfeeding: {
    type: Boolean,
    default: false
  },
  recentChildbirth: {
    type: Boolean,
    default: false
  },
  
  // Results
  readinessScore: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  recommendation: {
    type: String,
    required: true
  },
  deferralReason: {
    type: String
  },
  nextEligibleDate: Date,
  eligibilityStatus: {
    type: String,
    enum: ['ELIGIBLE', 'NOT_ELIGIBLE', 'CONDITIONAL', 'TEMPORARILY_DEFERRED'],
    required: true
  }
}, { 
  timestamps: true 
});

donationReadinessLogSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('DonationReadinessLog', donationReadinessLogSchema);
