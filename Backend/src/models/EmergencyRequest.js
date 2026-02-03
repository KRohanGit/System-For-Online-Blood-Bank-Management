/**
 * EmergencyRequest Model
 * 
 * Purpose: Manage inter-hospital emergency blood requests with complete lifecycle tracking
 * 
 * Features:
 * - Multi-stage verification workflow
 * - Severity classification
 * - Auto-matching recommendations
 * - Escalation tracking
 * - Communication logs
 * - Audit trail
 */

const mongoose = require('mongoose');

const emergencyRequestSchema = new mongoose.Schema({
  // Basic Request Info
  requestingHospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HospitalProfile',
    required: true
  },
  requestingHospitalName: {
    type: String,
    required: true
  },
  
  // Blood Requirements
  bloodGroup: {
    type: String,
    required: true,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  },
  unitsRequired: {
    type: Number,
    required: true,
    min: 1
  },
  
  // Patient & Medical Info
  patientInfo: {
    age: Number,
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    diagnosis: String,
    requiredBy: Date,
    isLifeThreatening: { type: Boolean, default: false }
  },
  
  // Severity & Urgency
  severityLevel: {
    type: String,
    required: true,
    enum: ['CRITICAL', 'HIGH', 'MODERATE'],
    default: 'HIGH'
  },
  urgencyScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 70
  },
  
  // Request Lifecycle Status
  lifecycleStatus: {
    type: String,
    required: true,
    enum: [
      'CREATED',
      'MEDICAL_VERIFICATION_PENDING',
      'PARTNER_HOSPITAL_SEARCH',
      'PARTNER_ACCEPTED',
      'LOGISTICS_DISPATCH',
      'IN_TRANSIT',
      'DELIVERED',
      'COMPLETED',
      'CANCELLED',
      'FAILED'
    ],
    default: 'CREATED'
  },
  
  // Assigned Partner Hospital
  assignedHospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HospitalProfile'
  },
  assignedHospitalName: String,
  acceptedAt: Date,
  acceptedBy: {
    userId: mongoose.Schema.Types.ObjectId,
    name: String
  },
  
  // Medical Verification
  medicalVerification: {
    verified: { type: Boolean, default: false },
    verifiedBy: {
      doctorId: mongoose.Schema.Types.ObjectId,
      doctorName: String
    },
    verifiedAt: Date,
    verificationNotes: String,
    digitalSignature: String
  },
  
  // Matching & Recommendations
  matchingRecommendations: [{
    hospitalId: mongoose.Schema.Types.ObjectId,
    hospitalName: String,
    matchScore: Number, // 0-100
    distance: Number, // in km
    availableUnits: Number,
    responseTime: Number, // estimated minutes
    trustScore: Number,
    confidenceLevel: String, // HIGH, MEDIUM, LOW
    estimatedArrival: Date
  }],
  autoMatchedAt: Date,
  
  // Escalation Tracking
  escalationLevel: {
    type: Number,
    default: 0,
    min: 0,
    max: 3
  },
  escalationHistory: [{
    level: Number,
    escalatedAt: Date,
    reason: String,
    hospitalNotified: [mongoose.Schema.Types.ObjectId],
    actionTaken: String
  }],
  
  // Logistics & Transfer Details
  logisticsDetails: {
    dispatchMethod: { 
      type: String, 
      enum: ['AMBULANCE', 'COURIER', 'DRONE', 'PICKUP'] 
    },
    dispatchedAt: Date,
    dispatchedBy: {
      userId: mongoose.Schema.Types.ObjectId,
      name: String
    },
    vehicleInfo: {
      type: String,
      number: String
    },
    estimatedArrival: Date,
    actualArrival: Date,
    currentLocation: {
      latitude: Number,
      longitude: Number,
      lastUpdated: Date
    },
    trackingPoints: [{
      latitude: Number,
      longitude: Number,
      timestamp: Date,
      status: String
    }],
    temperatureLog: [{
      temperature: Number,
      timestamp: Date,
      withinRange: Boolean
    }],
    courierContact: String
  },
  
  // Communication Logs
  communicationLogs: [{
    timestamp: { type: Date, default: Date.now },
    fromHospitalId: mongoose.Schema.Types.ObjectId,
    toHospitalId: mongoose.Schema.Types.ObjectId,
    messageType: { 
      type: String, 
      enum: ['CHAT', 'VOICE_CALL', 'VIDEO_CALL', 'SYSTEM_NOTIFICATION'] 
    },
    message: String,
    attachments: [{
      type: String,
      url: String,
      uploadedAt: Date
    }],
    readAt: Date
  }],
  
  // Quality & Compliance
  qualityChecklist: {
    bloodSafetyConfirmed: { type: Boolean, default: false },
    doctorApprovalObtained: { type: Boolean, default: false },
    transportReadiness: { type: Boolean, default: false },
    receivingHospitalConfirmed: { type: Boolean, default: false },
    temperatureControlVerified: { type: Boolean, default: false },
    documentationComplete: { type: Boolean, default: false }
  },
  
  // Audit Trail
  auditTrail: [{
    timestamp: { type: Date, default: Date.now },
    action: String,
    performedBy: {
      userId: mongoose.Schema.Types.ObjectId,
      name: String,
      role: String,
      hospitalId: mongoose.Schema.Types.ObjectId
    },
    oldStatus: String,
    newStatus: String,
    notes: String,
    ipAddress: String
  }],
  
  // Resource Locking
  resourceLock: {
    isLocked: { type: Boolean, default: false },
    lockedUnits: Number,
    lockedAt: Date,
    lockExpiry: Date,
    inventoryIds: [mongoose.Schema.Types.ObjectId]
  },
  
  // Timing & Performance
  timingMetrics: {
    createdAt: Date,
    medicalVerificationTime: Number, // minutes
    partnerMatchingTime: Number,
    acceptanceTime: Number,
    dispatchTime: Number,
    deliveryTime: Number,
    totalResolutionTime: Number
  },
  
  // Failure & Cancellation
  failureReason: String,
  cancellationReason: String,
  cancelledBy: {
    userId: mongoose.Schema.Types.ObjectId,
    name: String
  },
  cancelledAt: Date,
  
  // Additional Notes
  notes: String,
  internalNotes: String, // Not visible to other hospitals
  
  // Status Flags
  isActive: { type: Boolean, default: true },
  isArchived: { type: Boolean, default: false },
  
}, {
  timestamps: true
});

// Indexes for performance
emergencyRequestSchema.index({ requestingHospitalId: 1, lifecycleStatus: 1 });
emergencyRequestSchema.index({ assignedHospitalId: 1, lifecycleStatus: 1 });
emergencyRequestSchema.index({ bloodGroup: 1, severityLevel: 1 });
emergencyRequestSchema.index({ createdAt: -1 });
emergencyRequestSchema.index({ escalationLevel: 1, lifecycleStatus: 1 });

// Virtual for elapsed time
emergencyRequestSchema.virtual('elapsedMinutes').get(function() {
  return Math.floor((Date.now() - this.createdAt) / 60000);
});

// Method to calculate urgency score
emergencyRequestSchema.methods.calculateUrgencyScore = function() {
  let score = 50;
  
  // Severity weight
  if (this.severityLevel === 'CRITICAL') score += 30;
  else if (this.severityLevel === 'HIGH') score += 20;
  else score += 10;
  
  // Life threatening
  if (this.patientInfo?.isLifeThreatening) score += 20;
  
  // Time sensitivity
  const minutesElapsed = this.elapsedMinutes;
  if (minutesElapsed > 30) score += 10;
  if (minutesElapsed > 60) score += 10;
  
  // Rare blood groups
  if (['AB-', 'B-', 'O-'].includes(this.bloodGroup)) score += 10;
  
  return Math.min(score, 100);
};

// Method to add audit log entry
emergencyRequestSchema.methods.addAuditLog = function(action, performedBy, notes, oldStatus, newStatus) {
  this.auditTrail.push({
    action,
    performedBy,
    oldStatus: oldStatus || this.lifecycleStatus,
    newStatus: newStatus || this.lifecycleStatus,
    notes
  });
};

// Method to escalate request
emergencyRequestSchema.methods.escalate = function(reason, hospitalIds) {
  this.escalationLevel += 1;
  this.escalationHistory.push({
    level: this.escalationLevel,
    escalatedAt: new Date(),
    reason,
    hospitalNotified: hospitalIds,
    actionTaken: `Escalated to Level ${this.escalationLevel}`
  });
};

module.exports = mongoose.model('EmergencyRequest', emergencyRequestSchema);
