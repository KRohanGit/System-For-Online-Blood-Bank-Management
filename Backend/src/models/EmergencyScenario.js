const mongoose = require('mongoose');

const emergencyScenarioSchema = new mongoose.Schema({
  // Incident Details
  incidentType: {
    type: String,
    required: true,
    enum: ['road_accident', 'disaster', 'festival', 'industrial_accident', 'natural_calamity', 'mass_casualty']
  },
  incidentLocation: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    areaName: { type: String, required: true },
    city: { type: String, required: true }
  },
  estimatedCasualties: {
    type: Number,
    required: true,
    min: 1
  },
  incidentTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  // Severity Distribution
  severityDistribution: {
    criticalPercentage: { type: Number, min: 0, max: 100, default: 30 },
    moderatePercentage: { type: Number, min: 0, max: 100, default: 40 },
    minorPercentage: { type: Number, min: 0, max: 100, default: 30 }
  },
  
  // Blood Demand Calculation
  projectedBloodDemand: {
    totalUnits: Number,
    byBloodGroup: {
      'O+': Number,
      'O-': Number,
      'A+': Number,
      'A-': Number,
      'B+': Number,
      'B-': Number,
      'AB+': Number,
      'AB-': Number
    },
    emergencyDemandScore: { type: Number, min: 0, max: 100 },
    rareBloodPressureIndex: { type: Number, min: 0, max: 100 }
  },
  
  // Hospital Impact Analysis
  hospitalImpacts: [{
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'HospitalProfile' },
    hospitalName: String,
    distance: Number, // in km
    impactLevel: { type: String, enum: ['primary', 'secondary', 'tertiary'] },
    availableUnits: Object,
    projectedDemand: Object,
    timeToShortage: Number, // in hours
    bloodGroupRisks: Object,
    overallRiskLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] }
  }],
  
  // Crisis Propagation Timeline
  propagationTimeline: {
    immediate: { // 0-2 hours
      affectedHospitals: [mongoose.Schema.Types.ObjectId],
      shortageRisk: String,
      summary: String
    },
    shortTerm: { // 2-6 hours
      affectedHospitals: [mongoose.Schema.Types.ObjectId],
      shortageRisk: String,
      summary: String
    },
    critical: { // 6-12 hours
      affectedHospitals: [mongoose.Schema.Types.ObjectId],
      shortageRisk: String,
      summary: String
    }
  },
  
  // Recommendations
  recommendations: [{
    type: String,
    priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
    description: String,
    targetHospitals: [mongoose.Schema.Types.ObjectId],
    targetBloodGroups: [String],
    estimatedImpact: String,
    approved: { type: Boolean, default: false },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    executed: { type: Boolean, default: false },
    executedAt: Date
  }],
  
  // City Preparedness Metrics
  cityPreparednessIndex: {
    score: { type: Number, min: 0, max: 100 },
    factors: {
      inventoryLevel: Number,
      hospitalCapacity: Number,
      responseReadiness: Number,
      donorAvailability: Number
    }
  },
  
  // Metadata
  scenarioStatus: {
    type: String,
    enum: ['simulation', 'active', 'resolved', 'archived'],
    default: 'simulation'
  },
  isSimulation: {
    type: Boolean,
    default: true
  },
  notes: String,
  
  // Audit Trail
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  simulationRuns: [{
    runAt: Date,
    runBy: mongoose.Schema.Types.ObjectId,
    modifications: Object,
    results: Object
  }],
  adminDecisions: [{
    decision: String,
    decisionBy: mongoose.Schema.Types.ObjectId,
    decidedAt: Date,
    notes: String
  }]
}, {
  timestamps: true
});

// Indexes for efficient queries
emergencyScenarioSchema.index({ 'incidentLocation.city': 1, createdAt: -1 });
emergencyScenarioSchema.index({ scenarioStatus: 1, isSimulation: 1 });
emergencyScenarioSchema.index({ createdBy: 1 });

module.exports = mongoose.model('EmergencyScenario', emergencyScenarioSchema);
