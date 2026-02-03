/**
 * Emergency Blood Demand Calculation Utilities
 * Rule-based calculations for crisis scenarios
 */

// Standard blood group distribution in population
const BLOOD_GROUP_DISTRIBUTION = {
  'O+': 0.374,
  'O-': 0.066,
  'A+': 0.357,
  'A-': 0.063,
  'B+': 0.085,
  'B-': 0.015,
  'AB+': 0.034,
  'AB-': 0.006
};

// Blood units required per patient severity
const UNITS_PER_SEVERITY = {
  critical: { min: 2, max: 4, avg: 3 },
  moderate: { min: 1, max: 2, avg: 1.5 },
  minor: { min: 0, max: 0, avg: 0 }
};

// Rare blood groups
const RARE_BLOOD_GROUPS = ['O-', 'AB-', 'A-', 'B-'];

/**
 * Calculate total projected blood demand from casualties
 */
function calculateBloodDemand(casualties, severityDistribution) {
  const { criticalPercentage = 30, moderatePercentage = 40, minorPercentage = 30 } = severityDistribution;
  
  const critical = Math.round(casualties * (criticalPercentage / 100));
  const moderate = Math.round(casualties * (moderatePercentage / 100));
  const minor = casualties - critical - moderate;
  
  const totalUnits = 
    (critical * UNITS_PER_SEVERITY.critical.avg) +
    (moderate * UNITS_PER_SEVERITY.moderate.avg) +
    (minor * UNITS_PER_SEVERITY.minor.avg);
  
  return {
    totalUnits: Math.round(totalUnits),
    bySeverity: { critical, moderate, minor },
    unitsBySeverity: {
      critical: Math.round(critical * UNITS_PER_SEVERITY.critical.avg),
      moderate: Math.round(moderate * UNITS_PER_SEVERITY.moderate.avg),
      minor: 0
    }
  };
}

/**
 * Distribute blood demand by blood group
 */
function distributeByBloodGroup(totalUnits) {
  const distribution = {};
  
  Object.entries(BLOOD_GROUP_DISTRIBUTION).forEach(([group, percentage]) => {
    distribution[group] = Math.round(totalUnits * percentage);
  });
  
  return distribution;
}

/**
 * Calculate emergency demand score (0-100)
 */
function calculateEmergencyScore(casualties, totalUnits) {
  // Base score on casualties and units required
  let score = Math.min(100, (casualties / 10) * 10 + (totalUnits / 50) * 20);
  
  // Adjust for severity
  if (casualties > 100) score = Math.min(100, score + 20);
  if (totalUnits > 300) score = Math.min(100, score + 20);
  
  return Math.round(score);
}

/**
 * Calculate rare blood pressure index
 */
function calculateRareBloodPressure(demandByGroup) {
  let rareBloodDemand = 0;
  let totalDemand = 0;
  
  Object.entries(demandByGroup).forEach(([group, units]) => {
    totalDemand += units;
    if (RARE_BLOOD_GROUPS.includes(group)) {
      rareBloodDemand += units * 2; // Weight rare blood more heavily
    }
  });
  
  const pressureIndex = Math.min(100, (rareBloodDemand / totalDemand) * 100);
  return Math.round(pressureIndex);
}

/**
 * Calculate distance between two geo-coordinates (Haversine formula)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10; // Round to 1 decimal
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Determine hospital impact level based on distance
 */
function determineImpactLevel(distance) {
  if (distance <= 5) return 'primary';
  if (distance <= 15) return 'secondary';
  return 'tertiary';
}

/**
 * Calculate time to shortage for a hospital
 */
function calculateTimeToShortage(availableUnits, demandUnits, usageRatePerHour = 2) {
  const deficit = demandUnits - availableUnits;
  
  if (deficit <= 0) return null; // No shortage expected
  
  // Estimate hours until shortage based on normal usage + emergency demand
  const emergencyRate = Math.max(usageRatePerHour, demandUnits / 6); // Assume 6-hour emergency window
  const hoursToShortage = availableUnits / emergencyRate;
  
  return Math.max(0, Math.round(hoursToShortage * 10) / 10);
}

/**
 * Assess overall risk level for a hospital
 */
function assessRiskLevel(timeToShortage, demandVsAvailable) {
  if (!timeToShortage || timeToShortage > 12) return 'LOW';
  if (timeToShortage > 6) return 'MEDIUM';
  if (timeToShortage > 2) return 'HIGH';
  return 'CRITICAL';
}

/**
 * Generate preemptive recommendations
 */
function generateRecommendations(hospitalImpacts, demandByGroup, rareBloodPressure) {
  const recommendations = [];
  
  // Check for critical hospitals
  const criticalHospitals = hospitalImpacts.filter(h => h.overallRiskLevel === 'CRITICAL');
  if (criticalHospitals.length > 0) {
    recommendations.push({
      type: 'LOCK_EMERGENCY_UNITS',
      priority: 'CRITICAL',
      description: `Lock emergency blood units at ${criticalHospitals.length} critical hospitals`,
      targetHospitals: criticalHospitals.map(h => h.hospitalId),
      estimatedImpact: 'Preserves critical inventory for emergency cases'
    });
  }
  
  // Check for inter-hospital transfers needed
  const hospitalInNeed = hospitalImpacts.filter(h => h.timeToShortage && h.timeToShortage < 6);
  const hospitalWithSurplus = hospitalImpacts.filter(h => !h.timeToShortage);
  
  if (hospitalInNeed.length > 0 && hospitalWithSurplus.length > 0) {
    recommendations.push({
      type: 'INTER_HOSPITAL_TRANSFER',
      priority: 'HIGH',
      description: `Initiate blood transfers to ${hospitalInNeed.length} hospitals facing shortage`,
      targetHospitals: hospitalInNeed.map(h => h.hospitalId),
      estimatedImpact: 'Redistributes blood inventory to high-need areas'
    });
  }
  
  // Donor activation for rare blood
  if (rareBloodPressure > 60) {
    const rareGroupsNeeded = Object.entries(demandByGroup)
      .filter(([group, units]) => RARE_BLOOD_GROUPS.includes(group) && units > 10)
      .map(([group]) => group);
    
    if (rareGroupsNeeded.length > 0) {
      recommendations.push({
        type: 'ACTIVATE_DONOR_ALERTS',
        priority: 'HIGH',
        description: `Activate targeted donor alerts for rare blood groups: ${rareGroupsNeeded.join(', ')}`,
        targetBloodGroups: rareGroupsNeeded,
        estimatedImpact: 'Increases availability of critical rare blood types'
      });
    }
  }
  
  // Postpone elective procedures
  const highRiskHospitals = hospitalImpacts.filter(h => 
    h.overallRiskLevel === 'HIGH' || h.overallRiskLevel === 'CRITICAL'
  );
  
  if (highRiskHospitals.length > 0) {
    recommendations.push({
      type: 'POSTPONE_ELECTIVE_PROCEDURES',
      priority: 'MEDIUM',
      description: `Recommend postponement of elective procedures at ${highRiskHospitals.length} hospitals`,
      targetHospitals: highRiskHospitals.map(h => h.hospitalId),
      estimatedImpact: 'Conserves blood inventory for emergency use'
    });
  }
  
  return recommendations;
}

module.exports = {
  calculateBloodDemand,
  distributeByBloodGroup,
  calculateEmergencyScore,
  calculateRareBloodPressure,
  calculateDistance,
  determineImpactLevel,
  calculateTimeToShortage,
  assessRiskLevel,
  generateRecommendations,
  BLOOD_GROUP_DISTRIBUTION,
  RARE_BLOOD_GROUPS
};
