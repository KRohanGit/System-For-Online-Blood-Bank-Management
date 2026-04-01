const mongoose = require('mongoose');

const optimizationRunSchema = new mongoose.Schema(
  {
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    mode: {
      type: String,
      enum: ['auto', 'minimize_wastage', 'minimize_delivery_time', 'maximize_emergency_coverage', 'balanced'],
      default: 'auto'
    },
    selectedObjective: {
      type: String,
      default: 'balanced'
    },
    runtimeMs: {
      type: Number,
      default: 0
    },
    dataset: {
      hospitalCount: { type: Number, default: 0 },
      emergencyCount: { type: Number, default: 0 },
      bloodGroupCount: { type: Number, default: 0 },
      candidateRouteCount: { type: Number, default: 0 }
    },
    weights: {
      distance: { type: Number, default: 0 },
      expiry: { type: Number, default: 0 },
      emergency: { type: Number, default: 0 }
    },
    impact: {
      totalUnitsMoved: { type: Number, default: 0 },
      estimatedTimeSavedPct: { type: Number, default: 0 },
      wastageReducedPct: { type: Number, default: 0 },
      emergencyCoveragePct: { type: Number, default: 0 }
    },
    explanation: {
      type: String,
      default: ''
    },
    analysisFlow: {
      type: [String],
      default: []
    },
    compare: {
      baseline: {
        coveragePct: { type: Number, default: 0 },
        avgResponseMinutes: { type: Number, default: 0 },
        wastageRiskUnits: { type: Number, default: 0 }
      },
      optimized: {
        coveragePct: { type: Number, default: 0 },
        avgResponseMinutes: { type: Number, default: 0 },
        wastageRiskUnits: { type: Number, default: 0 }
      },
      improvementPct: {
        coverage: { type: Number, default: 0 },
        responseTime: { type: Number, default: 0 },
        wastage: { type: Number, default: 0 }
      }
    },
    transfers: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    }
  },
  {
    timestamps: true
  }
);

optimizationRunSchema.index({ createdAt: -1 });
optimizationRunSchema.index({ mode: 1, createdAt: -1 });

module.exports = mongoose.model('OptimizationRun', optimizationRunSchema);
