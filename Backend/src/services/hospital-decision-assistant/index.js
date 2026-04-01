const HospitalProfile = require('../../models/HospitalProfile');
const BloodInventory = require('../../models/BloodInventory');
const EmergencyRequest = require('../../models/EmergencyRequest');
const BloodTransfer = require('../../models/BloodTransfer');
const HospitalTrustLedger = require('../../models/HospitalTrustLedger');
const Notification = require('../../models/Notification');
const graphIntelligenceService = require('../graph-intelligence');
const mlService = require('../ml/mlService');
const { haversineKm } = require('../graph-intelligence/haversine');
const { broadcast, emitToUser, emitToHospital } = require('../realtime/socketService');
const { sendEmergencyAlertEmail } = require('../email.service');

const ACTIVE_EMERGENCY_STATUSES = [
  'CREATED',
  'MEDICAL_VERIFICATION_PENDING',
  'PARTNER_HOSPITAL_SEARCH',
  'PARTNER_ACCEPTED',
  'LOGISTICS_DISPATCH',
  'IN_TRANSIT'
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value, digits = 3) {
  return Number(Number(value || 0).toFixed(digits));
}

function envNumber(name, fallback) {
  const val = Number(process.env[name]);
  return Number.isFinite(val) ? val : fallback;
}

function getUrgencyWeights(urgency = 'high') {
  const level = String(urgency || 'high').toLowerCase();

  const high = {
    availability: envNumber('RANK_W_HIGH_AVAILABILITY', 0.35),
    distance: envNumber('RANK_W_HIGH_DISTANCE', 0.3),
    responseSpeed: envNumber('RANK_W_HIGH_RESPONSE', 0.15),
    reliability: envNumber('RANK_W_HIGH_RELIABILITY', 0.1),
    connectivity: envNumber('RANK_W_HIGH_CONNECTIVITY', 0.07),
    efficiency: envNumber('RANK_W_HIGH_EFFICIENCY', 0.03)
  };

  const low = {
    availability: envNumber('RANK_W_LOW_AVAILABILITY', 0.2),
    distance: envNumber('RANK_W_LOW_DISTANCE', 0.15),
    responseSpeed: envNumber('RANK_W_LOW_RESPONSE', 0.2),
    reliability: envNumber('RANK_W_LOW_RELIABILITY', 0.2),
    connectivity: envNumber('RANK_W_LOW_CONNECTIVITY', 0.1),
    efficiency: envNumber('RANK_W_LOW_EFFICIENCY', 0.15)
  };

  const medium = {
    availability: envNumber('RANK_W_MEDIUM_AVAILABILITY', 0.26),
    distance: envNumber('RANK_W_MEDIUM_DISTANCE', 0.22),
    responseSpeed: envNumber('RANK_W_MEDIUM_RESPONSE', 0.18),
    reliability: envNumber('RANK_W_MEDIUM_RELIABILITY', 0.16),
    connectivity: envNumber('RANK_W_MEDIUM_CONNECTIVITY', 0.1),
    efficiency: envNumber('RANK_W_MEDIUM_EFFICIENCY', 0.08)
  };

  const selected = level === 'critical' || level === 'high'
    ? high
    : level === 'low'
    ? low
    : medium;

  const total = Object.values(selected).reduce((sum, item) => sum + Number(item || 0), 0) || 1;

  return Object.fromEntries(
    Object.entries(selected).map(([key, val]) => [key, round(Number(val) / total, 5)])
  );
}

function getCoordinates(hospital) {
  const coords = hospital?.location?.coordinates;
  if (!Array.isArray(coords) || coords.length !== 2) return null;
  return { lng: Number(coords[0]), lat: Number(coords[1]) };
}

function percentile(values, p) {
  const cleaned = values
    .map((v) => Number(v || 0))
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b);

  if (!cleaned.length) return 0;
  if (cleaned.length === 1) return cleaned[0];

  const idx = clamp(p, 0, 1) * (cleaned.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);

  if (lower === upper) return cleaned[lower];

  const weight = idx - lower;
  return cleaned[lower] + (cleaned[upper] - cleaned[lower]) * weight;
}

function normalizeByRange(value, min, max) {
  if (!Number.isFinite(value)) return 0;
  const range = max - min;
  if (range <= 0.0001) return 1;
  return clamp((value - min) / range, 0, 1);
}

function buildExplanation(hospital) {
  const factors = [
    { key: 'availability', label: 'high availability', value: hospital.availabilityScore },
    { key: 'distance', label: 'short distance', value: hospital.distanceScore },
    { key: 'responseSpeed', label: 'fast response history', value: hospital.responseSpeedScore },
    { key: 'reliability', label: 'strong reliability', value: hospital.reliabilityScore },
    { key: 'connectivity', label: 'strong network connectivity', value: hospital.connectivityScore },
    { key: 'efficiency', label: 'high operational efficiency', value: hospital.efficiencyScore }
  ].sort((a, b) => b.value - a.value);

  const top = factors.slice(0, 3).map((f) => f.label).join(', ');
  return `Ranked #${hospital.rank} due to ${top}.`;
}

async function getRealtimeInputs({ bloodGroup, patientLocation, maxDistanceKm }) {
  const hospitals = await HospitalProfile.find({ verificationStatus: 'approved' })
    .select('_id userId hospitalName officialEmail adminEmail city state location emergencySupport')
    .lean();

  const validHospitalIds = hospitals.map((h) => h._id);

  const inventoryRows = await BloodInventory.aggregate([
    {
      $match: {
        hospitalId: { $in: validHospitalIds },
        bloodGroup,
        status: 'Available'
      }
    },
    {
      $group: {
        _id: '$hospitalId',
        availableUnits: { $sum: 1 }
      }
    }
  ]);

  const inventoryMap = new Map(
    inventoryRows.map((row) => [String(row._id), Number(row.availableUnits || 0)])
  );

  const trustRows = await HospitalTrustLedger.find({ hospitalId: { $in: validHospitalIds }, isActive: true })
    .select('hospitalId trustScore responseMetrics deliveryMetrics reliabilityRating')
    .lean();

  const trustMap = new Map(
    trustRows.map((row) => [String(row.hospitalId), row])
  );

  const transferLookbackDays = Math.max(7, envNumber('RANK_RESPONSE_LOOKBACK_DAYS', 60));
  const transferSince = new Date(Date.now() - transferLookbackDays * 24 * 60 * 60 * 1000);

  const responseRows = await BloodTransfer.aggregate([
    {
      $match: {
        sourceHospitalId: { $in: validHospitalIds },
        transportStatus: { $in: ['ARRIVED', 'VERIFIED_RECEIVED', 'COMPLETED'] },
        dispatchTime: { $ne: null },
        actualArrivalTime: { $ne: null },
        createdAt: { $gte: transferSince }
      }
    },
    {
      $project: {
        sourceHospitalId: 1,
        responseMinutes: {
          $divide: [{ $subtract: ['$actualArrivalTime', '$dispatchTime'] }, 60000]
        }
      }
    },
    {
      $match: {
        responseMinutes: { $gt: 0, $lt: envNumber('RANK_MAX_RESPONSE_MINUTES', 360) }
      }
    },
    {
      $group: {
        _id: '$sourceHospitalId',
        avgResponseMinutes: { $avg: '$responseMinutes' },
        transferCount: { $sum: 1 }
      }
    }
  ]);

  const responseMap = new Map(
    responseRows.map((row) => [String(row._id), Number(row.avgResponseMinutes || 0)])
  );

  const workloadRows = await EmergencyRequest.aggregate([
    {
      $match: {
        lifecycleStatus: { $in: ACTIVE_EMERGENCY_STATUSES }
      }
    },
    {
      $project: {
        hospitalRefs: {
          $setUnion: [
            [{ $toString: '$requestingHospitalId' }],
            {
              $cond: [
                { $ifNull: ['$assignedHospitalId', false] },
                [{ $toString: '$assignedHospitalId' }],
                []
              ]
            }
          ]
        }
      }
    },
    { $unwind: '$hospitalRefs' },
    {
      $group: {
        _id: '$hospitalRefs',
        activeEmergencies: { $sum: 1 }
      }
    }
  ]);

  const workloadMap = new Map(
    workloadRows.map((row) => [String(row._id), Number(row.activeEmergencies || 0)])
  );

  let centralityByHospital = {};
  try {
    const centrality = await graphIntelligenceService.getCentrality(false);
    (centrality?.ranking || []).forEach((entry) => {
      const hid = String(entry.hospitalId || '');
      if (!hid) return;
      const score = Number(entry.compositeScore || entry.degreeCentrality || 0.5);
      centralityByHospital[hid] = clamp(score, 0.05, 1);
    });
  } catch {
    centralityByHospital = {};
  }

  const patientLat = Number(patientLocation?.latitude);
  const patientLng = Number(patientLocation?.longitude);
  const hasPatientCoordinates = Number.isFinite(patientLat) && Number.isFinite(patientLng);

  const candidates = hospitals.map((hospital) => {
    const hid = String(hospital._id);
    const coords = getCoordinates(hospital);

    let distanceKm = envNumber('RANK_FALLBACK_DISTANCE_KM', maxDistanceKm + 25);
    if (hasPatientCoordinates && coords) {
      distanceKm = haversineKm(patientLat, patientLng, coords.lat, coords.lng);
    }

    return {
      ...hospital,
      hospitalId: hid,
      distanceKm: round(distanceKm, 3),
      availableUnits: Number(inventoryMap.get(hid) || 0),
      activeWorkload: Number(workloadMap.get(hid) || 0),
      trust: trustMap.get(hid) || null,
      historicalResponseMins: Number(responseMap.get(hid) || 0),
      connectivityScore: Number(centralityByHospital[hid] || 0.5)
    };
  })
    .filter((h) => h.distanceKm <= maxDistanceKm || !hasPatientCoordinates);

  return {
    candidates,
    hasPatientCoordinates
  };
}

async function applyOptimizationValidation(hospitals, payload) {
  if (!payload.useOptimizationValidation) return hospitals;

  try {
    const targetHospitals = hospitals.slice(0, 8).map((h) => h.hospitalId);
    if (!targetHospitals.length) return hospitals;

    const optimized = await mlService.optimizeTransfers(
      'maximize_fulfillment',
      {
        max_units_per_transfer: Math.max(1, Number(payload.unitsNeeded || 1))
      },
      targetHospitals,
      [payload.bloodGroup]
    );

    const routeValidated = new Set(
      (optimized?.optimal_transfers || []).map((item) => String(item.from_hospital || item.fromHospitalId || ''))
    );

    return hospitals.map((row) => ({
      ...row,
      routeValidated: routeValidated.has(row.hospitalId)
    }));
  } catch {
    return hospitals;
  }
}

async function rankHospitalsDecision(payload = {}, requester = null) {
  const startedAt = Date.now();

  const bloodGroup = String(payload.bloodGroup || payload.blood_group || '').trim().toUpperCase();
  const urgency = String(payload.urgency || 'high').toLowerCase();
  const unitsNeeded = Math.max(1, Number(payload.unitsNeeded || payload.units_needed || 1));
  const maxDistanceKm = Math.max(5, Number(payload.maxDistanceKm || payload.max_distance_km || 50));

  if (!bloodGroup) {
    throw new Error('bloodGroup is required');
  }

  const analysisFlow = [
    'AI analyzing hospital network...',
    'Evaluating best options...',
    'Computing urgency-aware decision weights...',
    'Scoring candidates with explainable factors...'
  ];

  const weights = getUrgencyWeights(urgency);
  const { candidates } = await getRealtimeInputs({
    bloodGroup,
    patientLocation: payload.patientLocation || payload.patient_location || {},
    maxDistanceKm
  });

  const excluded = {
    noStock: 0,
    overloaded: 0,
    noCandidatesInDistance: 0
  };

  if (!candidates.length) {
    excluded.noCandidatesInDistance = 1;
    const empty = {
      success: true,
      generatedAt: new Date().toISOString(),
      runtimeMs: Date.now() - startedAt,
      analysisFlow,
      total_evaluated: 0,
      fulfillment_probability: 0,
      ranked_hospitals: [],
      excluded,
      weights,
      decisionCandidates: []
    };

    broadcast('hospital_ranking_update', {
      generatedAt: empty.generatedAt,
      runtimeMs: empty.runtimeMs,
      bloodGroup,
      urgency,
      totalEvaluated: 0,
      rankedHospitals: []
    });

    return empty;
  }

  const workloadValues = candidates.map((c) => Number(c.activeWorkload || 0));
  const overloadPercentile = clamp(envNumber('RANK_OVERLOAD_PERCENTILE', 0.75), 0.5, 0.95);
  const overloadBaseline = percentile(workloadValues, overloadPercentile);
  const overloadFloor = Math.max(1, envNumber('RANK_OVERLOAD_MIN_ACTIVE', 3));
  const overloadThreshold = Math.max(overloadBaseline, overloadFloor);

  const maxResponseReference = Math.max(
    envNumber('RANK_MAX_RESPONSE_MINUTES', 180),
    ...candidates.map((c) => Number(c.historicalResponseMins || c.trust?.responseMetrics?.averageResponseTime || 0))
  );

  const filtered = candidates.filter((candidate) => {
    if (candidate.availableUnits <= 0) {
      excluded.noStock += 1;
      return false;
    }

    if (candidate.activeWorkload > overloadThreshold) {
      excluded.overloaded += 1;
      return false;
    }

    return true;
  });

  if (!filtered.length) {
    const empty = {
      success: true,
      generatedAt: new Date().toISOString(),
      runtimeMs: Date.now() - startedAt,
      analysisFlow,
      total_evaluated: 0,
      fulfillment_probability: 0,
      ranked_hospitals: [],
      excluded,
      weights,
      decisionCandidates: []
    };

    broadcast('hospital_ranking_update', {
      generatedAt: empty.generatedAt,
      runtimeMs: empty.runtimeMs,
      bloodGroup,
      urgency,
      totalEvaluated: 0,
      rankedHospitals: []
    });

    return empty;
  }

  const scoredRaw = filtered.map((hospital) => {
    const availabilityScore = clamp(hospital.availableUnits / unitsNeeded, 0, 1);
    const distanceScore = clamp(1 - (hospital.distanceKm / maxDistanceKm), 0, 1);

    const historicalResponse = Number(hospital.historicalResponseMins || hospital.trust?.responseMetrics?.averageResponseTime || 0);
    const responseSpeedScore = historicalResponse > 0
      ? clamp(1 - (historicalResponse / maxResponseReference), 0, 1)
      : 0.55;

    const trustOverall = Number(hospital.trust?.trustScore?.overall || 75);
    const acceptanceRate = Number(hospital.trust?.responseMetrics?.acceptanceRate || 80);
    const reliabilityScore = clamp(((trustOverall / 100) * 0.7) + ((acceptanceRate / 100) * 0.3), 0, 1);

    const workloadRatio = overloadThreshold > 0
      ? clamp(hospital.activeWorkload / (overloadThreshold + 1), 0, 1)
      : 0;

    const efficiencyScore = clamp(
      ((distanceScore * 0.55) + (responseSpeedScore * 0.45)) * (1 - (workloadRatio * 0.35)),
      0,
      1
    );

    const scoreRaw = (
      (availabilityScore * weights.availability) +
      (distanceScore * weights.distance) +
      (responseSpeedScore * weights.responseSpeed) +
      (reliabilityScore * weights.reliability) +
      (clamp(Number(hospital.connectivityScore || 0.5), 0, 1) * weights.connectivity) +
      (efficiencyScore * weights.efficiency)
    );

    const transportSpeedKmH = Math.max(20, envNumber('RANK_TRANSPORT_SPEED_KMH', 48));
    const travelMins = (hospital.distanceKm / transportSpeedKmH) * 60;
    const estimatedResponseTime = round((travelMins * 0.58) + ((historicalResponse || 45) * 0.42), 1);

    return {
      ...hospital,
      scoreRaw,
      availabilityScore: round(availabilityScore, 4),
      distanceScore: round(distanceScore, 4),
      responseSpeedScore: round(responseSpeedScore, 4),
      reliabilityScore: round(reliabilityScore, 4),
      efficiencyScore: round(efficiencyScore, 4),
      estimatedResponseTime,
      responseReferenceMinutes: round(historicalResponse || 0, 2)
    };
  });

  const validated = await applyOptimizationValidation(scoredRaw, {
    bloodGroup,
    unitsNeeded,
    useOptimizationValidation: !!payload.useOptimizationValidation
  });

  const rescored = validated.map((row) => ({
    ...row,
    scoreRaw: row.scoreRaw + (row.routeValidated ? 0.03 : 0)
  }));

  rescored.sort((a, b) => b.scoreRaw - a.scoreRaw);

  const minScore = Math.min(...rescored.map((r) => r.scoreRaw));
  const maxScore = Math.max(...rescored.map((r) => r.scoreRaw));

  const rankedHospitals = rescored.map((row, index) => {
    const confidence = round(normalizeByRange(row.scoreRaw, minScore, maxScore) * 100, 1);

    const normalizedScore = round(row.scoreRaw * 100, 2);

    const result = {
      hospitalId: row.hospitalId,
      hospitalName: row.hospitalName,
      hospital_name: row.hospitalName,
      rank: index + 1,
      score: normalizedScore,
      final_score: normalizedScore,
      confidence,
      estimatedResponseTime: row.estimatedResponseTime,
      estimated_response_time: row.estimatedResponseTime,
      explanation: '',
      availableUnits: row.availableUnits,
      available_units: row.availableUnits,
      activeWorkload: row.activeWorkload,
      active_workload: row.activeWorkload,
      distanceKm: row.distanceKm,
      distance_km: row.distanceKm,
      response_time_score: row.responseSpeedScore,
      reliability_score: row.reliabilityScore,
      trust_score: round(Number(row.trust?.trustScore?.overall || 75) / 100, 4),
      connectivity_score: round(Number(row.connectivityScore || 0.5), 4),
      efficiency_score: row.efficiencyScore,
      route_validated: !!row.routeValidated,
      keyFactors: {
        availability: row.availabilityScore,
        distance: row.distanceScore,
        responseSpeed: row.responseSpeedScore,
        reliability: row.reliabilityScore,
        connectivity: round(Number(row.connectivityScore || 0.5), 4),
        efficiency: row.efficiencyScore
      }
    };

    result.explanation = buildExplanation(result);
    return result;
  });

  const top = rankedHospitals[0] || null;
  const fulfillmentProbability = top
    ? clamp(top.availableUnits / unitsNeeded, 0, 1)
    : 0;

  const response = {
    success: true,
    generatedAt: new Date().toISOString(),
    runtimeMs: Date.now() - startedAt,
    blood_group: bloodGroup,
    urgency,
    units_needed: unitsNeeded,
    max_distance_km: maxDistanceKm,
    analysisFlow,
    total_evaluated: rankedHospitals.length,
    fulfillment_probability: fulfillmentProbability,
    ranked_hospitals: rankedHospitals,
    excluded,
    overloadThreshold,
    weights,
    decisionCandidates: rankedHospitals.map((item) => ({
      hospitalName: item.hospitalName,
      rank: item.rank,
      score: item.score,
      confidence: item.confidence,
      estimatedResponseTime: item.estimatedResponseTime,
      explanation: item.explanation
    }))
  };

  broadcast('hospital_ranking_update', {
    generatedAt: response.generatedAt,
    runtimeMs: response.runtimeMs,
    bloodGroup,
    urgency,
    totalEvaluated: response.total_evaluated,
    rankedHospitals: rankedHospitals.slice(0, 10),
    topHospital: top
      ? {
          hospitalId: top.hospitalId,
          hospitalName: top.hospitalName,
          score: top.score,
          confidence: top.confidence,
          estimatedResponseTime: top.estimatedResponseTime
        }
      : null
  });

  return response;
}

async function autoContactHospital(payload = {}, requester = null) {
  const rankingPayload = {
    bloodGroup: payload.bloodGroup,
    urgency: payload.urgency || 'high',
    patientLocation: payload.patientLocation,
    unitsNeeded: payload.unitsNeeded,
    maxDistanceKm: payload.maxDistanceKm,
    useOptimizationValidation: !!payload.useOptimizationValidation
  };

  const ranking = payload.topHospitalId
    ? { ranked_hospitals: [{ hospitalId: String(payload.topHospitalId) }] }
    : await rankHospitalsDecision(rankingPayload, requester);

  const topHospitalId = String(
    payload.topHospitalId
      || ranking?.ranked_hospitals?.[0]?.hospitalId
      || ''
  );

  if (!topHospitalId) {
    return {
      success: false,
      message: 'No eligible hospital to auto-contact.'
    };
  }

  const hospital = await HospitalProfile.findById(topHospitalId)
    .select('_id userId hospitalName officialEmail adminEmail')
    .lean();

  if (!hospital) {
    return {
      success: false,
      message: 'Target hospital not found.'
    };
  }

  const bloodGroup = String(payload.bloodGroup || '').toUpperCase();
  const unitsNeeded = Math.max(1, Number(payload.unitsNeeded || 1));
  const urgency = String(payload.urgency || 'high').toLowerCase();

  const title = 'Auto-contact: urgent hospital request';
  const message = `AI assistant requested support for ${unitsNeeded} unit(s) of ${bloodGroup}. Urgency: ${urgency.toUpperCase()}.`;

  if (hospital.userId) {
    await Notification.createNotification({
      userId: hospital.userId,
      userModel: 'User',
      title,
      message,
      type: 'system',
      priority: urgency === 'critical' || urgency === 'high' ? 'urgent' : 'high',
      channels: {
        inApp: true,
        email: true,
        sms: false,
        push: false
      }
    });
  }

  const emailTargets = [hospital.officialEmail, hospital.adminEmail]
    .filter((v, idx, arr) => !!v && arr.indexOf(v) === idx);

  let emailSent = false;
  for (const email of emailTargets) {
    const sent = await sendEmergencyAlertEmail(
      email,
      hospital.hospitalName,
      message
    );
    emailSent = emailSent || sent;
  }

  emitToHospital(hospital._id, 'hospital_auto_contacted', {
    hospitalId: String(hospital._id),
    hospitalName: hospital.hospitalName,
    bloodGroup,
    unitsNeeded,
    urgency,
    requestedAt: new Date().toISOString()
  });

  if (hospital.userId) {
    emitToUser(hospital.userId, 'hospital_auto_contacted', {
      hospitalId: String(hospital._id),
      hospitalName: hospital.hospitalName,
      bloodGroup,
      unitsNeeded,
      urgency,
      requestedAt: new Date().toISOString()
    });
  }

  return {
    success: true,
    contactedHospital: {
      hospitalId: String(hospital._id),
      hospitalName: hospital.hospitalName,
      officialEmail: hospital.officialEmail || null,
      adminEmail: hospital.adminEmail || null
    },
    emailSent,
    message: `Auto-contact initiated for ${hospital.hospitalName}.`
  };
}

module.exports = {
  rankHospitalsDecision,
  autoContactHospital
};