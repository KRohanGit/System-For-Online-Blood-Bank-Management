const mongoose = require('mongoose');

/**
 * Medical Validation by Doctor
 * Tracks blood unit validation, blood request reviews, and clinical decisions
 */
const doctorMedicalValidationSchema = new mongoose.Schema({
  validationType: {
    type: String,
    enum: ['blood_unit', 'blood_request', 'donor_screening'],
    required: true
  },
  
  // Reference to what's being validated
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'targetModel'
  },
  targetModel: {
    type: String,
    required: true,
    enum: ['BloodInventory', 'DonationAppointment', 'PublicUser']
  },

  // Doctor who performed validation
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctorName: {
    type: String,
    required: true
  },
  medicalRegistrationNumber: String,

  // Validation decision
  validationStatus: {
    type: String,
    enum: ['approved', 'hold_for_recheck', 'rejected', 'urgency_approved', 'urgency_downgraded', 'escalated'],
    required: true
  },

  // Clinical notes
  medicalNotes: {
    type: String,
    required: true
  },
  rejectionReason: String,
  recheckParameters: [String],

  // For blood unit validation
  labResultsReviewed: {
    hemoglobin: Boolean,
    bloodGrouping: Boolean,
    infectionScreening: Boolean,
    visualInspection: Boolean
  },

  // For blood request validation
  urgencyValidation: {
    originalUrgency: String,
    validatedUrgency: String,
    clinicalJustification: String,
    misuseFlagged: Boolean
  },

  // Ethical compliance
  selfCollectedUnit: {
    type: Boolean,
    default: false
  },
  ethicalViolationFlagged: {
    type: Boolean,
    default: false
  },
  ethicalViolationDetails: String,

  // Audit trail
  timestamp: {
    type: Date,
    default: Date.now
  },
  ipAddress: String,
  actionHash: String // For blockchain/audit integrity

}, {
  timestamps: true
});

// Indexes
doctorMedicalValidationSchema.index({ doctorId: 1, validationType: 1 });
doctorMedicalValidationSchema.index({ targetId: 1, targetModel: 1 });
doctorMedicalValidationSchema.index({ validationStatus: 1 });
doctorMedicalValidationSchema.index({ timestamp: -1 });

// Self-collection prevention check
doctorMedicalValidationSchema.pre('save', async function(next) {
  if (this.validationType === 'blood_unit' && this.isNew) {
    const BloodInventory = mongoose.model('BloodInventory');
    const unit = await BloodInventory.findById(this.targetId);
    
    if (unit && unit.lifecycle && unit.lifecycle.length > 0) {
      const collectedBy = unit.lifecycle[0].performedBy;
      if (collectedBy && collectedBy.toString() === this.doctorId.toString()) {
        this.selfCollectedUnit = true;
        this.ethicalViolationFlagged = true;
        this.ethicalViolationDetails = 'Doctor cannot approve their own collected unit';
      }
    }
  }
  next();
});

module.exports = mongoose.model('DoctorMedicalValidation', doctorMedicalValidationSchema);
