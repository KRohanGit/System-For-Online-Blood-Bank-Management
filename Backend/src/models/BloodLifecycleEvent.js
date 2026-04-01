const mongoose = require('mongoose');

/**
 * BloodLifecycleEvent Schema
 * 
 * Immutable event log for each blood unit
 * Every action creates a new event entry for audit trail
 * 
 * Events tracked:
 * - DONATION: Blood collected from donor
 * - TESTING: Testing phase initiated
 * - TEST_PASSED: Blood passed all tests
 * - TEST_FAILED: Blood failed tests (will be discarded)
 * - PROCESSING: Blood being processed/separated
 * - STORAGE_RECEIVED: Entered storage facility
 * - RESERVED: Reserved for specific patient/procedure
 * - TRANSFER_INITIATED: Transfer to another facility
 * - TRANSFER_RECEIVED: Transfer received at new facility
 * - IN_USE_PREPARED: Being prepared for transfusion
 * - TRANSFUSED: Used for transfusion
 * - RETURN_INITIATED: Return from hospital
 * - RETURN_RECEIVED: Return received back at blood bank
 * - EXPIRY_REACHED: Unit expired
 * - DISCARDED: Unit discarded
 */

const lifecycleEventSchema = new mongoose.Schema({
  // Reference
  unitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BloodUnit',
    required: true,
    index: true
  },

  unitUniqueId: String, // Denormalized for quick lookup

  // Event Information
  eventType: {
    type: String,
    enum: [
      'DONATION',
      'TESTING',
      'TEST_PASSED',
      'TEST_FAILED',
      'PROCESSING',
      'STORAGE_RECEIVED',
      'RESERVED',
      'TRANSFER_INITIATED',
      'TRANSFER_RECEIVED',
      'IN_USE_PREPARED',
      'TRANSFUSED',
      'RETURN_INITIATED',
      'RETURN_RECEIVED',
      'EXPIRY_REACHED',
      'DISCARDED',
      'QUALITY_ALERT',
      'MONITORING_FLAG',
      'STATUS_UPDATE'
    ],
    required: true,
    index: true
  },

  // Location Information
  location: {
    type: String,
    enum: [
      'COLLECTION_CENTER',
      'HOSPITAL',
      'BLOOD_BANK',
      'TRANSIT',
      'IN_USE',
      'DISPOSED'
    ]
  },

  facility: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HospitalProfile'
  },

  facilityName: String,

  // Status Transition
  previousStatus: String,
  newStatus: String,

  // Event Details
  description: String,

  metadata: {
    temperature: Number,
    humidity: Number,
    containerCondition: String,
    notes: String
  },

  // Patient Information (Anonymized)
  anonymizedPatientInfo: {
    ageGroup: {
      type: String,
      enum: ['CHILD', 'ADULT', 'ELDERLY', 'UNKNOWN'],
      default: 'UNKNOWN'
    },
    procedure: {
      type: String,
      enum: ['SURGERY', 'TRAUMA', 'TRANSFUSION', 'RESEARCH', 'OTHER', 'UNKNOWN'],
      default: 'UNKNOWN'
    },
    urgency: {
      type: String,
      enum: ['ROUTINE', 'URGENT', 'EMERGENCY', 'UNKNOWN'],
      default: 'UNKNOWN'
    }
  },

  // Outcome Information
  outcome: {
    wasSuccessful: Boolean,
    message: String,
    lifesSaved: { type: Number, default: 0 }
  },

  // Actor Information
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  recordedByName: String,
  recordedByRole: String,

  // Blockchain Information (Optional)
  blockchainHash: String,
  previousBlockHash: String,

  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },

  // Impact Information (when applicable)
  impactInfo: {
    isLifeSaving: Boolean,
    impactMessage: String // e.g., "This unit helped save a life in emergency trauma surgery"
  },

  // Alerts
  alerts: [{
    type: String,
    enum: ['EXPIRY_WARNING', 'TRANSFER_DELAY', 'CONTAMINATION_RISK', 'INVENTORY_CONCERN']
  }],

  // Soft delete support
  isDeleted: { type: Boolean, default: false }
});

// Indexes for performance
lifecycleEventSchema.index({ unitId: 1, timestamp: -1 });
lifecycleEventSchema.index({ eventType: 1 });
lifecycleEventSchema.index({ timestamp: -1 });
lifecycleEventSchema.index({ facility: 1 });
lifecycleEventSchema.index({ recordedBy: 1 });
lifecycleEventSchema.index({ 'anonymizedPatientInfo.urgency': 1 });
lifecycleEventSchema.index({ blockchainHash: 1 });

// Auto-populate denormalized fields
lifecycleEventSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      const BloodUnit = mongoose.model('BloodUnit');
      const unit = await BloodUnit.findById(this.unitId);
      if (unit) {
        this.unitUniqueId = unit.unitId;
      }
    } catch (err) {
      console.error('Error denormalizing unitUniqueId:', err.message);
    }
  }
  next();
});

module.exports = mongoose.model('BloodLifecycleEvent', lifecycleEventSchema);
