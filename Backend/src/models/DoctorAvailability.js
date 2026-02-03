const mongoose = require('mongoose');

/**
 * Doctor Availability & Emergency Roster
 * Manages doctor availability for emergency consults
 */
const doctorAvailabilitySchema = new mongoose.Schema({
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Current status
  availabilityStatus: {
    type: String,
    enum: ['on_call', 'off_duty', 'in_consult', 'emergency_only'],
    default: 'off_duty'
  },

  // Schedule
  regularSchedule: [{
    dayOfWeek: {
      type: Number,
      min: 0,
      max: 6 // 0 = Sunday, 6 = Saturday
    },
    startTime: String, // HH:mm format
    endTime: String,
    hospitals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'HospitalProfile' }]
  }],

  // Emergency response tier
  emergencyTier: {
    type: String,
    enum: ['tier1_critical', 'tier2_urgent', 'tier3_routine'],
    default: 'tier2_urgent'
  },

  // Specializations for emergency response
  specializations: [{
    type: String,
    enum: [
      'Hematology',
      'Transfusion Medicine',
      'Emergency Medicine',
      'Critical Care',
      'Trauma Surgery',
      'Pediatrics',
      'Oncology',
      'General Practice',
      'Other'
    ]
  }],

  // Affiliated hospitals
  affiliatedHospitals: [{
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'HospitalProfile' },
    hospitalName: String,
    role: String,
    isPrimary: Boolean
  }],

  // Preferences
  maxConsultsPerDay: {
    type: Number,
    default: 5
  },
  autoAcceptEmergencies: {
    type: Boolean,
    default: false
  },
  notificationPreferences: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: true },
    push: { type: Boolean, default: true }
  },

  // Statistics
  stats: {
    totalConsultsAccepted: { type: Number, default: 0 },
    totalConsultsDeclined: { type: Number, default: 0 },
    averageResponseTimeMinutes: { type: Number, default: 0 },
    lastConsultDate: Date
  },

  // Current workload
  activeConsults: {
    type: Number,
    default: 0
  },

  // Last status update
  lastStatusUpdate: {
    type: Date,
    default: Date.now
  },
  statusUpdatedBy: String

}, {
  timestamps: true
});

// Indexes
doctorAvailabilitySchema.index({ doctorId: 1 });
doctorAvailabilitySchema.index({ availabilityStatus: 1, emergencyTier: 1 });
doctorAvailabilitySchema.index({ 'affiliatedHospitals.hospitalId': 1 });

// Method to check if doctor is available now
doctorAvailabilitySchema.methods.isAvailableNow = function() {
  if (this.availabilityStatus === 'off_duty') return false;
  if (this.activeConsults >= this.maxConsultsPerDay) return false;
  return true;
};

// Method to update workload
doctorAvailabilitySchema.methods.updateWorkload = function(increment) {
  this.activeConsults = Math.max(0, this.activeConsults + increment);
  return this.save();
};

module.exports = mongoose.model('DoctorAvailability', doctorAvailabilitySchema);
