/**
 * Hospital Matching Service
 * 
 * Purpose: Intelligently match emergency requests with best partner hospitals
 * 
 * Algorithm considers:
 * - Distance
 * - Blood availability
 * - Response history
 * - Trust score
 * - Current workload
 */

const HospitalProfile = require('../models/HospitalProfile');
const BloodInventory = require('../models/BloodInventory');
const HospitalTrustLedger = require('../models/HospitalTrustLedger');
const User = require('../models/User');

/**
 * Calculate distance using Haversine formula
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Find matching hospitals for emergency request
 * @param {Object} request - Emergency request details
 * @returns {Array} - Ranked list of matching hospitals
 */
async function findMatchingHospitals(request) {
  const {
    requestingHospitalId,
    bloodGroup,
    unitsRequired,
    severityLevel,
    requestingLocation
  } = request;

  try {
    // Find all active hospitals except requesting one
    const hospitals = await User.find({
      role: 'HOSPITAL_ADMIN',
      _id: { $ne: requestingHospitalId },
      isActive: true,
      verificationStatus: 'approved'
    }).select('_id hospitalName location phone email');

    if (!hospitals || hospitals.length === 0) {
      return [];
    }

    const matches = [];

    for (const hospital of hospitals) {
      // Skip if no location data
      if (!hospital.location || !hospital.location.coordinates) {
        continue;
      }

      // Calculate distance
      const [hospLon, hospLat] = hospital.location.coordinates;
      const [reqLon, reqLat] = requestingLocation || [0, 0];
      const distance = calculateDistance(reqLat, reqLon, hospLat, hospLon);

      // Get blood inventory for this hospital
      const inventory = await BloodInventory.findOne({
        hospitalId: hospital._id,
        bloodGroup: bloodGroup
      });

      const availableUnits = inventory ? inventory.unitsAvailable : 0;

      // Skip if no blood available
      if (availableUnits === 0) {
        continue;
      }

      // Get trust ledger
      let trustLedger = await HospitalTrustLedger.findOne({
        hospitalId: hospital._id
      });

      // Create default if doesn't exist
      if (!trustLedger) {
        trustLedger = new HospitalTrustLedger({
          hospitalId: hospital._id,
          hospitalName: hospital.hospitalName
        });
        await trustLedger.save();
      }

      // Calculate matching score
      const matchScore = calculateMatchScore({
        distance,
        availableUnits,
        unitsRequired,
        trustScore: trustLedger.trustScore.overall,
        responseMetrics: trustLedger.responseMetrics,
        severityLevel
      });

      // Estimate response and arrival time
      const estimatedResponseTime = estimateResponseTime(
        distance,
        trustLedger.responseMetrics.averageResponseTime
      );
      const estimatedArrival = estimateArrivalTime(distance);

      // Determine confidence level
      const confidenceLevel = determineConfidenceLevel(
        matchScore,
        availableUnits,
        unitsRequired,
        trustLedger.responseMetrics.acceptanceRate
      );

      matches.push({
        hospitalId: hospital._id,
        hospitalName: hospital.hospitalName,
        matchScore: Math.round(matchScore),
        distance: parseFloat(distance.toFixed(2)),
        availableUnits,
        responseTime: estimatedResponseTime,
        trustScore: trustLedger.trustScore.overall,
        reliabilityRating: trustLedger.reliabilityRating,
        confidenceLevel,
        estimatedArrival,
        contact: {
          phone: hospital.phone,
          email: hospital.email
        },
        location: {
          latitude: hospLat,
          longitude: hospLon
        }
      });
    }

    // Sort by match score (highest first)
    matches.sort((a, b) => b.matchScore - a.matchScore);

    return matches;

  } catch (error) {
    console.error('Error in findMatchingHospitals:', error);
    throw error;
  }
}

/**
 * Calculate match score (0-100)
 */
function calculateMatchScore(params) {
  const {
    distance,
    availableUnits,
    unitsRequired,
    trustScore,
    responseMetrics,
    severityLevel
  } = params;

  let score = 0;

  // Distance score (30 points max)
  // Closer is better, exponential decay
  if (distance <= 5) score += 30;
  else if (distance <= 10) score += 25;
  else if (distance <= 20) score += 20;
  else if (distance <= 30) score += 15;
  else if (distance <= 50) score += 10;
  else score += 5;

  // Availability score (30 points max)
  const availabilityRatio = availableUnits / unitsRequired;
  if (availabilityRatio >= 3) score += 30; // 3x or more available
  else if (availabilityRatio >= 2) score += 25; // 2x available
  else if (availabilityRatio >= 1.5) score += 20; // 1.5x available
  else if (availabilityRatio >= 1) score += 15; // Just enough
  else score += 10; // Some available but not enough

  // Trust score (25 points max)
  score += (trustScore / 100) * 25;

  // Response history (15 points max)
  if (responseMetrics && responseMetrics.totalRequestsReceived > 0) {
    const acceptanceRate = responseMetrics.acceptanceRate || 50;
    score += (acceptanceRate / 100) * 10;

    // Bonus for fast average response
    if (responseMetrics.averageResponseTime <= 5) score += 5;
    else if (responseMetrics.averageResponseTime <= 10) score += 3;
    else if (responseMetrics.averageResponseTime <= 15) score += 1;
  } else {
    // New hospital with no history - neutral score
    score += 10;
  }

  // Severity bonus - prioritize critical cases
  if (severityLevel === 'CRITICAL' && distance <= 15) {
    score += 5; // Bonus for nearby hospitals in critical cases
  }

  return Math.min(score, 100);
}

/**
 * Estimate response time in minutes
 */
function estimateResponseTime(distance, historicalAvg = 15) {
  // Base on distance and historical average
  const distanceTime = distance * 0.5; // Assume processing delays
  const estimated = (historicalAvg * 0.7) + (distanceTime * 0.3);
  return Math.round(estimated);
}

/**
 * Estimate arrival time
 */
function estimateArrivalTime(distance) {
  // Assume average 40 km/h in city traffic for emergency
  const travelTime = (distance / 40) * 60; // in minutes
  const preparationTime = 15; // 15 minutes prep time
  const totalMinutes = travelTime + preparationTime;
  
  const arrival = new Date(Date.now() + totalMinutes * 60000);
  return arrival;
}

/**
 * Determine confidence level
 */
function determineConfidenceLevel(matchScore, availableUnits, required, acceptanceRate = 75) {
  if (matchScore >= 80 && availableUnits >= required * 1.5 && acceptanceRate >= 80) {
    return 'HIGH';
  } else if (matchScore >= 60 && availableUnits >= required && acceptanceRate >= 60) {
    return 'MEDIUM';
  } else {
    return 'LOW';
  }
}

/**
 * Get escalation hospitals
 * Returns hospitals for escalation levels
 */
async function getEscalationHospitals(request, level) {
  const allMatches = await findMatchingHospitals(request);
  
  if (level === 1) {
    // Level 1: Top 3 nearest hospitals
    return allMatches.slice(0, 3);
  } else if (level === 2) {
    // Level 2: Next 5-7 hospitals
    return allMatches.slice(3, 10);
  } else if (level === 3) {
    // Level 3: All remaining hospitals
    return allMatches.slice(10);
  }
  
  return allMatches;
}

/**
 * Predict response probability
 */
function predictResponseProbability(hospital, request) {
  const { matchScore, trustScore, reliabilityRating, availableUnits } = hospital;
  const { unitsRequired, severityLevel } = request;

  let probability = 50; // Base 50%

  // Match score contribution (30%)
  probability += (matchScore / 100) * 30;

  // Trust score contribution (20%)
  probability += (trustScore / 100) * 20;

  // Availability contribution (20%)
  const availabilityRatio = availableUnits / unitsRequired;
  if (availabilityRatio >= 2) probability += 20;
  else if (availabilityRatio >= 1) probability += 15;
  else probability += 5;

  // Reliability rating contribution (15%)
  const reliabilityBonus = {
    'HIGHLY_RELIABLE': 15,
    'RELIABLE': 10,
    'MODERATE': 5,
    'LOW': 0,
    'UNRELIABLE': -10
  };
  probability += reliabilityBonus[reliabilityRating] || 0;

  // Severity bonus (15%)
  if (severityLevel === 'CRITICAL') probability += 15;
  else if (severityLevel === 'HIGH') probability += 10;
  else probability += 5;

  return Math.min(Math.max(probability, 0), 100);
}

/**
 * Calculate risk of failure
 */
function calculateFailureRisk(hospital, request) {
  const probability = predictResponseProbability(hospital, request);
  return 100 - probability;
}

module.exports = {
  findMatchingHospitals,
  calculateMatchScore,
  getEscalationHospitals,
  predictResponseProbability,
  calculateFailureRisk,
  estimateResponseTime,
  estimateArrivalTime
};
