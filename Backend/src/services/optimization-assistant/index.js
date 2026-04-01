const HospitalProfile = require('../../models/HospitalProfile');
const BloodInventory = require('../../models/BloodInventory');
const EmergencyRequest = require('../../models/EmergencyRequest');
const OptimizationRun = require('../../models/OptimizationRun');
const rlAllocationAgentService = require('../rl-agent');
const graphIntelligenceService = require('../graph-intelligence');
const mlService = require('../ml/mlService');
const { haversineKm } = require('../graph-intelligence/haversine');
const { broadcast } = require('../realtime/socketService');

const ALL_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const ACTIVE_EMERGENCY_STATUSES = [
  'CREATED',
  'MEDICAL_VERIFICATION_PENDING',
  'PARTNER_HOSPITAL_SEARCH',
  'PARTNER_ACCEPTED',
  'LOGISTICS_DISPATCH',
  'IN_TRANSIT'
];
const SEVERITY_SCORES = {
  CRITICAL: 1,
  HIGH: 0.75,
  MODERATE: 0.45
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value, digits = 3) {
  return Number(Number(value || 0).toFixed(digits));
}

function getTransportSpeedKmH() {
  const value = Number(process.env.OPTIMIZATION_TRANSPORT_SPEED_KMH);
  return Number.isFinite(value) && value > 5 ? value : 48;
}

function getCoordinates(hospital) {
  const coords = hospital?.location?.coordinates;
  if (!Array.isArray(coords) || coords.length !== 2) {
    return null;
  }

  return {
    lng: Number(coords[0]),
    lat: Number(coords[1])
  };
}

function defaultBloodMap(defaultValue = 0) {
  return ALL_BLOOD_GROUPS.reduce((acc, group) => {
    acc[group] = defaultValue;
    return acc;
  }, {});
}

function compatibilityMap() {
  return {
    'O-': ['O-'],
    'O+': ['O-', 'O+'],
    'A-': ['O-', 'A-'],
    'A+': ['O-', 'O+', 'A-', 'A+'],
    'B-': ['O-', 'B-'],
    'B+': ['O-', 'O+', 'B-', 'B+'],
    'AB-': ['O-', 'A-', 'B-', 'AB-'],
    'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']
  };
}

function calcExpiryRisk(minExpiryDays) {
  if (!Number.isFinite(minExpiryDays)) return 0;
  if (minExpiryDays <= 2) return 1;
  if (minExpiryDays <= 5) return 0.8;
  if (minExpiryDays <= 8) return 0.55;
  if (minExpiryDays <= 12) return 0.3;
  return 0.1;
}

function objectiveFromMode(mode) {
  if (mode === 'minimize_wastage') return 'minimize_waste';
  if (mode === 'maximize_emergency_coverage') return 'maximize_fulfillment';
  if (mode === 'minimize_delivery_time') return 'maximize_fulfillment';
  return 'minimize_waste';
}

function normalizeWeights(weights) {
  const total = Math.max(Number(weights.distance || 0) + Number(weights.expiry || 0) + Number(weights.emergency || 0), 0.0001);
  return {
    distance: round(weights.distance / total, 4),
    expiry: round(weights.expiry / total, 4),
    emergency: round(weights.emergency / total, 4)
  };
}

function selectWeights(mode, telemetry) {
  if (mode === 'minimize_wastage') {
    return { distance: 0.2, expiry: 0.55, emergency: 0.25 };
  }

  if (mode === 'minimize_delivery_time') {
    return { distance: 0.62, expiry: 0.16, emergency: 0.22 };
  }

  if (mode === 'maximize_emergency_coverage') {
    return { distance: 0.2, expiry: 0.15, emergency: 0.65 };
  }

  if (mode === 'balanced') {
    return { distance: 0.34, expiry: 0.33, emergency: 0.33 };
  }

  const emergencyPressure = clamp(Number(telemetry.emergencyPressure || 0), 0, 1);
  const expiryPressure = clamp(Number(telemetry.expiryPressure || 0), 0, 1);
  const distancePressure = clamp(Number(telemetry.distancePressure || 0), 0, 1);

  const auto = {
    emergency: 0.22 + (0.58 * emergencyPressure),
    expiry: 0.18 + (0.46 * expiryPressure),
    distance: 0.18 + (0.44 * distancePressure)
  };

  return normalizeWeights(auto);
}

async function fetchRealtimeDataset({ hospitalIds, bloodGroups }) {
  const hospitalQuery = { verificationStatus: 'approved' };
  if (Array.isArray(hospitalIds) && hospitalIds.length) {
    hospitalQuery._id = { $in: hospitalIds };
  }

  const hospitals = await HospitalProfile.find(hospitalQuery)
    .select('_id hospitalName city state location')
    .lean();

  const hospitalIdSet = new Set(hospitals.map((h) => String(h._id)));

  const inventoryMatch = {
    status: 'Available',
    hospitalId: { $in: hospitals.map((h) => h._id) }
  };

  const resolvedBloodGroups = Array.isArray(bloodGroups) && bloodGroups.length
    ? bloodGroups
    : ALL_BLOOD_GROUPS;

  if (resolvedBloodGroups.length) {
    inventoryMatch.bloodGroup = { $in: resolvedBloodGroups };
  }

  const inventory = await BloodInventory.aggregate([
    { $match: inventoryMatch },
    {
      $group: {
        _id: { hospitalId: '$hospitalId', bloodGroup: '$bloodGroup' },
        units: { $sum: 1 },
        minExpiryDate: { $min: '$expiryDate' }
      }
    }
  ]);

  const inventoryByHospital = {};
  hospitals.forEach((h) => {
    inventoryByHospital[String(h._id)] = {
      byBloodGroup: defaultBloodMap(0),
      minExpiryByGroup: {}
    };
  });

  const nowTs = Date.now();
  inventory.forEach((entry) => {
    const hospitalId = String(entry._id.hospitalId);
    const bloodGroup = String(entry._id.bloodGroup);

    if (!inventoryByHospital[hospitalId]) return;

    const units = Number(entry.units || 0);
    inventoryByHospital[hospitalId].byBloodGroup[bloodGroup] = units;

    const minExpiryDate = entry.minExpiryDate ? new Date(entry.minExpiryDate) : null;
    if (minExpiryDate && Number.isFinite(minExpiryDate.getTime())) {
      const daysLeft = Math.max(0, Math.ceil((minExpiryDate.getTime() - nowTs) / (24 * 60 * 60 * 1000)));
      inventoryByHospital[hospitalId].minExpiryByGroup[bloodGroup] = daysLeft;
    }
  });

  const emergencyMatch = {
    lifecycleStatus: { $in: ACTIVE_EMERGENCY_STATUSES },
    requestingHospitalId: { $in: hospitals.map((h) => h._id) },
    bloodGroup: { $in: resolvedBloodGroups }
  };

  const emergencies = await EmergencyRequest.find(emergencyMatch)
    .select('_id requestingHospitalId bloodGroup unitsRequired severityLevel urgencyScore lifecycleStatus createdAt')
    .lean();

  const emergencyDemandByHospital = {};
  hospitals.forEach((h) => {
    emergencyDemandByHospital[String(h._id)] = defaultBloodMap(0);
  });

  let emergencyPressureNumerator = 0;
  let emergencyUnitsTotal = 0;

  emergencies.forEach((item) => {
    const hid = String(item.requestingHospitalId);
    if (!hospitalIdSet.has(hid)) return;

    const units = Number(item.unitsRequired || 0);
    const group = String(item.bloodGroup || '');
    emergencyDemandByHospital[hid][group] = Number(emergencyDemandByHospital[hid][group] || 0) + units;

    const severityWeight = SEVERITY_SCORES[String(item.severityLevel || 'HIGH')] || 0.65;
    const urgencyWeight = clamp(Number(item.urgencyScore || 70) / 100, 0.2, 1);
    emergencyPressureNumerator += units * ((severityWeight + urgencyWeight) / 2);
    emergencyUnitsTotal += units;
  });

  return {
    hospitals,
    bloodGroups: resolvedBloodGroups,
    inventoryByHospital,
    emergencies,
    emergencyDemandByHospital,
    telemetry: {
      emergencyPressure: emergencyUnitsTotal > 0 ? clamp(emergencyPressureNumerator / emergencyUnitsTotal, 0, 1) : 0,
      emergencyUnitsTotal
    }
  };
}

async function buildDistanceAndConnectivity(dataset) {
  const distanceMap = {};
  const connectivityMap = {};

  let totalDistance = 0;
  let distanceCount = 0;

  const centralityByHospital = {};
  try {
    const centrality = await graphIntelligenceService.getCentrality(false);
    (centrality?.ranking || []).forEach((row) => {
      const hid = String(row.hospitalId || '');
      if (!hid) return;
      centralityByHospital[hid] = clamp(Number(row.compositeScore || row.degreeCentrality || 0.5), 0.05, 1);
    });
  } catch {
    // Graph metrics are optional for optimization scoring.
  }

  dataset.hospitals.forEach((source) => {
    const sourceId = String(source._id);
    distanceMap[sourceId] = {};
    connectivityMap[sourceId] = {};

    const sourceCoords = getCoordinates(source);

    dataset.hospitals.forEach((target) => {
      const targetId = String(target._id);
      if (sourceId === targetId) {
        distanceMap[sourceId][targetId] = 0;
        connectivityMap[sourceId][targetId] = 1;
        return;
      }

      const targetCoords = getCoordinates(target);
      let distance = 85;

      if (sourceCoords && targetCoords) {
        distance = haversineKm(sourceCoords.lat, sourceCoords.lng, targetCoords.lat, targetCoords.lng);
      }

      distance = clamp(Number(distance), 1, 400);
      distanceMap[sourceId][targetId] = round(distance, 3);

      totalDistance += distance;
      distanceCount += 1;

      const sourceCentrality = centralityByHospital[sourceId] || 0.5;
      const targetCentrality = centralityByHospital[targetId] || 0.5;
      const distanceConnectivity = clamp(1 - (distance / 250), 0.05, 1);
      const connectivity = clamp((sourceCentrality + targetCentrality + distanceConnectivity) / 3, 0.05, 1);
      connectivityMap[sourceId][targetId] = round(connectivity, 4);
    });
  });

  const avgDistance = distanceCount > 0 ? (totalDistance / distanceCount) : 0;
  const distancePressure = clamp(avgDistance / 140, 0, 1);

  return {
    distanceMap,
    connectivityMap,
    telemetry: {
      distancePressure,
      avgDistanceKm: round(avgDistance, 3)
    }
  };
}

function calculateExpiryPressure(dataset) {
  let weightedRisk = 0;
  let weightedUnits = 0;

  Object.entries(dataset.inventoryByHospital).forEach(([hospitalId, info]) => {
    const byGroup = info.byBloodGroup || {};
    const minExpiryByGroup = info.minExpiryByGroup || {};

    Object.entries(byGroup).forEach(([group, units]) => {
      const count = Number(units || 0);
      if (count <= 0) return;

      const days = Number(minExpiryByGroup[group]);
      const risk = calcExpiryRisk(days);
      weightedRisk += risk * count;
      weightedUnits += count;
    });
  });

  return weightedUnits > 0 ? clamp(weightedRisk / weightedUnits, 0, 1) : 0;
}

function parseTransferLike(entry) {
  if (!entry || typeof entry !== 'object') return null;

  const fromHospitalId = String(entry.from_hospital || entry.fromHospitalId || entry.sourceHospitalId || '').trim();
  const toHospitalId = String(entry.to_hospital || entry.toHospitalId || entry.targetHospitalId || '').trim();
  const bloodGroup = String(entry.blood_group || entry.bloodGroup || '').trim();
  const units = Number(entry.units || entry.unitsToTransfer || 0);

  if (!fromHospitalId || !toHospitalId || !bloodGroup || units <= 0) {
    return null;
  }

  return {
    fromHospitalId,
    toHospitalId,
    bloodGroup,
    units: Math.floor(units)
  };
}

function blendTransferPlans(primaryTransfers, secondaryTransfers) {
  const merged = new Map();

  const ingest = (rows, multiplier) => {
    rows.forEach((entry) => {
      const parsed = parseTransferLike(entry);
      if (!parsed) return;

      const key = `${parsed.fromHospitalId}|${parsed.toHospitalId}|${parsed.bloodGroup}`;
      if (!merged.has(key)) {
        merged.set(key, {
          ...parsed,
          units: 0
        });
      }

      const item = merged.get(key);
      item.units += Math.max(0, Math.floor(parsed.units * multiplier));
    });
  };

  ingest(primaryTransfers, 1);
  ingest(secondaryTransfers, 0.45);

  return Array.from(merged.values())
    .filter((row) => row.units > 0)
    .sort((a, b) => b.units - a.units);
}

function getEmergencyDemand(dataset, hospitalId, bloodGroup) {
  return Number(dataset.emergencyDemandByHospital?.[hospitalId]?.[bloodGroup] || 0);
}

function getAvailability(dataset, hospitalId, bloodGroup) {
  return Number(dataset.inventoryByHospital?.[hospitalId]?.byBloodGroup?.[bloodGroup] || 0);
}

function scoreTransfer(
  transfer,
  mode,
  weights,
  context
) {
  const {
    distanceMap,
    connectivityMap,
    maxDistance,
    maxDemand,
    rlHints,
    includeGraphConnectivity
  } = context;

  const from = transfer.fromHospitalId;
  const to = transfer.toHospitalId;
  const blood = transfer.bloodGroup;

  const distance = Number(distanceMap?.[from]?.[to] || 120);
  const connectivity = Number(connectivityMap?.[from]?.[to] || 0.45);
  const demand = Number(getEmergencyDemand(context.dataset, to, blood) || 0);
  const sourceUnits = Number(getAvailability(context.dataset, from, blood) || 0);

  const minExpiryDays = Number(context.dataset.inventoryByHospital?.[from]?.minExpiryByGroup?.[blood]);
  const expiryRisk = calcExpiryRisk(minExpiryDays);

  const demandNorm = maxDemand > 0 ? clamp(demand / maxDemand, 0, 1) : 0;
  const distanceNorm = maxDistance > 0 ? clamp(distance / maxDistance, 0, 1) : 0;
  const inventoryPressure = sourceUnits > 0 ? clamp(transfer.units / sourceUnits, 0, 1) : 1;

  let rlBoost = 0;
  if (Array.isArray(rlHints) && rlHints.length) {
    const matched = rlHints.find((hint) => (
      String(hint.sourceHospitalId || '') === from
      && String(hint.targetHospitalId || '') === to
      && String(hint.bloodGroup || '') === blood
    ));

    if (matched) {
      rlBoost = clamp(Number(matched.confidence || 0.5), 0.05, 1) * 0.1;
    }
  }

  const emergencyTerm = (weights.emergency * demandNorm) + (0.1 * inventoryPressure);
  const expiryTerm = weights.expiry * expiryRisk;
  const distanceTerm = weights.distance * (1 - distanceNorm);

  const connectivityTerm = includeGraphConnectivity ? (0.06 * connectivity) : 0;
  let score = emergencyTerm + expiryTerm + distanceTerm + connectivityTerm + rlBoost;

  if (mode === 'minimize_delivery_time') {
    score += 0.16 * (1 - distanceNorm);
  } else if (mode === 'maximize_emergency_coverage') {
    score += 0.16 * demandNorm;
  } else if (mode === 'minimize_wastage') {
    score += 0.16 * expiryRisk;
  }

  return {
    score: round(score, 5),
    demand,
    distance,
    expiryRisk,
    connectivity,
    rlBoost
  };
}

function buildExplanation(scoredTransfers) {
  if (!Array.isArray(scoredTransfers) || !scoredTransfers.length) {
    return 'No transfer candidates met inventory, compatibility, and demand constraints in this cycle.';
  }

  const top = scoredTransfers[0];
  const demandText = top.demand > 0
    ? `critical shortage of ${top.demand} unit(s)`
    : 'proximity and network efficiency';

  return `System prioritized ${top.toHospitalName} for ${top.bloodGroup} because of ${demandText}, ${top.distanceKm.toFixed(1)} km travel distance, and expiry-risk reduction at ${top.fromHospitalName}.`;
}

function compareBaselineWithOptimized(dataset, optimizedTransfers, impactMetrics) {
  let totalDemand = 0;
  let baselineCovered = 0;
  let baselineResponseMinutes = 0;
  let optimizedResponseMinutes = 0;
  let demandRows = 0;

  let baselineWastageRiskUnits = 0;

  const localInventory = {};
  Object.entries(dataset.inventoryByHospital).forEach(([hid, info]) => {
    localInventory[hid] = { ...info.byBloodGroup };
  });

  Object.entries(dataset.emergencyDemandByHospital).forEach(([hid, bloodMap]) => {
    Object.entries(bloodMap).forEach(([bloodGroup, demand]) => {
      const units = Number(demand || 0);
      if (units <= 0) return;

      totalDemand += units;
      demandRows += 1;

      const local = Number(localInventory?.[hid]?.[bloodGroup] || 0);
      baselineCovered += Math.min(local, units);
      baselineResponseMinutes += 95;
      optimizedResponseMinutes += 95;
    });
  });

  const optimizedCovered = clamp(Number(impactMetrics.emergencyCoveragePct || 0) / 100, 0, 1) * totalDemand;

  optimizedTransfers.forEach((row) => {
    optimizedResponseMinutes -= Math.min(25, Number(row.etaMinutes || 0) * 0.22);
  });

  Object.values(dataset.inventoryByHospital).forEach((info) => {
    Object.entries(info.byBloodGroup || {}).forEach(([bg, units]) => {
      const count = Number(units || 0);
      if (count <= 0) return;

      const days = Number(info.minExpiryByGroup?.[bg]);
      const risk = calcExpiryRisk(days);
      baselineWastageRiskUnits += count * risk;
    });
  });

  const optimizedWastageRiskUnits = Math.max(0, baselineWastageRiskUnits - Number(impactMetrics.wastageReducedUnits || 0));

  const baselineCoveragePct = totalDemand > 0 ? round((baselineCovered / totalDemand) * 100, 2) : 0;
  const optimizedCoveragePct = totalDemand > 0 ? round((optimizedCovered / totalDemand) * 100, 2) : 0;

  const baselineAvgResponse = demandRows > 0 ? round(baselineResponseMinutes / demandRows, 2) : 0;
  const optimizedAvgResponse = demandRows > 0 ? round(optimizedResponseMinutes / demandRows, 2) : 0;

  const coverageImprovement = baselineCoveragePct > 0
    ? round(((optimizedCoveragePct - baselineCoveragePct) / baselineCoveragePct) * 100, 2)
    : optimizedCoveragePct > 0 ? 100 : 0;

  const responseImprovement = baselineAvgResponse > 0
    ? round(((baselineAvgResponse - optimizedAvgResponse) / baselineAvgResponse) * 100, 2)
    : 0;

  const wastageImprovement = baselineWastageRiskUnits > 0
    ? round(((baselineWastageRiskUnits - optimizedWastageRiskUnits) / baselineWastageRiskUnits) * 100, 2)
    : 0;

  return {
    baseline: {
      coveragePct: baselineCoveragePct,
      avgResponseMinutes: baselineAvgResponse,
      wastageRiskUnits: round(baselineWastageRiskUnits, 2)
    },
    optimized: {
      coveragePct: optimizedCoveragePct,
      avgResponseMinutes: optimizedAvgResponse,
      wastageRiskUnits: round(optimizedWastageRiskUnits, 2)
    },
    improvementPct: {
      coverage: coverageImprovement,
      responseTime: responseImprovement,
      wastage: wastageImprovement
    }
  };
}

async function resolveRLSuggestions(allowRL) {
  if (!allowRL) return [];
  try {
    const result = await rlAllocationAgentService.getRecommendations();
    return Array.isArray(result?.recommendations) ? result.recommendations : [];
  } catch {
    return [];
  }
}

async function runOptimization(payload = {}, user = null) {
  const startedAt = Date.now();

  const analysisFlow = [
    'Analyzing hospital network...',
    'Evaluating 50+ transfer routes...',
    'Optimizing for minimal wastage...'
  ];

  const mode = [
    'auto',
    'minimize_wastage',
    'minimize_delivery_time',
    'maximize_emergency_coverage',
    'balanced'
  ].includes(payload.mode)
    ? payload.mode
    : 'auto';

  const constraints = payload.constraints && typeof payload.constraints === 'object'
    ? payload.constraints
    : {};

  const hospitalIds = Array.isArray(payload.hospitalIds) && payload.hospitalIds.length
    ? payload.hospitalIds
    : null;

  const bloodGroups = Array.isArray(payload.bloodGroups) && payload.bloodGroups.length
    ? payload.bloodGroups
    : ALL_BLOOD_GROUPS;

  const dataset = await fetchRealtimeDataset({ hospitalIds, bloodGroups });
  const geo = await buildDistanceAndConnectivity(dataset);

  const expiryPressure = calculateExpiryPressure(dataset);
  const telemetry = {
    ...dataset.telemetry,
    ...geo.telemetry,
    expiryPressure
  };

  const weights = normalizeWeights(selectWeights(mode, telemetry));

  const maxDistanceKm = Math.max(Number(constraints.maxDistanceKm || 150), 20);
  const maxUnitsPerTransfer = Math.max(Number(constraints.transportCapacityPerRoute || constraints.maxUnitsPerTransfer || 12), 1);
  const timeHorizonDays = Math.max(1, Math.min(Number(payload.timeHorizonDays || 7), 30));

  const rlHints = await resolveRLSuggestions(payload.includeRLSuggestions !== false);
  const includeGraphConnectivity = payload.includeGraphConnectivity !== false;

  let primary = null;
  let secondary = null;

  const selectedObjective = objectiveFromMode(mode);

  if (mode === 'balanced' || mode === 'auto') {
    [primary, secondary] = await Promise.all([
      mlService.optimizeTransfers('minimize_waste', { max_units_per_transfer: maxUnitsPerTransfer }, hospitalIds, bloodGroups),
      mlService.optimizeTransfers('maximize_fulfillment', { max_units_per_transfer: maxUnitsPerTransfer }, hospitalIds, bloodGroups)
    ]);
  } else {
    primary = await mlService.optimizeTransfers(
      selectedObjective,
      { max_units_per_transfer: maxUnitsPerTransfer },
      hospitalIds,
      bloodGroups
    );
  }

  const primaryTransfers = Array.isArray(primary?.optimal_transfers) ? primary.optimal_transfers : [];
  const secondaryTransfers = Array.isArray(secondary?.optimal_transfers) ? secondary.optimal_transfers : [];

  const mergedTransfers = blendTransferPlans(primaryTransfers, secondaryTransfers);

  const maxDemand = Math.max(
    ...Object.values(dataset.emergencyDemandByHospital)
      .flatMap((bgMap) => Object.values(bgMap || {}).map((v) => Number(v || 0))),
    1
  );

  const scored = mergedTransfers.map((transfer) => {
    const scoring = scoreTransfer(transfer, mode, weights, {
      distanceMap: geo.distanceMap,
      connectivityMap: geo.connectivityMap,
      maxDistance: maxDistanceKm,
      maxDemand,
      rlHints,
      includeGraphConnectivity,
      dataset
    });

    const fromHospital = dataset.hospitals.find((h) => String(h._id) === transfer.fromHospitalId);
    const toHospital = dataset.hospitals.find((h) => String(h._id) === transfer.toHospitalId);

    const etaMinutes = round((scoring.distance / getTransportSpeedKmH()) * 60, 1);

    return {
      ...transfer,
      fromHospitalName: fromHospital?.hospitalName || transfer.fromHospitalId,
      toHospitalName: toHospital?.hospitalName || transfer.toHospitalId,
      distanceKm: round(scoring.distance, 2),
      etaMinutes,
      score: scoring.score,
      demandPriority: round(scoring.demand, 2),
      expiryRisk: round(scoring.expiryRisk, 3),
      connectivity: round(scoring.connectivity, 3),
      rlBoost: round(scoring.rlBoost, 3),
      reason:
        scoring.demand > 0
          ? `${toHospital?.hospitalName || transfer.toHospitalId} has active emergency demand and is within transfer radius.`
          : `${fromHospital?.hospitalName || transfer.fromHospitalId} has expiring stock and route is network-efficient.`
    };
  })
    .filter((row) => row.distanceKm <= maxDistanceKm)
    .sort((a, b) => b.score - a.score)
    .map((row, index) => ({
      ...row,
      priorityRank: index + 1
    }));

  const cappedByCapacity = scored.map((row) => ({
    ...row,
    units: Math.min(row.units, maxUnitsPerTransfer)
  }));

  const totalUnitsMoved = cappedByCapacity.reduce((sum, row) => sum + Number(row.units || 0), 0);
  const avgEtaMinutes = cappedByCapacity.length
    ? round(cappedByCapacity.reduce((sum, row) => sum + Number(row.etaMinutes || 0), 0) / cappedByCapacity.length, 2)
    : 0;

  const wastageReducedUnits = round(
    cappedByCapacity.reduce((sum, row) => sum + (Number(row.units || 0) * Number(row.expiryRisk || 0)), 0),
    2
  );

  const totalDemand = Math.max(Number(dataset.telemetry.emergencyUnitsTotal || 0), 1);
  const emergencyCoveragePct = round((Math.min(totalDemand, totalUnitsMoved) / totalDemand) * 100, 2);
  const estimatedTimeSavedPct = round(clamp((95 - avgEtaMinutes) / 95, 0, 1) * 100, 2);

  const totalExpiringRisk = round(
    Object.values(dataset.inventoryByHospital).reduce((sum, info) => {
      return sum + Object.entries(info.byBloodGroup || {}).reduce((acc, [group, units]) => {
        const risk = calcExpiryRisk(Number(info.minExpiryByGroup?.[group]));
        return acc + (Number(units || 0) * risk);
      }, 0);
    }, 0),
    2
  );

  const wastageReducedPct = totalExpiringRisk > 0
    ? round((wastageReducedUnits / totalExpiringRisk) * 100, 2)
    : 0;

  const impactMetrics = {
    totalUnitsMoved,
    estimatedTimeSavedPct,
    wastageReducedPct,
    wastageReducedUnits,
    emergencyCoveragePct
  };

  const compare = compareBaselineWithOptimized(dataset, cappedByCapacity, impactMetrics);
  const explanation = buildExplanation(cappedByCapacity);

  const runtimeMs = Date.now() - startedAt;

  const persisted = await OptimizationRun.create({
    requestedBy: user?._id || null,
    mode,
    selectedObjective,
    runtimeMs,
    dataset: {
      hospitalCount: dataset.hospitals.length,
      emergencyCount: dataset.emergencies.length,
      bloodGroupCount: bloodGroups.length,
      candidateRouteCount: mergedTransfers.length
    },
    weights,
    impact: {
      totalUnitsMoved,
      estimatedTimeSavedPct,
      wastageReducedPct,
      emergencyCoveragePct
    },
    explanation,
    analysisFlow,
    compare,
    transfers: cappedByCapacity
  });

  const response = {
    success: true,
    runId: String(persisted._id),
    mode,
    selectedObjective,
    runtimeMs,
    analysisFlow,
    transfers: cappedByCapacity,
    totalUnitsMoved,
    estimatedTimeSaved: estimatedTimeSavedPct,
    wastageReduced: wastageReducedPct,
    emergencyCoverage: emergencyCoveragePct,
    impactMetrics: {
      totalUnitsMoved,
      estimatedTimeSavedPct,
      wastageReducedPct,
      emergencyCoveragePct,
      avgEtaMinutes
    },
    compare,
    weights,
    explanation,
    generatedAt: persisted.createdAt,
    dataset: persisted.dataset
  };

  broadcast('optimization_update', {
    runId: response.runId,
    mode: response.mode,
    runtimeMs: response.runtimeMs,
    totalUnitsMoved: response.totalUnitsMoved,
    emergencyCoverage: response.emergencyCoverage,
    generatedAt: response.generatedAt
  });

  return response;
}

async function getHistory(limit = 12) {
  const safeLimit = Math.max(1, Math.min(Number(limit || 12), 50));

  const history = await OptimizationRun.find()
    .sort({ createdAt: -1 })
    .limit(safeLimit)
    .select('mode selectedObjective runtimeMs impact createdAt compare.improvementPct')
    .lean();

  return {
    success: true,
    history: history.map((row) => ({
      id: row._id,
      mode: row.mode,
      selectedObjective: row.selectedObjective,
      runtimeMs: row.runtimeMs,
      totalUnitsMoved: Number(row?.impact?.totalUnitsMoved || 0),
      estimatedTimeSavedPct: Number(row?.impact?.estimatedTimeSavedPct || 0),
      wastageReducedPct: Number(row?.impact?.wastageReducedPct || 0),
      emergencyCoveragePct: Number(row?.impact?.emergencyCoveragePct || 0),
      improvementPct: row?.compare?.improvementPct || {},
      createdAt: row.createdAt
    }))
  };
}

async function getCompare(runId = null) {
  let doc = null;

  if (runId) {
    doc = await OptimizationRun.findById(runId)
      .select('mode selectedObjective compare impact runtimeMs createdAt explanation')
      .lean();
  }

  if (!doc) {
    doc = await OptimizationRun.findOne()
      .sort({ createdAt: -1 })
      .select('mode selectedObjective compare impact runtimeMs createdAt explanation')
      .lean();
  }

  if (!doc) {
    return {
      success: true,
      message: 'No optimization runs found yet.',
      compare: null
    };
  }

  return {
    success: true,
    runId: doc._id,
    mode: doc.mode,
    selectedObjective: doc.selectedObjective,
    runtimeMs: doc.runtimeMs,
    impact: doc.impact,
    compare: doc.compare,
    explanation: doc.explanation,
    generatedAt: doc.createdAt
  };
}

module.exports = {
  runOptimization,
  getHistory,
  getCompare
};
