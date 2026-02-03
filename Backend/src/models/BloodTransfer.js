/**
 * BloodTransfer Model
 * 
 * Purpose: Track real-time blood transfer logistics between hospitals
 * 
 * Features:
 * - GPS tracking
 * - Temperature monitoring
 * - Status updates
 * - Compliance verification
 */

const mongoose = require('mongoose');

const bloodTransferSchema = new mongoose.Schema({
  // Transfer Identification
  transferId: {
    type: String,
    required: true,
    unique: true
  },
  
  // Related Emergency Request
  emergencyRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmergencyRequest',
    required: true
  },
  
  // Hospitals Involved
  sourceHospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HospitalProfile',
    required: true
  },
  sourceHospitalName: String,
  
  destinationHospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HospitalProfile',
    required: true
  },
  destinationHospitalName: String,
  
  // Blood Details
  bloodGroup: {
    type: String,
    required: true,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  },
  unitsTransferred: {
    type: Number,
    required: true,
    min: 1
  },
  bloodBagIds: [{
    bagId: String,
    collectionDate: Date,
    expiryDate: Date,
    volume: Number
  }],
  
  // Transport Details
  transportStatus: {
    type: String,
    required: true,
    enum: [
      'READY',
      'DISPATCHED',
      'IN_TRANSIT',
      'ARRIVED',
      'VERIFIED_RECEIVED',
      'COMPLETED',
      'FAILED'
    ],
    default: 'READY'
  },
  
  transportMethod: {
    type: String,
    required: true,
    enum: ['AMBULANCE', 'COURIER', 'DRONE', 'PICKUP']
  },
  
  // Vehicle/Transport Info
  vehicleDetails: {
    type: String,
    vehicleNumber: String,
    driverName: String,
    driverContact: String,
    registrationNumber: String
  },
  
  // Timing
  dispatchTime: Date,
  estimatedArrivalTime: Date,
  actualArrivalTime: Date,
  deliveryDuration: Number, // minutes
  
  // GPS Tracking
  gpsTrackingPoints: [{
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    altitude: Number,
    speed: Number, // km/h
    accuracy: Number,
    status: String
  }],
  
  currentLocation: {
    latitude: Number,
    longitude: Number,
    lastUpdated: Date,
    address: String
  },
  
  // Route Information
  routeInfo: {
    origin: {
      latitude: Number,
      longitude: Number,
      address: String
    },
    destination: {
      latitude: Number,
      longitude: Number,
      address: String
    },
    distance: Number, // km
    estimatedTime: Number, // minutes
    actualDistance: Number,
    actualTime: Number
  },
  
  // Temperature Monitoring
  temperatureLog: [{
    temperature: {
      type: Number,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    withinRange: {
      type: Boolean,
      default: true
    },
    alertTriggered: Boolean,
    notes: String
  }],
  
  temperatureCompliance: {
    minTemp: { type: Number, default: 2 },
    maxTemp: { type: Number, default: 6 },
    violations: Number,
    overallCompliance: String // EXCELLENT, GOOD, WARNING, CRITICAL
  },
  
  // Quality & Safety Checks
  dispatchChecklist: {
    bloodSafetyVerified: { type: Boolean, default: false },
    properPackaging: { type: Boolean, default: false },
    temperatureControlReady: { type: Boolean, default: false },
    documentationComplete: { type: Boolean, default: false },
    transportReadiness: { type: Boolean, default: false },
    verifiedBy: {
      userId: mongoose.Schema.Types.ObjectId,
      name: String
    },
    verifiedAt: Date
  },
  
  receivalChecklist: {
    unitsReceived: Number,
    conditionGood: { type: Boolean, default: false },
    temperatureAcceptable: { type: Boolean, default: false },
    packagingIntact: { type: Boolean, default: false },
    documentationVerified: { type: Boolean, default: false },
    receivedBy: {
      userId: mongoose.Schema.Types.ObjectId,
      name: String
    },
    receivedAt: Date,
    notes: String
  },
  
  // Real-time Status Updates
  statusUpdates: [{
    timestamp: { type: Date, default: Date.now },
    status: String,
    message: String,
    location: {
      latitude: Number,
      longitude: Number
    },
    updatedBy: {
      userId: mongoose.Schema.Types.ObjectId,
      name: String
    }
  }],
  
  // Incidents & Alerts
  incidents: [{
    timestamp: Date,
    type: String, // TEMPERATURE_BREACH, DELAY, ROUTE_DEVIATION, ACCIDENT
    severity: String, // LOW, MEDIUM, HIGH, CRITICAL
    description: String,
    location: {
      latitude: Number,
      longitude: Number
    },
    actionTaken: String,
    resolvedAt: Date
  }],
  
  // Communication During Transport
  transportCommunication: [{
    timestamp: Date,
    fromUserId: mongoose.Schema.Types.ObjectId,
    toUserId: mongoose.Schema.Types.ObjectId,
    message: String,
    type: String // UPDATE, ALERT, QUERY, CONFIRMATION
  }],
  
  // Performance Metrics
  performanceMetrics: {
    onTimeDelivery: Boolean,
    delayMinutes: Number,
    temperatureCompliance: Number, // percentage
    routeEfficiency: Number, // percentage
    overallRating: Number // 1-5 stars
  },
  
  // Digital Signatures
  signatures: {
    dispatchSignature: {
      signedBy: mongoose.Schema.Types.ObjectId,
      signedAt: Date,
      digitalHash: String
    },
    receivalSignature: {
      signedBy: mongoose.Schema.Types.ObjectId,
      signedAt: Date,
      digitalHash: String
    }
  },
  
  // Completion & Feedback
  completedAt: Date,
  feedback: {
    rating: Number,
    comments: String,
    providedBy: mongoose.Schema.Types.ObjectId,
    providedAt: Date
  },
  
  // Failure Handling
  failureReason: String,
  failedAt: Date,
  
  // Additional Notes
  notes: String,
  
}, {
  timestamps: true
});

// Generate unique transfer ID
bloodTransferSchema.pre('save', async function(next) {
  if (!this.transferId) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    this.transferId = `BT-${timestamp}-${random}`.toUpperCase();
  }
  next();
});

// Indexes
bloodTransferSchema.index({ emergencyRequestId: 1 });
bloodTransferSchema.index({ sourceHospitalId: 1, transportStatus: 1 });
bloodTransferSchema.index({ destinationHospitalId: 1, transportStatus: 1 });
bloodTransferSchema.index({ transferId: 1 }, { unique: true });
bloodTransferSchema.index({ dispatchTime: -1 });

// Virtual for estimated time remaining
bloodTransferSchema.virtual('estimatedTimeRemaining').get(function() {
  if (!this.estimatedArrivalTime || this.transportStatus === 'COMPLETED') {
    return 0;
  }
  const remaining = Math.floor((this.estimatedArrivalTime - Date.now()) / 60000);
  return Math.max(remaining, 0);
});

// Method to add GPS tracking point
bloodTransferSchema.methods.addTrackingPoint = function(latitude, longitude, status) {
  this.gpsTrackingPoints.push({
    latitude,
    longitude,
    timestamp: new Date(),
    status
  });
  
  this.currentLocation = {
    latitude,
    longitude,
    lastUpdated: new Date()
  };
};

// Method to log temperature
bloodTransferSchema.methods.logTemperature = function(temperature) {
  const withinRange = temperature >= this.temperatureCompliance.minTemp && 
                      temperature <= this.temperatureCompliance.maxTemp;
  
  this.temperatureLog.push({
    temperature,
    timestamp: new Date(),
    withinRange,
    alertTriggered: !withinRange
  });
  
  if (!withinRange) {
    this.temperatureCompliance.violations = (this.temperatureCompliance.violations || 0) + 1;
  }
  
  return withinRange;
};

// Method to add status update
bloodTransferSchema.methods.addStatusUpdate = function(status, message, updatedBy, location) {
  this.statusUpdates.push({
    status,
    message,
    location,
    updatedBy
  });
  
  this.transportStatus = status;
};

// Method to calculate performance
bloodTransferSchema.methods.calculatePerformance = function() {
  if (!this.actualArrivalTime || !this.estimatedArrivalTime) {
    return null;
  }
  
  const actualMinutes = (this.actualArrivalTime - this.dispatchTime) / 60000;
  const estimatedMinutes = (this.estimatedArrivalTime - this.dispatchTime) / 60000;
  const delayMinutes = Math.max(0, actualMinutes - estimatedMinutes);
  
  const onTime = delayMinutes <= 10; // 10 minute tolerance
  
  // Temperature compliance
  const tempLogs = this.temperatureLog.length;
  const tempViolations = this.temperatureLog.filter(t => !t.withinRange).length;
  const tempCompliance = tempLogs > 0 ? ((tempLogs - tempViolations) / tempLogs) * 100 : 100;
  
  this.performanceMetrics = {
    onTimeDelivery: onTime,
    delayMinutes,
    temperatureCompliance: tempCompliance,
    routeEfficiency: this.routeInfo.actualDistance && this.routeInfo.distance 
      ? (this.routeInfo.distance / this.routeInfo.actualDistance) * 100 
      : 100,
    overallRating: onTime && tempCompliance > 90 ? 5 : onTime ? 4 : 3
  };
  
  return this.performanceMetrics;
};

module.exports = mongoose.model('BloodTransfer', bloodTransferSchema);
