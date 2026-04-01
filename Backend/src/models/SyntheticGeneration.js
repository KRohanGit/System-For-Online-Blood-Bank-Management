const mongoose = require('mongoose');

const syntheticGenerationSchema = new mongoose.Schema(
  {
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    dataType: {
      type: String,
      enum: ['donors'],
      default: 'donors'
    },
    scenario: {
      type: String,
      enum: ['normal', 'festival', 'outbreak', 'heatwave', 'emergency_drive'],
      default: 'normal'
    },
    district: {
      type: String,
      default: 'all'
    },
    count: {
      type: Number,
      required: true,
      min: 1,
      max: 5000
    },
    seed: {
      type: Number,
      default: 42
    },
    injectedToSystem: {
      type: Boolean,
      default: false
    },
    qualityScore: {
      type: Number,
      default: 0
    },
    summary: {
      bloodGroupDistribution: {
        type: Map,
        of: Number,
        default: {}
      },
      ageBands: {
        type: Map,
        of: Number,
        default: {}
      },
      availabilityBands: {
        type: Map,
        of: Number,
        default: {}
      },
      clusterCount: {
        type: Number,
        default: 0
      },
      narrative: {
        type: [String],
        default: []
      }
    },
    previewRecords: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    }
  },
  {
    timestamps: true
  }
);

syntheticGenerationSchema.index({ createdAt: -1 });
syntheticGenerationSchema.index({ scenario: 1, createdAt: -1 });

module.exports = mongoose.model('SyntheticGeneration', syntheticGenerationSchema);
