const { BLOOD_GROUPS } = require('./stateBuilder');

const RARE_GROUPS = new Set(['AB-', 'B-', 'O-']);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function sigmoid(value) {
  return 1 / (1 + Math.exp(-value));
}

function scoreTransfer({ units, distanceKm, urgency, expiryRisk, sourceAvailableAfter, bloodGroup }) {
  const urgencyBoost = 1 + (urgency * 1.2);
  const patientReward = units * 6 * urgencyBoost;
  const wastageReward = units * (2 + expiryRisk * 8);
  const distancePenalty = distanceKm * (0.18 + urgency * 0.1);
  const delayPenalty = (distanceKm / 35) * (2 + urgency * 4);
  const rareReservePenalty = RARE_GROUPS.has(bloodGroup) && sourceAvailableAfter < 3 ? 25 : 0;
  const stockFloorPenalty = sourceAvailableAfter < 5 ? (5 - sourceAvailableAfter) * 3.5 : 0;
  const score = patientReward + wastageReward - distancePenalty - delayPenalty - rareReservePenalty - stockFloorPenalty;
  return Number(score.toFixed(3));
}

function buildExplanation(sourceName, targetName, bloodGroup, units, distanceKm, urgency, expiryRisk) {
  const urgencyText = urgency >= 0.9 ? 'critical' : urgency >= 0.75 ? 'high' : 'moderate';
  const wasteText = expiryRisk >= 0.2
    ? 'source has elevated expiry risk, so transfer reduces potential wastage'
    : 'distance and available stock make this the fastest safe transfer';

  return `Move ${units} unit(s) of ${bloodGroup} from ${sourceName} to ${targetName} (${distanceKm.toFixed(1)} km). Priority is ${urgencyText}; ${wasteText}.`;
}

function computeAllocationRecommendations(state, limit = 20) {
  if (!state || !Array.isArray(state.hospitals) || !Array.isArray(state.emergencies)) {
    return [];
  }

  const hospitalById = new Map(state.hospitals.map((h) => [h.id, h]));
  const idxMap = state.hospitalIndexMap || {};
  const recommendations = [];

  for (const emergency of state.emergencies) {
    const targetHospital = hospitalById.get(emergency.requestingHospitalId);
    if (!targetHospital) continue;

    let remaining = Math.max(0, Number(emergency.units_required || 0));
    if (remaining === 0) continue;

    const candidateScores = [];

    for (const source of state.hospitals) {
      if (source.id === targetHospital.id) continue;
      const groupInfo = source.inventory_by_group?.[emergency.blood_group];
      const available = Number(groupInfo?.available || 0);
      if (available <= 0) continue;

      const srcIdx = idxMap[source.id];
      const dstIdx = idxMap[targetHospital.id];
      const distanceKm = Number(state.distances?.[srcIdx]?.[dstIdx] || 60);
      const maxTransfer = Math.max(0, available - (RARE_GROUPS.has(emergency.blood_group) ? 2 : 1));
      if (maxTransfer <= 0) continue;

      const proposedUnits = Math.max(1, Math.min(remaining, maxTransfer));
      const sourceAvailableAfter = available - proposedUnits;
      const expiryRisk = Number(state.expiry_risk?.[source.id] || 0);

      const score = scoreTransfer({
        units: proposedUnits,
        distanceKm,
        urgency: emergency.urgency,
        expiryRisk,
        sourceAvailableAfter,
        bloodGroup: emergency.blood_group
      });

      candidateScores.push({
        emergencyId: emergency.id,
        bloodGroup: emergency.blood_group,
        sourceHospitalId: source.id,
        sourceHospitalName: source.name,
        targetHospitalId: targetHospital.id,
        targetHospitalName: targetHospital.name,
        units: proposedUnits,
        distanceKm,
        score,
        urgency: emergency.severity,
        confidence: Number(clamp(sigmoid((score - 14) / 10), 0.45, 0.99).toFixed(3)),
        explanation: buildExplanation(source.name, targetHospital.name, emergency.blood_group, proposedUnits, distanceKm, emergency.urgency, expiryRisk)
      });
    }

    candidateScores.sort((a, b) => b.score - a.score);
    for (const candidate of candidateScores) {
      if (remaining <= 0) break;
      const alloc = Math.min(candidate.units, remaining);
      recommendations.push({ ...candidate, units: alloc });
      remaining -= alloc;
    }
  }

  recommendations.sort((a, b) => b.score - a.score);

  return recommendations.slice(0, limit).map((rec, idx) => ({
    ...rec,
    routingPriority: idx + 1,
    score: Number(rec.score.toFixed(3))
  }));
}

module.exports = {
  computeAllocationRecommendations,
  BLOOD_GROUPS
};
