/**
 * HospitalTrustLedger Model
 * 
 * Purpose: Track inter-hospital trust scores and credit history
 * 
 * Features:
 * - Borrowing/lending history
 * - Response reliability tracking
 * - Performance metrics
 * - Trust score calculation
 */

const mongoose = require('mongoose');

const hospitalTrustLedgerSchema = new mongoose.Schema({
  // Hospital Identification
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HospitalProfile',
    required: true,
    unique: true
  },
  hospitalName: {
    type: String,
    required: true
  },
  
  // Credit History
  creditHistory: {
    unitsBorrowed: {
      type: Number,
      default: 0
    },
    unitsReturned: {
      type: Number,
      default: 0
    },
    unitsLent: {
      type: Number,
      default: 0
    },
    unitsReceivedBack: {
      type: Number,
      default: 0
    },
    outstandingDebt: {
      type: Number,
      default: 0
    }
  },
  
  // Response Performance
  responseMetrics: {
    totalRequestsReceived: {
      type: Number,
      default: 0
    },
    requestsAccepted: {
      type: Number,
      default: 0
    },
    requestsDeclined: {
      type: Number,
      default: 0
    },
    requestsTimeout: {
      type: Number,
      default: 0
    },
    acceptanceRate: {
      type: Number,
      default: 100,
      min: 0,
      max: 100
    },
    averageResponseTime: {
      type: Number,
      default: 0 // in minutes
    },
    fastestResponseTime: Number,
    slowestResponseTime: Number
  },
  
  // Delivery Performance
  deliveryMetrics: {
    totalDeliveries: {
      type: Number,
      default: 0
    },
    onTimeDeliveries: {
      type: Number,
      default: 0
    },
    delayedDeliveries: {
      type: Number,
      default: 0
    },
    failedDeliveries: {
      type: Number,
      default: 0
    },
    onTimeRate: {
      type: Number,
      default: 100,
      min: 0,
      max: 100
    },
    averageDeliveryTime: Number, // minutes
    temperatureCompliance: {
      type: Number,
      default: 100,
      min: 0,
      max: 100
    }
  },
  
  // Quality Metrics
  qualityMetrics: {
    totalTransactions: {
      type: Number,
      default: 0
    },
    qualityIssues: {
      type: Number,
      default: 0
    },
    qualityComplaints: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 5,
      min: 0,
      max: 5
    }
  },
  
  // Trust Score
  trustScore: {
    overall: {
      type: Number,
      default: 75,
      min: 0,
      max: 100
    },
    responseScore: {
      type: Number,
      default: 75,
      min: 0,
      max: 100
    },
    deliveryScore: {
      type: Number,
      default: 75,
      min: 0,
      max: 100
    },
    creditScore: {
      type: Number,
      default: 75,
      min: 0,
      max: 100
    },
    qualityScore: {
      type: Number,
      default: 75,
      min: 0,
      max: 100
    }
  },
  
  // Reliability Rating
  reliabilityRating: {
    type: String,
    enum: ['HIGHLY_RELIABLE', 'RELIABLE', 'MODERATE', 'LOW', 'UNRELIABLE'],
    default: 'RELIABLE'
  },
  
  // Transaction History
  transactions: [{
    transactionId: mongoose.Schema.Types.ObjectId,
    type: String, // BORROWED, LENT, RETURNED, RECEIVED_BACK
    bloodGroup: String,
    units: Number,
    partnerHospitalId: mongoose.Schema.Types.ObjectId,
    partnerHospitalName: String,
    date: Date,
    status: String, // COMPLETED, PENDING, FAILED
    notes: String
  }],
  
  // Penalties & Rewards
  penalties: [{
    date: Date,
    reason: String,
    type: String, // LATE_DELIVERY, NON_RETURN, QUALITY_ISSUE, NON_RESPONSE
    points: Number,
    resolvedAt: Date
  }],
  
  rewards: [{
    date: Date,
    reason: String,
    type: String, // FAST_RESPONSE, EXCELLENT_QUALITY, CONSISTENT_PERFORMANCE
    points: Number
  }],
  
  // Network Contribution
  networkContribution: {
    emergenciesHelped: {
      type: Number,
      default: 0
    },
    livesImpacted: {
      type: Number,
      default: 0
    },
    criticalSituationsHandled: {
      type: Number,
      default: 0
    },
    networkRank: Number, // Ranking among all hospitals
    contributionLevel: {
      type: String,
      enum: ['PLATINUM', 'GOLD', 'SILVER', 'BRONZE', 'STANDARD'],
      default: 'STANDARD'
    }
  },
  
  // Historical Performance Trend
  performanceTrend: {
    last30Days: {
      score: Number,
      requests: Number,
      deliveries: Number
    },
    last90Days: {
      score: Number,
      requests: Number,
      deliveries: Number
    },
    lastYear: {
      score: Number,
      requests: Number,
      deliveries: Number
    },
    trend: String // IMPROVING, STABLE, DECLINING
  },
  
  // Last Updated
  lastRecalculated: {
    type: Date,
    default: Date.now
  },
  
  // Flags
  isActive: {
    type: Boolean,
    default: true
  },
  isSuspended: {
    type: Boolean,
    default: false
  },
  suspensionReason: String,
  suspendedUntil: Date
  
}, {
  timestamps: true
});

// Indexes (hospitalId already indexed via unique: true in schema)
hospitalTrustLedgerSchema.index({ 'trustScore.overall': -1 });
hospitalTrustLedgerSchema.index({ reliabilityRating: 1 });
hospitalTrustLedgerSchema.index({ 'networkContribution.networkRank': 1 });

// Method to calculate trust scores
hospitalTrustLedgerSchema.methods.calculateTrustScores = function() {
  const { responseMetrics, deliveryMetrics, creditHistory, qualityMetrics } = this;
  
  // Response Score (0-100)
  let responseScore = 50;
  if (responseMetrics.totalRequestsReceived > 0) {
    responseScore = responseMetrics.acceptanceRate * 0.6; // 60% weight on acceptance
    
    // Bonus for fast response
    if (responseMetrics.averageResponseTime <= 10) responseScore += 20;
    else if (responseMetrics.averageResponseTime <= 20) responseScore += 10;
    else if (responseMetrics.averageResponseTime <= 30) responseScore += 5;
    
    // Penalty for timeouts
    if (responseMetrics.requestsTimeout > 0) {
      const timeoutRate = (responseMetrics.requestsTimeout / responseMetrics.totalRequestsReceived) * 100;
      responseScore -= Math.min(20, timeoutRate);
    }
  }
  
  // Delivery Score (0-100)
  let deliveryScore = 50;
  if (deliveryMetrics.totalDeliveries > 0) {
    deliveryScore = deliveryMetrics.onTimeRate * 0.7; // 70% weight on on-time delivery
    deliveryScore += deliveryMetrics.temperatureCompliance * 0.3; // 30% weight on temp compliance
    
    // Penalty for failures
    const failureRate = (deliveryMetrics.failedDeliveries / deliveryMetrics.totalDeliveries) * 100;
    deliveryScore -= Math.min(20, failureRate * 2);
  }
  
  // Credit Score (0-100)
  let creditScore = 75;
  const totalBorrowed = creditHistory.unitsBorrowed;
  const totalReturned = creditHistory.unitsReturned;
  
  if (totalBorrowed > 0) {
    const returnRate = (totalReturned / totalBorrowed) * 100;
    creditScore = returnRate * 0.8;
    
    // Penalty for outstanding debt
    if (creditHistory.outstandingDebt > 10) creditScore -= 20;
    else if (creditHistory.outstandingDebt > 5) creditScore -= 10;
    
    // Bonus for being a net lender
    if (creditHistory.unitsLent > creditHistory.unitsBorrowed) {
      creditScore = Math.min(100, creditScore + 20);
    }
  }
  
  // Quality Score (0-100)
  let qualityScore = 90;
  if (qualityMetrics.totalTransactions > 0) {
    qualityScore = (qualityMetrics.averageRating / 5) * 100;
    
    // Penalty for issues
    const issueRate = (qualityMetrics.qualityIssues / qualityMetrics.totalTransactions) * 100;
    qualityScore -= Math.min(30, issueRate * 3);
  }
  
  // Overall Score (weighted average)
  const overall = (
    responseScore * 0.3 +
    deliveryScore * 0.3 +
    creditScore * 0.2 +
    qualityScore * 0.2
  );
  
  this.trustScore = {
    overall: Math.round(overall),
    responseScore: Math.round(responseScore),
    deliveryScore: Math.round(deliveryScore),
    creditScore: Math.round(creditScore),
    qualityScore: Math.round(qualityScore)
  };
  
  // Update reliability rating
  if (overall >= 85) this.reliabilityRating = 'HIGHLY_RELIABLE';
  else if (overall >= 70) this.reliabilityRating = 'RELIABLE';
  else if (overall >= 50) this.reliabilityRating = 'MODERATE';
  else if (overall >= 30) this.reliabilityRating = 'LOW';
  else this.reliabilityRating = 'UNRELIABLE';
  
  this.lastRecalculated = new Date();
  
  return this.trustScore;
};

// Method to record a transaction
hospitalTrustLedgerSchema.methods.recordTransaction = function(type, bloodGroup, units, partnerHospital) {
  this.transactions.push({
    type,
    bloodGroup,
    units,
    partnerHospitalId: partnerHospital.id,
    partnerHospitalName: partnerHospital.name,
    date: new Date(),
    status: 'COMPLETED'
  });
  
  // Update credit history
  if (type === 'BORROWED') {
    this.creditHistory.unitsBorrowed += units;
    this.creditHistory.outstandingDebt += units;
  } else if (type === 'RETURNED') {
    this.creditHistory.unitsReturned += units;
    this.creditHistory.outstandingDebt = Math.max(0, this.creditHistory.outstandingDebt - units);
  } else if (type === 'LENT') {
    this.creditHistory.unitsLent += units;
  } else if (type === 'RECEIVED_BACK') {
    this.creditHistory.unitsReceivedBack += units;
  }
  
  this.qualityMetrics.totalTransactions += 1;
  this.networkContribution.emergenciesHelped += 1;
};

// Method to add penalty
hospitalTrustLedgerSchema.methods.addPenalty = function(reason, type, points) {
  this.penalties.push({
    date: new Date(),
    reason,
    type,
    points
  });
};

// Method to add reward
hospitalTrustLedgerSchema.methods.addReward = function(reason, type, points) {
  this.rewards.push({
    date: New(),
    reason,
    type,
    points
  });
};

// Static method to get top performers
hospitalTrustLedgerSchema.statics.getTopPerformers = async function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ 'trustScore.overall': -1 })
    .limit(limit)
    .populate('hospitalId', 'hospitalName city state');
};

// Static method to get network statistics
hospitalTrustLedgerSchema.statics.getNetworkStats = async function() {
  const stats = await this.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: null,
        avgTrustScore: { $avg: '$trustScore.overall' },
        totalEmergencies: { $sum: '$networkContribution.emergenciesHelped' },
        totalUnitsBorrowed: { $sum: '$creditHistory.unitsBorrowed' },
        totalUnitsLent: { $sum: '$creditHistory.unitsLent' }
      }
    }
  ]);
  
  return stats[0] || {};
};

module.exports = mongoose.model('HospitalTrustLedger', hospitalTrustLedgerSchema);
