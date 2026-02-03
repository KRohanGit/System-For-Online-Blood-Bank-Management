/**
 * Blood Demand Urgency Index Calculator
 * Rule-based deterministic scoring system
 */

// Rare blood group weights (0-30 points)
const BLOOD_GROUP_WEIGHTS = {
  'O-': 30,
  'AB-': 28,
  'B-': 25,
  'A-': 22,
  'AB+': 18,
  'O+': 15,
  'B+': 12,
  'A+': 10
};

// Quantity thresholds (0-25 points)
const getQuantityScore = (units) => {
  if (units >= 10) return 25;
  if (units >= 7) return 20;
  if (units >= 5) return 15;
  if (units >= 3) return 10;
  if (units >= 2) return 5;
  return 2;
};

// Expiry proximity score (0-25 points)
const getExpiryScore = (expiryHours) => {
  if (!expiryHours) return 0;
  if (expiryHours < 24) return 25;
  if (expiryHours < 48) return 20;
  if (expiryHours < 72) return 15;
  if (expiryHours < 120) return 10;
  if (expiryHours < 168) return 5;
  return 0;
};

// Nearby hospital stock score (0-20 points)
const getStockScore = (nearbyStock, unitsNeeded) => {
  if (!nearbyStock || nearbyStock.length === 0) return 20; // No nearby stock = high urgency
  
  const totalNearbyUnits = nearbyStock.reduce((sum, hospital) => sum + (hospital.units || 0), 0);
  
  if (totalNearbyUnits === 0) return 20;
  if (totalNearbyUnits < unitsNeeded) return 15;
  if (totalNearbyUnits < unitsNeeded * 2) return 10;
  if (totalNearbyUnits < unitsNeeded * 3) return 5;
  return 2;
};

/**
 * Calculate urgency score and generate breakdown
 * @param {Object} request - Blood request object
 * @returns {Object} - { score, label, color, breakdown }
 */
export const calculateUrgencyIndex = (request) => {
  const {
    bloodGroup,
    unitsRequired = 0,
    expiryHours = null,
    nearbyStock = []
  } = request;

  // Calculate individual scores
  const bloodGroupScore = BLOOD_GROUP_WEIGHTS[bloodGroup] || 10;
  const quantityScore = getQuantityScore(unitsRequired);
  const expiryScore = getExpiryScore(expiryHours);
  const stockScore = getStockScore(nearbyStock, unitsRequired);

  // Total score (0-100)
  const totalScore = Math.min(100, bloodGroupScore + quantityScore + expiryScore + stockScore);

  // Determine urgency label
  let label, color;
  if (totalScore >= 80) {
    label = 'CRITICAL';
    color = '#dc2626'; // red
  } else if (totalScore >= 60) {
    label = 'HIGH';
    color = '#ea580c'; // orange
  } else if (totalScore >= 40) {
    label = 'MEDIUM';
    color = '#f59e0b'; // amber
  } else {
    label = 'LOW';
    color = '#10b981'; // green
  }

  // Generate explanation breakdown
  const breakdown = [
    {
      factor: 'Blood Group Rarity',
      score: bloodGroupScore,
      maxScore: 30,
      reason: `${bloodGroup} is ${bloodGroupScore >= 25 ? 'extremely rare' : bloodGroupScore >= 20 ? 'rare' : bloodGroupScore >= 15 ? 'uncommon' : 'common'}`
    },
    {
      factor: 'Quantity Required',
      score: quantityScore,
      maxScore: 25,
      reason: `${unitsRequired} units needed (${unitsRequired >= 7 ? 'high volume' : unitsRequired >= 3 ? 'moderate volume' : 'low volume'})`
    },
    {
      factor: 'Expiry Proximity',
      score: expiryScore,
      maxScore: 25,
      reason: expiryHours 
        ? `Expiring in ${Math.round(expiryHours)} hours (${expiryHours < 48 ? 'urgent' : expiryHours < 120 ? 'soon' : 'normal'})`
        : 'No expiry constraint'
    },
    {
      factor: 'Nearby Stock Availability',
      score: stockScore,
      maxScore: 20,
      reason: nearbyStock.length > 0 
        ? `${nearbyStock.length} hospitals nearby with limited stock`
        : 'No nearby hospitals with stock'
    }
  ];

  return {
    score: Math.round(totalScore),
    label,
    color,
    breakdown
  };
};

/**
 * Get urgency badge component data
 */
export const getUrgencyBadge = (score) => {
  if (score >= 80) return { label: 'CRITICAL', color: '#dc2626', icon: '🚨' };
  if (score >= 60) return { label: 'HIGH', color: '#ea580c', icon: '⚠️' };
  if (score >= 40) return { label: 'MEDIUM', color: '#f59e0b', icon: '⚡' };
  return { label: 'LOW', color: '#10b981', icon: '✓' };
};

export default calculateUrgencyIndex;
