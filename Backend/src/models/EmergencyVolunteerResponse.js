const mongoose = require('mongoose');

const emergencyVolunteerResponseSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmergencyMobilizationEvent',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PublicUser',
    required: true
  },
  responseStatus: {
    type: String,
    enum: ['INTERESTED', 'CONFIRMED', 'ARRIVED', 'CANCELLED'],
    default: 'INTERESTED'
  },
  responseTime: {
    type: Date,
    default: Date.now
  },
  notes: String
}, { 
  timestamps: true 
});

emergencyVolunteerResponseSchema.index({ eventId: 1, userId: 1 }, { unique: true });
emergencyVolunteerResponseSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('EmergencyVolunteerResponse', emergencyVolunteerResponseSchema);
