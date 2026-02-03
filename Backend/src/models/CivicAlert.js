const mongoose = require('mongoose');

const civicAlertSchema = new mongoose.Schema({
  alertType: {
    type: String,
    enum: ['SHORTAGE', 'EXPIRY', 'CAMP', 'COMMUNITY_NOTICE'],
    required: true
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  },
  urgencyScore: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HospitalProfile'
  },
  hospitalName: String,
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
  unitsRequired: Number,
  expiryWarningHours: Number,
  eventDate: Date,
  description: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { 
  timestamps: true 
});

civicAlertSchema.index({ location: '2dsphere' });
civicAlertSchema.index({ urgencyScore: -1 });
civicAlertSchema.index({ isActive: 1 });

module.exports = mongoose.model('CivicAlert', civicAlertSchema);
