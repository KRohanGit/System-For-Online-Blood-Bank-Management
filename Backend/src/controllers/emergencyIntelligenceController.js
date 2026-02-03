const EmergencyScenario = require('../models/EmergencyScenario');
const HospitalProfile = require('../models/HospitalProfile');
const BloodInventory = require('../models/BloodInventory');
const {
  calculateBloodDemand,
  distributeByBloodGroup,
  calculateEmergencyScore,
  calculateRareBloodPressure,
  calculateDistance,
  determineImpactLevel,
  calculateTimeToShortage,
  assessRiskLevel,
  generateRecommendations
} = require('../utils/emergencyCalculations');

/**
 * Create a new emergency scenario
 * @access Super Admin, Hospital Admin
 */
exports.createScenario = async (req, res) => {
  try {
    const {
      incidentType,
      incidentLocation,
      estimatedCasualties,
      incidentTime,
      severityDistribution,
      notes
    } = req.body;
    
    // Validate input
    if (!incidentType || !incidentLocation || !estimatedCasualties) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Calculate blood demand
    const demandCalc = calculateBloodDemand(estimatedCasualties, severityDistribution);
    const demandByGroup = distributeByBloodGroup(demandCalc.totalUnits);
    const emergencyScore = calculateEmergencyScore(estimatedCasualties, demandCalc.totalUnits);
    const rareBloodPressure = calculateRareBloodPressure(demandByGroup);
    
    // Analyze hospital impacts
    const hospitalImpacts = await analyzeHospitalImpacts(
      incidentLocation,
      demandByGroup,
      demandCalc.totalUnits
    );
    
    // Generate crisis propagation timeline
    const propagationTimeline = generatePropagationTimeline(hospitalImpacts);
    
    // Generate recommendations
    const recommendations = generateRecommendations(
      hospitalImpacts,
      demandByGroup,
      rareBloodPressure
    );
    
    // Calculate city preparedness
    const cityPreparedness = calculateCityPreparedness(hospitalImpacts);
    
    // Create scenario
    const scenario = await EmergencyScenario.create({
      incidentType,
      incidentLocation,
      estimatedCasualties,
      incidentTime: incidentTime || new Date(),
      severityDistribution,
      projectedBloodDemand: {
        totalUnits: demandCalc.totalUnits,
        byBloodGroup: demandByGroup,
        emergencyDemandScore: emergencyScore,
        rareBloodPressureIndex: rareBloodPressure
      },
      hospitalImpacts,
      propagationTimeline,
      recommendations,
      cityPreparednessIndex: cityPreparedness,
      notes,
      createdBy: req.user.id,
      isSimulation: true,
      scenarioStatus: 'simulation'
    });
    
    res.status(201).json({
      success: true,
      message: 'Emergency scenario created successfully',
      data: scenario
    });
    
  } catch (error) {
    console.error('Create scenario error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create scenario',
      error: error.message
    });
  }
};

/**
 * Analyze hospital impacts for a given incident location
 */
async function analyzeHospitalImpacts(incidentLocation, demandByGroup, totalDemand) {
  const { latitude, longitude, city } = incidentLocation;
  
  // Get all hospitals in the city (or nearby)
  let hospitals = await HospitalProfile.find({
    verificationStatus: 'approved',
    // Add city filter if needed
  }).populate('userId', 'email').lean();
  
  // DUMMY DATA: Add Vizag hospitals if database is empty
  if (hospitals.length === 0) {
    hospitals = [
      {
        _id: 'dummy-hospital-vizag-1',
        hospitalName: 'King George Hospital (KGH)',
        location: { latitude: 17.7231, longitude: 83.3012 },
        address: 'Maharani Peta, Visakhapatnam, Andhra Pradesh 530002',
        phone: '+91 891 256 2555'
      },
      {
        _id: 'dummy-hospital-vizag-2',
        hospitalName: 'Queen Mary Hospital',
        location: { latitude: 17.7145, longitude: 83.3089 },
        address: 'Beach Road, Visakhapatnam, Andhra Pradesh 530001',
        phone: '+91 891 256 1234'
      },
      {
        _id: 'dummy-hospital-vizag-3',
        hospitalName: 'GITAM Institute of Medical Sciences',
        location: { latitude: 17.7842, longitude: 83.3776 },
        address: 'Rushikonda, Visakhapatnam, Andhra Pradesh 530045',
        phone: '+91 891 280 5555'
      },
      {
        _id: 'dummy-hospital-vizag-4',
        hospitalName: 'Seven Hills Hospital',
        location: { latitude: 17.7306, longitude: 83.3185 },
        address: 'Rockdale Layout, Visakhapatnam, Andhra Pradesh 530002',
        phone: '+91 891 278 4444'
      },
      {
        _id: 'dummy-hospital-vizag-5',
        hospitalName: 'Apollo Hospitals',
        location: { latitude: 17.7452, longitude: 83.3142 },
        address: 'Waltair Main Road, Visakhapatnam, Andhra Pradesh 530002',
        phone: '+91 891 254 0000'
      },
      {
        _id: 'dummy-hospital-vizag-6',
        hospitalName: 'Care Hospital',
        location: { latitude: 17.7398, longitude: 83.3252 },
        address: 'Ramnagar, Visakhapatnam, Andhra Pradesh 530002',
        phone: '+91 891 667 1000'
      }
    ];
  }
  
  const impacts = [];
  
  for (const hospital of hospitals) {
    // Calculate distance from incident
    const hospitalLat = hospital.location?.latitude || 0;
    const hospitalLon = hospital.location?.longitude || 0;
    
    if (!hospitalLat || !hospitalLon) continue;
    
    const distance = calculateDistance(latitude, longitude, hospitalLat, hospitalLon);
    
    // Only include hospitals within 50km radius
    if (distance > 50) continue;
    
    const impactLevel = determineImpactLevel(distance);
    
    // Get current blood inventory for this hospital
    let inventory = await BloodInventory.find({
      hospitalId: hospital._id,
      status: 'Available'
    }).lean();
    
    // DUMMY DATA: Generate realistic inventory if none exists
    if (inventory.length === 0 && hospital._id.toString().startsWith('dummy-')) {
      // Varied inventory levels for different hospitals
      const inventoryLevels = {
        'dummy-hospital-vizag-1': { 'A+': 45, 'O+': 38, 'B+': 28, 'AB+': 15, 'A-': 8, 'O-': 12, 'B-': 6, 'AB-': 3 }, // KGH - largest
        'dummy-hospital-vizag-2': { 'A+': 22, 'O+': 18, 'B+': 15, 'AB+': 8, 'A-': 4, 'O-': 6, 'B-': 3, 'AB-': 2 },
        'dummy-hospital-vizag-3': { 'A+': 35, 'O+': 30, 'B+': 20, 'AB+': 12, 'A-': 6, 'O-': 8, 'B-': 4, 'AB-': 2 }, // GITAM
        'dummy-hospital-vizag-4': { 'A+': 18, 'O+': 15, 'B+': 12, 'AB+': 6, 'A-': 3, 'O-': 4, 'B-': 2, 'AB-': 1 },
        'dummy-hospital-vizag-5': { 'A+': 28, 'O+': 25, 'B+': 18, 'AB+': 10, 'A-': 5, 'O-': 7, 'B-': 3, 'AB-': 2 }, // Apollo
        'dummy-hospital-vizag-6': { 'A+': 20, 'O+': 17, 'B+': 14, 'AB+': 7, 'A-': 4, 'O-': 5, 'B-': 2, 'AB-': 1 }
      };
      
      inventory = Object.entries(inventoryLevels[hospital._id] || {}).map(([bloodGroup, count]) => ({
        bloodGroup,
        quantity: count
      }));
    }
    
    // Aggregate available units by blood group
    const availableUnits = {};
    inventory.forEach(unit => {
      if (unit.quantity) {
        availableUnits[unit.bloodGroup] = unit.quantity;
      } else {
        availableUnits[unit.bloodGroup] = (availableUnits[unit.bloodGroup] || 0) + 1;
      }
    });
    
    // Calculate projected demand based on impact level
    const demandMultiplier = impactLevel === 'primary' ? 0.6 : 
                            impactLevel === 'secondary' ? 0.3 : 0.1;
    
    const projectedDemand = {};
    let totalProjectedDemand = 0;
    Object.entries(demandByGroup).forEach(([group, units]) => {
      projectedDemand[group] = Math.round(units * demandMultiplier);
      totalProjectedDemand += projectedDemand[group];
    });
    
    // Calculate blood group specific risks
    const bloodGroupRisks = {};
    Object.keys(demandByGroup).forEach(group => {
      const available = availableUnits[group] || 0;
      const demand = projectedDemand[group] || 0;
      const deficit = demand - available;
      
      bloodGroupRisks[group] = {
        available,
        demand,
        deficit: Math.max(0, deficit),
        riskLevel: deficit > 0 ? (deficit > 10 ? 'CRITICAL' : 'HIGH') : 'LOW'
      };
    });
    
    // Calculate time to shortage
    const totalAvailable = Object.values(availableUnits).reduce((sum, val) => sum + val, 0);
    const timeToShortage = calculateTimeToShortage(totalAvailable, totalProjectedDemand);
    
    // Assess overall risk
    const overallRiskLevel = assessRiskLevel(timeToShortage, totalProjectedDemand / totalAvailable);
    
    impacts.push({
      hospitalId: hospital._id,
      hospitalName: hospital.hospitalName,
      distance,
      impactLevel,
      availableUnits,
      projectedDemand,
      timeToShortage,
      bloodGroupRisks,
      overallRiskLevel
    });
  }
  
  // Sort by distance (closest first)
  impacts.sort((a, b) => a.distance - b.distance);
  
  return impacts;
}

/**
 * Generate propagation timeline
 */
function generatePropagationTimeline(hospitalImpacts) {
  const immediate = hospitalImpacts.filter(h => 
    h.timeToShortage !== null && h.timeToShortage <= 2
  );
  
  const shortTerm = hospitalImpacts.filter(h => 
    h.timeToShortage !== null && h.timeToShortage > 2 && h.timeToShortage <= 6
  );
  
  const critical = hospitalImpacts.filter(h => 
    h.timeToShortage !== null && h.timeToShortage > 6 && h.timeToShortage <= 12
  );
  
  return {
    immediate: {
      affectedHospitals: immediate.map(h => h.hospitalId),
      shortageRisk: immediate.length > 0 ? 'CRITICAL' : 'LOW',
      summary: `${immediate.length} hospitals at immediate risk (0-2 hours)`
    },
    shortTerm: {
      affectedHospitals: shortTerm.map(h => h.hospitalId),
      shortageRisk: shortTerm.length > 3 ? 'HIGH' : shortTerm.length > 0 ? 'MEDIUM' : 'LOW',
      summary: `${shortTerm.length} hospitals at short-term risk (2-6 hours)`
    },
    critical: {
      affectedHospitals: critical.map(h => h.hospitalId),
      shortageRisk: critical.length > 5 ? 'HIGH' : critical.length > 0 ? 'MEDIUM' : 'LOW',
      summary: `${critical.length} hospitals at critical risk (6-12 hours)`
    }
  };
}

/**
 * Calculate city preparedness index
 */
function calculateCityPreparedness(hospitalImpacts) {
  const totalHospitals = hospitalImpacts.length;
  if (totalHospitals === 0) {
    return { score: 0, factors: {} };
  }
  
  // Inventory level score
  const hospitalsWithGoodInventory = hospitalImpacts.filter(h => 
    !h.timeToShortage || h.timeToShortage > 12
  ).length;
  const inventoryLevel = (hospitalsWithGoodInventory / totalHospitals) * 100;
  
  // Hospital capacity (based on risk levels)
  const lowRiskHospitals = hospitalImpacts.filter(h => h.overallRiskLevel === 'LOW').length;
  const hospitalCapacity = (lowRiskHospitals / totalHospitals) * 100;
  
  // Response readiness (inverse of critical hospitals)
  const criticalHospitals = hospitalImpacts.filter(h => h.overallRiskLevel === 'CRITICAL').length;
  const responseReadiness = Math.max(0, 100 - (criticalHospitals / totalHospitals) * 200);
  
  // Overall score (weighted average)
  const score = Math.round(
    (inventoryLevel * 0.4) +
    (hospitalCapacity * 0.3) +
    (responseReadiness * 0.3)
  );
  
  return {
    score,
    factors: {
      inventoryLevel: Math.round(inventoryLevel),
      hospitalCapacity: Math.round(hospitalCapacity),
      responseReadiness: Math.round(responseReadiness),
      donorAvailability: 50 // Placeholder - would need donor data
    }
  };
}

/**
 * Get all scenarios
 * @access Super Admin, Hospital Admin, Doctor (read-only)
 */
exports.getAllScenarios = async (req, res) => {
  try {
    const { status, isSimulation, city } = req.query;
    
    const query = {};
    if (status) query.scenarioStatus = status;
    if (isSimulation !== undefined) query.isSimulation = isSimulation === 'true';
    if (city) query['incidentLocation.city'] = city;
    
    const scenarios = await EmergencyScenario.find(query)
      .populate('createdBy', 'email role')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    
    res.status(200).json({
      success: true,
      count: scenarios.length,
      data: scenarios
    });
    
  } catch (error) {
    console.error('Get scenarios error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scenarios',
      error: error.message
    });
  }
};

/**
 * Get scenario by ID
 */
exports.getScenarioById = async (req, res) => {
  try {
    const scenario = await EmergencyScenario.findById(req.params.id)
      .populate('createdBy', 'email role')
      .populate('hospitalImpacts.hospitalId', 'hospitalName address phone')
      .lean();
    
    if (!scenario) {
      return res.status(404).json({
        success: false,
        message: 'Scenario not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: scenario
    });
    
  } catch (error) {
    console.error('Get scenario error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scenario',
      error: error.message
    });
  }
};

/**
 * Re-run simulation with modified inputs
 * @access Super Admin, Hospital Admin
 */
exports.rerunSimulation = async (req, res) => {
  try {
    const scenario = await EmergencyScenario.findById(req.params.id);
    
    if (!scenario) {
      return res.status(404).json({
        success: false,
        message: 'Scenario not found'
      });
    }
    
    const { estimatedCasualties, severityDistribution } = req.body;
    
    // Use modified values or original
    const casualties = estimatedCasualties || scenario.estimatedCasualties;
    const severity = severityDistribution || scenario.severityDistribution;
    
    // Recalculate everything
    const demandCalc = calculateBloodDemand(casualties, severity);
    const demandByGroup = distributeByBloodGroup(demandCalc.totalUnits);
    const emergencyScore = calculateEmergencyScore(casualties, demandCalc.totalUnits);
    const rareBloodPressure = calculateRareBloodPressure(demandByGroup);
    
    const hospitalImpacts = await analyzeHospitalImpacts(
      scenario.incidentLocation,
      demandByGroup,
      demandCalc.totalUnits
    );
    
    const propagationTimeline = generatePropagationTimeline(hospitalImpacts);
    const recommendations = generateRecommendations(hospitalImpacts, demandByGroup, rareBloodPressure);
    const cityPreparedness = calculateCityPreparedness(hospitalImpacts);
    
    // Update scenario
    scenario.estimatedCasualties = casualties;
    scenario.severityDistribution = severity;
    scenario.projectedBloodDemand = {
      totalUnits: demandCalc.totalUnits,
      byBloodGroup: demandByGroup,
      emergencyDemandScore: emergencyScore,
      rareBloodPressureIndex: rareBloodPressure
    };
    scenario.hospitalImpacts = hospitalImpacts;
    scenario.propagationTimeline = propagationTimeline;
    scenario.recommendations = recommendations;
    scenario.cityPreparednessIndex = cityPreparedness;
    scenario.lastModifiedBy = req.user.id;
    
    // Log simulation run
    scenario.simulationRuns.push({
      runAt: new Date(),
      runBy: req.user.id,
      modifications: { estimatedCasualties, severityDistribution },
      results: { emergencyScore, rareBloodPressure }
    });
    
    await scenario.save();
    
    res.status(200).json({
      success: true,
      message: 'Simulation re-run successfully',
      data: scenario
    });
    
  } catch (error) {
    console.error('Rerun simulation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to re-run simulation',
      error: error.message
    });
  }
};

/**
 * Approve/reject a recommendation
 * @access Super Admin, Hospital Admin
 */
exports.updateRecommendation = async (req, res) => {
  try {
    const { scenarioId, recommendationIndex } = req.params;
    const { approved, notes } = req.body;
    
    const scenario = await EmergencyScenario.findById(scenarioId);
    
    if (!scenario) {
      return res.status(404).json({
        success: false,
        message: 'Scenario not found'
      });
    }
    
    if (!scenario.recommendations[recommendationIndex]) {
      return res.status(404).json({
        success: false,
        message: 'Recommendation not found'
      });
    }
    
    scenario.recommendations[recommendationIndex].approved = approved;
    scenario.recommendations[recommendationIndex].approvedBy = req.user.id;
    scenario.recommendations[recommendationIndex].approvedAt = new Date();
    
    // Log admin decision
    scenario.adminDecisions.push({
      decision: approved ? 'APPROVED' : 'REJECTED',
      decisionBy: req.user.id,
      decidedAt: new Date(),
      notes: notes || `Recommendation ${recommendationIndex + 1}: ${approved ? 'approved' : 'rejected'}`
    });
    
    await scenario.save();
    
    res.status(200).json({
      success: true,
      message: `Recommendation ${approved ? 'approved' : 'rejected'} successfully`,
      data: scenario.recommendations[recommendationIndex]
    });
    
  } catch (error) {
    console.error('Update recommendation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update recommendation',
      error: error.message
    });
  }
};

/**
 * Delete scenario
 * @access Super Admin only
 */
exports.deleteScenario = async (req, res) => {
  try {
    const scenario = await EmergencyScenario.findByIdAndDelete(req.params.id);
    
    if (!scenario) {
      return res.status(404).json({
        success: false,
        message: 'Scenario not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Scenario deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete scenario error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete scenario',
      error: error.message
    });
  }
};
