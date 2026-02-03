const mongoose = require('mongoose');

const emergencyMobilizationEventSchema = new mongoose.Schema({
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HospitalProfile',
    required: true
  },
  hospitalName: String,
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: true
  },
  unitsRequired: {
    type: Number,
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  responseWindowHours: {
    type: Number,
    default: 24
  },
  volunteersRequired: {
    type: Number,
    default: 10
  },
  volunteersRegistered: {
    type: Number,
    default: 0
  },
  urgencyLevel: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM'
  },
  eventStatus: {
    type: String,
    enum: ['ACTIVE', 'FULFILLED', 'CLOSED'],
    default: 'ACTIVE'
  },
  description: String,
  instructions: String
}, { 
  timestamps: true 
});

emergencyMobilizationEventSchema.index({ location: '2dsphere' });
emergencyMobilizationEventSchema.index({ eventStatus: 1 });

module.exports = mongoose.model('EmergencyMobilizationEvent', emergencyMobilizationEventSchema);
