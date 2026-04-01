const mongoose = require('mongoose');

const recommendationSchema = new mongoose.Schema({
  emergencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmergencyRequest' },
  bloodGroup: String,
  sourceHospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'HospitalProfile' },
  sourceHospitalName: String,
  targetHospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'HospitalProfile' },
  targetHospitalName: String,
  units: Number,
  distanceKm: Number,
  routingPriority: Number,
  confidence: Number,
  score: Number,
  explanation: String,
  urgency: String
}, { _id: false });

const rlPolicySnapshotSchema = new mongoose.Schema({
  trigger: { type: String, default: 'manual' },
  computeMs: { type: Number, default: 0 },
  policyVersion: { type: String, default: 'rl-lite-v1' },
  stateSummary: {
    hospitalCount: Number,
    activeEmergencyCount: Number,
    inventoryUnitTotal: Number,
    expiringSoonUnitTotal: Number
  },
  recommendations: [recommendationSchema],
  generatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

rlPolicySnapshotSchema.index({ createdAt: -1 });
rlPolicySnapshotSchema.index({ trigger: 1, createdAt: -1 });

module.exports = mongoose.model('RLPolicySnapshot', rlPolicySnapshotSchema);
