const mongoose = require('mongoose');

/**
 * BloodUnit Schema
 * 
 * Tracks individual blood units with:
 * - Unique identification
 * - Lifecycle events
 * - Location history
 * - Expiry tracking
 * - Usage information
 * - QR code data
 */

const locationHistorySchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  location: String,
  storageType: {
    type: String,
    enum: ['COLLECTION_CENTER', 'HOSPITAL', 'BLOOD_BANK', 'TRANSIT', 'IN_USE', 'DISPOSED'],
    default: 'COLLECTION_CENTER'
  },
  temperature: Number, // Celsius
  humidity: Number, // Percentage
  notes: String,
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const usageInfoSchema = new mongoose.Schema({
  usedAt: Date,
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'HospitalProfile' },
  patientAgeGroup: {
    type: String,
    enum: ['CHILD', 'ADULT', 'ELDERLY', 'UNKNOWN'],
    default: 'UNKNOWN'
  },
  procedure: {
    type: String,
    enum: ['SURGERY', 'TRAUMA', 'TRANSFUSION', 'RESEARCH', 'OTHER'],
    default: 'OTHER'
  },
  urgency: {
    type: String,
    enum: ['ROUTINE', 'URGENT', 'EMERGENCY'],
    default: 'ROUTINE'
  },
  outcome: {
    type: String,
    enum: ['SUCCESSFUL', 'PARTIAL', 'FAILED', 'UNKNOWN'],
    default: 'UNKNOWN'
  },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: String
});

const qrMetadataSchema = new mongoose.Schema({
  qrCode: String, // Base64 or data URL
  qrString: String, // Encoded data in QR (typically unit ID + hash)
  generatedAt: { type: Date, default: Date.now },
  lastScannedAt: Date,
  scanCount: { type: Number, default: 0 }
});

const blockchainEventSchema = new mongoose.Schema({
  eventType: String,
  eventHash: String, // Hash of the event
  previousHash: String, // Hash of previous event (chain)
  timestamp: { type: Date, default: Date.now },
  data: mongoose.Schema.Types.Mixed
});

const bloodUnitSchema = new mongoose.Schema({
  // Unique Identification
  unitId: {
    type: String,
    unique: true,
    required: true,
    index: true,
    // Format: BU-{timestamp}-{random}
  },

  // Blood Information
  bloodGroup: {
    type: String,
    enum: ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'],
    required: true,
    index: true
  },

  component: {
    type: String,
    enum: ['WHOLE_BLOOD', 'RED_CELLS', 'PLASMA', 'PLATELETS', 'CRYOPRECIPITATE', 'WHITE_CELLS'],
    default: 'WHOLE_BLOOD'
  },

  volume: {
    amount: { type: Number, default: 450 }, // in mL
    unit: { type: String, default: 'mL' }
  },

  // Donor Information
  donorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PublicUser',
    required: true,
    index: true
  },

  donorName: String, // Denormalized for quick access (no PII exposure)

  // Lifecycle Status
  status: {
    type: String,
    enum: [
      'COLLECTED',      // Just collected from donor
      'TESTING',        // In testing phase
      'PROCESSING',     // Being processed/separated
      'STORED',         // In storage/inventory
      'RESERVED',       // Reserved for patient
      'IN_TRANSIT',     // In transit to hospital
      'TRANSFUSED',     // Used for transfusion
      'EXPIRED',        // Expired, unable to use
      'DISCARDED',      // Discarded due to contamination or other reasons
      'RETURNED'        // Returned by hospital unused
    ],
    default: 'COLLECTED',
    index: true
  },

  // Timeline Information
  collectionDate: {
    type: Date,
    required: true,
    index: true
  },

  expiryDate: {
    type: Date,
    required: true,
    index: true
  },

  daysToExpiry: {
    type: Number,
    get: function() {
      const today = new Date();
      const expiry = new Date(this.expiryDate);
      const diffTime = expiry - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    }
  },

  // QR Code Metadata
  qrMetadata: qrMetadataSchema,

  // Location & Storage History
  locationHistory: [locationHistorySchema],

  // Usage Information
  usageInfo: usageInfoSchema,

  // Blockchain Audit Trail (Optional)
  blockchainEvents: [blockchainEventSchema],

  // AI Monitoring Flags
  monitoring: {
    nearExpiryAlert: { type: Boolean, default: false },
    nearExpiryAlertSentAt: Date,
    delayedTransferAlert: { type: Boolean, default: false },
    delayedTransferAlertSentAt: Date,
    unusedInventoryAlert: { type: Boolean, default: false },
    unusedInventoryAlertSentAt: Date,
    lastMonitoringCheck: Date
  },

  // Quality & Testing
  testing: {
    bloodGroupConfirmed: { type: Boolean, default: false },
    infectionScreening: {
      hiv: { type: Boolean, default: false },
      hepatitisB: { type: Boolean, default: false },
      hepatitisC: { type: Boolean, default: false },
      syphilis: { type: Boolean, default: false }
    },
    bacterialContamination: { type: Boolean, default: false },
    viralContamination: { type: Boolean, default: false },
    testCompletedAt: Date,
    testResultsNotes: String
  },

  // Current Location
  currentLocation: {
    type: {
      type: String,
      enum: ['COLLECTION_CENTER', 'HOSPITAL', 'BLOOD_BANK', 'TRANSIT', 'IN_USE', 'DISPOSED'],
      default: 'COLLECTION_CENTER'
    },
    facility: { type: mongoose.Schema.Types.ObjectId, ref: 'HospitalProfile' },
    facilityName: String,
    updatedAt: { type: Date, default: Date.now }
  },

  // Transfer Tracking
  lastTransferDate: Date,
  lastTransferFrom: String,
  lastTransferTo: String,

  // Impact Tracking (anonymized)
  impactInfo: {
    wasUsed: { type: Boolean, default: false },
    timeToUsage: Number, // Days from collection to usage
    lifesSaved: { type: Number, default: 0 },
    procedureType: String, // e.g., "Emergency Surgery", "Routine Transfusion"
    outcomeMessage: String // e.g., "This unit helped save a life in emergency surgery"
  },

  // Audit Trail
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

// Indexes for optimization
bloodUnitSchema.index({ unitId: 1 });
bloodUnitSchema.index({ bloodGroup: 1 });
bloodUnitSchema.index({ donorId: 1 });
bloodUnitSchema.index({ status: 1 });
bloodUnitSchema.index({ expiryDate: 1 });
bloodUnitSchema.index({ collectionDate: 1 });
bloodUnitSchema.index({ 'qrMetadata.qrString': 1 });
bloodUnitSchema.index({ 'monitoring.nearExpiryAlert': 1 });
bloodUnitSchema.index({ createdAt: -1 });

// TTL index for auto-deletion of expired + discarded units (after 2 years)
bloodUnitSchema.index(
  { updatedAt: 1 },
  {
    expireAfterSeconds: 63072000, // 2 years
    partialFilterExpression: {
      status: { $in: ['EXPIRED', 'DISCARDED'] }
    }
  }
);

// Middleware to update updatedAt
bloodUnitSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('BloodUnit', bloodUnitSchema);
