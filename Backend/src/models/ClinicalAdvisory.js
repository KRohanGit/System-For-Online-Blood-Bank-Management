const mongoose = require('mongoose');

/**
 * Doctor Clinical Advisory
 * Non-binding recommendations during emergencies
 */
const clinicalAdvisorySchema = new mongoose.Schema({
  advisoryId: {
    type: String,
    unique: true,
    default: function() {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 7);
      return `ADV-${timestamp}-${random}`.toUpperCase();
    }
  },

  // Doctor issuing advisory
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctorName: String,
  doctorSpecialization: String,
  medicalRegistrationNumber: String,

  // Advisory context
  advisoryType: {
    type: String,
    enum: [
      'transfer_prioritization',
      'donor_mobilization',
      'unsafe_transfusion_warning',
      'inventory_risk_alert',
      'camp_safety_concern',
      'systemic_risk_flag',
      'emergency_protocol_recommendation',
      'other'
    ],
    required: true
  },

  severityLevel: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low'],
    default: 'medium'
  },

  // Advisory content
  title: {
    type: String,
    required: true
  },
  clinicalRationale: {
    type: String,
    required: true
  },
  recommendedActions: [{
    action: String,
    priority: { type: String, enum: ['immediate', 'urgent', 'routine'] },
    targetRole: String,
    estimatedImpact: String
  }],

  affectedEntities: {
    hospitals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'HospitalProfile' }],
    bloodGroups: [String],
    regions: [String]
  },

  // Supporting data
  referencedData: {
    scenarios: [{ type: mongoose.Schema.Types.ObjectId, ref: 'EmergencyScenario' }],
    bloodUnits: [String],
    appointments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DonationAppointment' }]
  },

  attachments: [String],

  // Admin review
  reviewStatus: {
    type: String,
    enum: ['pending_review', 'acknowledged', 'action_taken', 'declined', 'escalated'],
    default: 'pending_review'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  adminResponse: String,
  actionsTaken: String,

  // Visibility
  isUrgent: {
    type: Boolean,
    default: false
  },
  expiresAt: Date,

  // Audit
  timestamp: {
    type: Date,
    default: Date.now
  },
  lastModified: Date

}, {
  timestamps: true
});

// Indexes
clinicalAdvisorySchema.index({ doctorId: 1, advisoryType: 1 });
clinicalAdvisorySchema.index({ reviewStatus: 1, severityLevel: 1 });
clinicalAdvisorySchema.index({ isUrgent: 1, timestamp: -1 });
clinicalAdvisorySchema.index({ expiresAt: 1 });

// Set expiry for non-critical advisories (7 days)
clinicalAdvisorySchema.pre('save', function(next) {
  if (this.isNew && !this.expiresAt) {
    const daysToExpire = this.severityLevel === 'critical' ? 30 : 7;
    this.expiresAt = new Date(Date.now() + daysToExpire * 24 * 60 * 60 * 1000);
  }
  next();
});

module.exports = mongoose.model('ClinicalAdvisory', clinicalAdvisorySchema);
