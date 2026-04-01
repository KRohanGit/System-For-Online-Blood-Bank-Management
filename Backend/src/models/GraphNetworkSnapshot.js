const mongoose = require('mongoose');

const graphNetworkSnapshotSchema = new mongoose.Schema(
  {
    trigger: { type: String, default: 'manual' },
    computedAt: { type: Date, default: Date.now },
    stats: {
      nodeCount: Number,
      edgeCount: Number,
      avgEdgeWeight: Number,
      density: Number,
      largestComponentRatio: Number,
      averagePathLength: Number,
      stabilityScore: Number
    },
    topCentralHospitals: [
      {
        hospitalId: String,
        hospitalName: String,
        degreeCentrality: Number,
        closenessCentrality: Number,
        betweennessCentrality: Number
      }
    ],
    topBottlenecks: [
      {
        hospitalId: String,
        hospitalName: String,
        betweennessCentrality: Number,
        bridgeEdgeCount: Number,
        riskLevel: String
      }
    ]
  },
  { timestamps: true }
);

graphNetworkSnapshotSchema.index({ computedAt: -1 });
graphNetworkSnapshotSchema.index({ trigger: 1, computedAt: -1 });

module.exports = mongoose.model('GraphNetworkSnapshot', graphNetworkSnapshotSchema);
