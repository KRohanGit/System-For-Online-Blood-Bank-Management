const mongoose = require('mongoose');

/**
 * Emergency Consult System
 * Manages doctor-hospital emergency consultation requests
 */
const emergencyConsultSchema = new mongoose.Schema({
  consultId: {
    type: String,
    unique: true,
    default: function() {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 7);
      return `EC-${timestamp}-${random}`.toUpperCase();
    }
  },

  // Hospital requesting consult
  requestingHospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HospitalProfile',
    required: true
  },
  requestingHospitalName: String,
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requestedByName: String,

  // Doctor being consulted
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctorName: String,
  doctorSpecialization: String,

  // Consult details
  consultType: {
    type: String,
    enum: ['emergency_transfusion', 'blood_safety', 'adverse_reaction', 'massive_hemorrhage', 'other'],
    required: true
  },
  urgencyLevel: {
    type: String,
    enum: ['critical', 'urgent', 'routine'],
    default: 'urgent'
  },
  patientContext: {
    ageRange: String,
    gender: String,
    clinicalCondition: String,
    bloodGroupRequired: String,
    estimatedUnitsNeeded: Number
  },

  medicalQuery: {
    type: String,
    required: true
  },
  attachedDocuments: [String],

  // Doctor response
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'completed', 'cancelled'],
    default: 'pending'
  },
  responseTime: Date,
  declineReason: String,

  medicalAdvisory: {
    advisoryNote: String,
    recommendedAction: String,
    criticalWarnings: [String],
    followUpRequired: Boolean,
    advisoryProvidedAt: Date
  },

  // Interaction log
  consultLog: [{
    timestamp: { type: Date, default: Date.now },
    actor: String,
    action: String,
    notes: String
  }],

  // Completion
  completedAt: Date,
  outcome: String,
  hospitalFeedback: String

}, {
  timestamps: true
});

// Indexes
emergencyConsultSchema.index({ doctorId: 1, status: 1 });
emergencyConsultSchema.index({ requestingHospitalId: 1, status: 1 });
emergencyConsultSchema.index({ urgencyLevel: 1, status: 1 });
emergencyConsultSchema.index({ createdAt: -1 });

// Auto-expire pending consults after 24 hours
emergencyConsultSchema.methods.checkExpiry = function() {
  if (this.status === 'pending') {
    const hoursSinceCreated = (Date.now() - this.createdAt) / (1000 * 60 * 60);
    if (hoursSinceCreated > 24) {
      this.status = 'cancelled';
      this.consultLog.push({
        actor: 'System',
        action: 'Auto-cancelled',
        notes: 'Consult request expired after 24 hours'
      });
      return this.save();
    }
  }
  return Promise.resolve(this);
};

module.exports = mongoose.model('EmergencyConsult', emergencyConsultSchema);
