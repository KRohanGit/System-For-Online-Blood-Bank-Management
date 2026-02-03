const mongoose = require('mongoose');
const bloodInventorySchema = new mongoose.Schema({
    bloodUnitId: {
        type: String,
        required: true,
        unique: true,
        default: function() {
            const year = new Date().getFullYear();
            const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
            return `BU${year}${random}`;
        }
    },
    bloodGroup: {
        type: String,
        required: true,
        enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
        uppercase: true
    },
    storageType: {
        type: String,
        required: true,
        enum: ['Whole Blood', 'Plasma', 'Platelets', 'Red Cells', 'Cryoprecipitate'],
        default: 'Whole Blood'
    },
    volume: {
        type: Number,
        default: 450,
        min: 0
    },
    collectionDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    expiryDate: {
        type: Date,
        required: true,
    },
    hospitalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref : 'HospitalProfile',
        required: true
    },

    storageLocation: {
        fridgeId: {type: String, default: 'FR-01'},
        rackNumber: { type: String, default: 'R-01' },
        shelfPosition: { type: String, default: 'S-01' },
        temperatureZone: { type: String, default: '2-6°C' }
    },
    status: {
        type: String,
        enum: ['Available', 'Reserved', 'Issued', 'Expired', 'Quarantined'],
        default: 'Available'
    },
    donorInfo: {
    donorName: String,
    donorContact: String,
    donorBloodGroup: String
  },

  // Lifecycle tracking - blockchain ready
  lifecycle: [{
    stage: String,
    timestamp: { type: Date, default: Date.now },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: String
  }],

  reservationInfo: {
    reservedFor: String,
    reservedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reservedAt: Date,
    priority: { type: String, enum: ['Normal', 'Urgent', 'Emergency'], default: 'Normal' }
  },

  issuanceInfo: {
    issuedTo: String,
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    issuedAt: Date,
    purpose: String
  },

  notes: String

}, { timestamps: true });

// Indexes for fast queries
bloodInventorySchema.index({ hospitalId: 1, bloodGroup: 1 });
bloodInventorySchema.index({ status: 1 });
bloodInventorySchema.index({ expiryDate: 1 });

// Calculate days until expiry
bloodInventorySchema.virtual('daysUntilExpiry').get(function() {
  return Math.ceil((this.expiryDate - new Date()) / (1000 * 60 * 60 * 24));
});

// Auto-expire if past date
bloodInventorySchema.pre('save', function(next) {
  if (new Date() > this.expiryDate && this.status === 'Available') {
    this.status = 'Expired';
  }
  next();
});

// Methods
bloodInventorySchema.methods.reserve = function(reservedFor, reservedBy, priority) {
  this.status = 'Reserved';
  this.reservationInfo = { reservedFor, reservedBy, reservedAt: new Date(), priority };
  this.lifecycle.push({ stage: 'Reserved', performedBy: reservedBy, notes: `Reserved for ${reservedFor}` });
  return this.save();
};

bloodInventorySchema.methods.issue = function(issuedTo, issuedBy, purpose) {
  this.status = 'Issued';
  this.issuanceInfo = { issuedTo, issuedBy, issuedAt: new Date(), purpose };
  this.lifecycle.push({ stage: 'Issued', performedBy: issuedBy, notes: `Issued to ${issuedTo}` });
  return this.save();
};

bloodInventorySchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('BloodInventory', bloodInventorySchema);