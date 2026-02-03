const mongoose = require('mongoose');

const donationReadinessLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PublicUser',
    required: true
  },
  lastDonationDate: Date,
  weight: {
    type: Number,
    required: true
  },
  age: {
    type: Number,
    required: true
  },
  hemoglobinLevel: Number,
  medicationStatus: {
    type: Boolean,
    default: false
  },
  illnessHistory: {
    type: Boolean,
    default: false
  },
  travelHistory: {
    type: Boolean,
    default: false
  },
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
  nextEligibleDate: Date,
  eligibilityStatus: {
    type: String,
    enum: ['ELIGIBLE', 'NOT_ELIGIBLE', 'CONDITIONAL'],
    required: true
  }
}, { 
  timestamps: true 
});

donationReadinessLogSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('DonationReadinessLog', donationReadinessLogSchema);
