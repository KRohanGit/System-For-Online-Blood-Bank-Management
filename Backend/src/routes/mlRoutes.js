const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const mlService = require('../services/ml/mlService');
const hospitalDecisionAssistant = require('../services/hospital-decision-assistant');
const { authenticateToken } = require('../middleware/auth');
const HospitalProfile = require('../models/HospitalProfile');
const BloodInventory = require('../models/BloodInventory');

function hasClinicalInsightsAccess(req) {
  const role = String(req.userRole || '').toLowerCase();
  return ['doctor', 'hospital_admin', 'super_admin'].includes(role);
}

function sanitizeSimilarCasesForHospital(result = {}) {
  const similarCases = Array.isArray(result.similarCases) ? result.similarCases : [];

  return {
    ...result,
    similarCases: similarCases.map((item) => ({
      caseId: item.caseId,
      similarityScore: item.similarityScore,
      conditionType: item.conditionType,
      bloodGroup: item.bloodGroup,
      treatmentSummary: item.treatmentSummary,
      outcomeSummary: item.outcomeSummary
    }))
  };
}

async function validateHospitalAccess(req, res, next) {
  try {
    const hospitalId = req.body?.hospitalId || req.query?.hospitalId || req.params?.hospitalId || null;
    const role = String(req.userRole || '').toLowerCase();
    let profile = null;

    if (hospitalId && mongoose.Types.ObjectId.isValid(hospitalId)) {
      profile = await HospitalProfile.findById(hospitalId).select('_id userId');

      // Some clients send auth user id instead of HospitalProfile id.
      if (!profile) {
        profile = await HospitalProfile.findOne({ userId: hospitalId }).select('_id userId');
      }
    }

    // Hospital admins can default to their own profile when hospitalId is missing/invalid.
    if (!profile && role === 'hospital_admin') {
      profile = await HospitalProfile.findOne({ userId: req.user._id }).select('_id userId');
    }

    if (!profile && role !== 'hospital_admin') {
      if (!hospitalId) {
        return res.status(400).json({ message: 'hospitalId is required' });
      }
      return res.status(404).json({ message: 'Hospital not found' });
    }

    if (profile && role !== 'super_admin' && String(profile.userId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Access denied for requested hospitalId' });
    }

    // Final fallback for hospital admins: keep calls usable even if profile record is not yet provisioned.
    const normalizedHospitalId = profile ? String(profile._id) : String(req.user._id);

    req.body = req.body || {};
    req.body.hospitalId = normalizedHospitalId;
    req.hospitalId = normalizedHospitalId;
    req.targetHospitalProfile = profile;
    next();
  } catch (error) {
    return res.status(500).json({ message: 'Failed to validate hospital access', error: error.message });
  }
}

function buildDemandFallback(hospitalId, bloodGroup, horizonDays, errorMessage) {
  const days = Math.max(1, Number(horizonDays) || 7);
  const forecast = Array.from({ length: days }, (_, index) => ({
    day: `Day ${index + 1}`,
    predictedUnits: 0,
    confidence: 45
  }));

  return {
    hospital_id: hospitalId,
    blood_group: bloodGroup || 'ALL',
    horizon_days: days,
    forecast,
    source: 'degraded-fallback',
    degradedMode: true,
    message: 'ML demand model fallback response returned',
    warning: errorMessage
  };
}

function buildCrisisFallback(hospitalId, lookaheadHours, errorMessage) {
  const hours = Math.max(1, Number(lookaheadHours) || 48);
  return {
    hospital_id: hospitalId,
    lookahead_hours: hours,
    crisisScore: 0,
    level: 'low',
    factors: ['Live ML response unavailable; fallback safety mode is active'],
    recommendations: [
      'Continue standard monitoring cadence',
      'Verify ML service health in admin panel',
      'Retrain crisis model if stale'
    ],
    source: 'degraded-fallback',
    degradedMode: true,
    warning: errorMessage
  };
}

async function buildInventoryDerivedWastageFallback(hospitalId, bloodGroup, horizonDays, errorMessage) {
  const days = Math.max(1, Number(horizonDays) || 14);
  const now = new Date();

  const query = {
    hospitalId,
    status: { $in: ['Available', 'Reserved'] },
    expiryDate: { $gte: now }
  };
  if (bloodGroup) query.bloodGroup = bloodGroup;

  const units = await BloodInventory.find(query)
    .select('bloodUnitId bloodGroup expiryDate collectionDate status')
    .sort({ expiryDate: 1 })
    .limit(120)
    .lean();

  const predictions = units.slice(0, 40).map((unit, idx) => {
    const exp = unit.expiryDate ? new Date(unit.expiryDate) : null;
    const daysToExpiry = exp ? Math.max(0, Math.round((exp - now) / (1000 * 60 * 60 * 24))) : null;
    const riskScoreRaw = daysToExpiry == null ? 0.35 : Math.min(0.99, Math.max(0.05, 1 - (daysToExpiry / Math.max(days, 42))));
    const riskScore = Number(riskScoreRaw.toFixed(2));
    const riskLevel = riskScore >= 0.7 ? 'high' : riskScore >= 0.45 ? 'medium' : 'low';

    let recommendation = 'Maintain FEFO usage and monitor daily';
    if (riskLevel === 'high') recommendation = 'Prioritize issue/transfer in next 24 hours';
    else if (riskLevel === 'medium') recommendation = 'Keep in near-expiry watchlist and rotate sooner';

    return {
      id: unit.bloodUnitId || String(unit._id || `unit-${idx + 1}`),
      bloodGroup: unit.bloodGroup || bloodGroup || 'N/A',
      riskScore,
      riskLevel,
      horizonDays: days,
      recommendation,
      daysToExpiry
    };
  });

  const highRiskCount = predictions.filter((p) => p.riskLevel === 'high').length;
  const avgRisk = predictions.length
    ? Number((predictions.reduce((sum, p) => sum + p.riskScore, 0) / predictions.length).toFixed(2))
    : 0;

  return {
    hospital_id: hospitalId,
    horizonDays: days,
    predictions,
    wastage_probability: avgRisk,
    at_risk_units: predictions
      .filter((p) => p.riskLevel !== 'low')
      .map((p) => ({
        unit_id: p.id,
        blood_group: p.bloodGroup,
        wastage_risk: p.riskScore,
        days_to_expiry: p.daysToExpiry
      })),
    cost_impact: {
      potential_waste_units: highRiskCount,
      estimated_loss: Number((highRiskCount * 350).toFixed(2)),
      currency: 'INR'
    },
    fifo_recommendations: [],
    source: 'degraded-fallback',
    degradedMode: true,
    warning: errorMessage
  };
}

function normalizeWastageResult(result, horizonDays, bloodGroup) {
  const normalized = { ...(result || {}) };
  const days = Math.max(1, Number(horizonDays) || 14);
  const atRisk = Array.isArray(normalized.at_risk_units) ? normalized.at_risk_units : [];

  if (!Array.isArray(normalized.predictions) || normalized.predictions.length === 0) {
    normalized.predictions = atRisk.map((item, index) => {
      const riskScore = Number(item.wastage_risk ?? item.risk ?? 0);
      const riskLevel = riskScore >= 0.7 ? 'high' : riskScore >= 0.45 ? 'medium' : 'low';
      return {
        id: item.unit_id || `risk-${index + 1}`,
        bloodGroup: item.blood_group || item.bloodGroup || 'N/A',
        riskScore: Number(riskScore.toFixed(2)),
        riskLevel,
        horizonDays: days,
        recommendation: riskLevel === 'high'
          ? 'Prioritize issue/transfer immediately'
          : riskLevel === 'medium'
            ? 'Move to near-expiry monitoring queue'
            : 'Continue FEFO rotation'
      };
    });
  }

  if (!Array.isArray(normalized.predictions) || normalized.predictions.length === 0) {
    const fifoRows = Array.isArray(normalized.fifo_recommendations) ? normalized.fifo_recommendations : [];
    normalized.predictions = fifoRows.map((row, index) => ({
      id: `fifo-${index + 1}`,
      bloodGroup: row.blood_group || bloodGroup || 'ALL',
      riskScore: row.urgency === 'high' ? 0.72 : 0.42,
      riskLevel: row.urgency === 'high' ? 'high' : 'medium',
      horizonDays: days,
      recommendation: row.action === 'transfer_recommended'
        ? 'Transfer soon-to-expire units to partner hospitals'
        : 'Issue near-expiry units first (FEFO)'
    }));
  }

  if (!Array.isArray(normalized.predictions) || normalized.predictions.length === 0) {
    normalized.predictions = [
      {
        id: `advisory-${bloodGroup || 'all'}`,
        bloodGroup: bloodGroup || 'ALL',
        riskScore: Number(normalized.wastage_probability || 0),
        riskLevel: Number(normalized.wastage_probability || 0) >= 0.45 ? 'medium' : 'low',
        horizonDays: days,
        recommendation: 'No immediate high-risk units found. Continue FEFO and monitor expiry daily.'
      }
    ];
  }

  return normalized;
}

function buildAnomalyFallback(hospitalId, metricType, timeWindowHours, errorMessage) {
  return {
    hospital_id: hospitalId,
    metric_type: metricType || 'inventory',
    time_window_hours: Math.max(1, Number(timeWindowHours) || 24),
    anomalies: [],
    anomalyCount: 0,
    source: 'degraded-fallback',
    degradedMode: true,
    warning: errorMessage
  };
}

function sendDegradedResponse(res, payload) {
  res.set('x-ml-fallback', '1');
  return res.status(200).json(payload);
}


router.post('/predict/demand', authenticateToken, validateHospitalAccess, async (req, res) => {
  try {
    const { hospitalId, bloodGroup, horizonDays } = req.body;
    const result = await mlService.predictDemand(hospitalId, bloodGroup, horizonDays);
    res.json(result);
  } catch (error) {
    console.warn('ML demand prediction fallback triggered:', error.message);
    const { hospitalId, bloodGroup, horizonDays } = req.body || {};
    return sendDegradedResponse(
      res,
      buildDemandFallback(hospitalId, bloodGroup, horizonDays, error.message)
    );
  }
});

router.post('/predict/crisis', authenticateToken, validateHospitalAccess, async (req, res) => {
  try {
    const { hospitalId, lookaheadHours } = req.body;
    const result = await mlService.predictCrisis(hospitalId, lookaheadHours);
    res.json(result);
  } catch (error) {
    console.warn('ML crisis prediction fallback triggered:', error.message);
    const { hospitalId, lookaheadHours } = req.body || {};
    return sendDegradedResponse(
      res,
      buildCrisisFallback(hospitalId, lookaheadHours, error.message)
    );
  }
});

router.post('/retrain/crisis', authenticateToken, async (req, res) => {
  try {
    const role = String(req.userRole || '').toLowerCase();
    if (!['super_admin', 'hospital_admin'].includes(role)) {
      return res.status(403).json({ message: 'Access denied for crisis retraining' });
    }

    const result = await mlService.retrainCrisisModel();
    return res.json(result);
  } catch (error) {
    return res.status(502).json({ message: 'ML service unavailable', error: error.message });
  }
});

router.post('/predict/donor-return', authenticateToken, async (req, res) => {
  try {
    const { donorId, donationHistory, demographics } = req.body;
    const result = await mlService.predictDonorReturn(donorId, donationHistory, demographics);
    res.json(result);
  } catch (error) {
    res.status(502).json({ message: 'ML service unavailable', error: error.message });
  }
});

router.post('/predict/wastage', authenticateToken, validateHospitalAccess, async (req, res) => {
  try {
    const { hospitalId, bloodGroup, horizonDays } = req.body;
    const result = await mlService.predictWastage(hospitalId, bloodGroup, horizonDays);
    return res.json(normalizeWastageResult(result, horizonDays, bloodGroup));
  } catch (error) {
    console.warn('ML wastage prediction fallback triggered:', error.message);
    const { hospitalId, bloodGroup, horizonDays } = req.body || {};
    const fallback = await buildInventoryDerivedWastageFallback(hospitalId, bloodGroup, horizonDays, error.message);
    return sendDegradedResponse(
      res,
      fallback
    );
  }
});

router.post('/predict/anomalies', authenticateToken, validateHospitalAccess, async (req, res) => {
  try {
    const { hospitalId, metricType, timeWindowHours } = req.body;
    const result = await mlService.detectAnomalies(hospitalId, metricType, timeWindowHours);
    res.json(result);
  } catch (error) {
    console.warn('ML anomaly detection fallback triggered:', error.message);
    const { hospitalId, metricType, timeWindowHours } = req.body || {};
    return sendDegradedResponse(
      res,
      buildAnomalyFallback(hospitalId, metricType, timeWindowHours, error.message)
    );
  }
});

router.post('/predict/hospital-ranking', authenticateToken, async (req, res) => {
  try {
    const {
      bloodGroup,
      urgency,
      patientLocation,
      unitsNeeded,
      maxDistanceKm,
      useOptimizationValidation
    } = req.body;

    const result = await hospitalDecisionAssistant.rankHospitalsDecision({
      bloodGroup,
      urgency,
      patientLocation,
      unitsNeeded,
      maxDistanceKm,
      useOptimizationValidation
    }, req.user);

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Hospital decision engine unavailable', error: error.message });
  }
});

router.post('/simulation/run', authenticateToken, async (req, res) => {
  try {
    const { scenarioType, parameters, durationDays, monteCarloRuns } = req.body;
    const result = await mlService.runSimulation(scenarioType, parameters, durationDays, monteCarloRuns);
    res.json(result);
  } catch (error) {
    res.status(502).json({ message: 'ML service unavailable', error: error.message });
  }
});

router.post('/optimize/transfers', authenticateToken, async (req, res) => {
  try {
    const { objective, constraints, hospitalIds, bloodGroups } = req.body;
    const result = await mlService.optimizeTransfers(objective, constraints, hospitalIds, bloodGroups);
    res.json(result);
  } catch (error) {
    res.status(502).json({ message: 'ML service unavailable', error: error.message });
  }
});

router.get('/health', async (req, res) => {
  try {
    const result = await mlService.getMLHealth();
    res.json(result);
  } catch (error) {
    res.status(502).json({ message: 'ML service unavailable', error: error.message });
  }
});

router.post('/digital-twin/simulate', authenticateToken, async (req, res) => {
  try {
    const { scenario, parameters, durationDays, monteCarloRuns } = req.body;
    const result = await mlService.digitalTwinSimulate(scenario, parameters, durationDays, monteCarloRuns);
    res.json(result);
  } catch (error) {
    res.status(502).json({ message: 'ML service unavailable', error: error.message });
  }
});

router.get('/digital-twin/status', authenticateToken, async (req, res) => {
  try {
    const result = await mlService.digitalTwinStatus();
    res.json(result);
  } catch (error) {
    res.status(502).json({ message: 'ML service unavailable', error: error.message });
  }
});

router.get('/digital-twin/resilience-score', authenticateToken, async (req, res) => {
  try {
    const result = await mlService.digitalTwinResilience();
    res.json(result);
  } catch (error) {
    res.status(502).json({ message: 'ML service unavailable', error: error.message });
  }
});

router.post('/digital-twin/compare', authenticateToken, async (req, res) => {
  try {
    const { scenarios, parameters, durationDays, monteCarloRuns } = req.body;
    const result = await mlService.digitalTwinCompare(scenarios, parameters, durationDays, monteCarloRuns);
    res.json(result);
  } catch (error) {
    res.status(502).json({ message: 'ML service unavailable', error: error.message });
  }
});

router.post('/digital-twin/strategy-recommendation', authenticateToken, async (req, res) => {
  try {
    const { parameters, durationDays, monteCarloRuns } = req.body;
    const result = await mlService.digitalTwinStrategyRecommendation(parameters, durationDays, monteCarloRuns);
    res.json(result);
  } catch (error) {
    res.status(502).json({ message: 'ML service unavailable', error: error.message });
  }
});

router.post('/rl-agent/train', authenticateToken, async (req, res) => {
  try {
    const { episodes, algorithm, maxHospitals } = req.body;
    const result = await mlService.rlAgentTrain(episodes, algorithm, maxHospitals);
    res.json(result);
  } catch (error) {
    res.status(502).json({ message: 'ML service unavailable', error: error.message });
  }
});

router.post('/rl-agent/simulate', authenticateToken, async (req, res) => {
  try {
    const { strategy, durationDays } = req.body;
    const result = await mlService.rlAgentSimulate(strategy, durationDays);
    res.json(result);
  } catch (error) {
    res.status(502).json({ message: 'ML service unavailable', error: error.message });
  }
});

router.get('/rl-agent/policy', authenticateToken, async (req, res) => {
  try {
    const result = await mlService.rlAgentPolicy();
    res.json(result);
  } catch (error) {
    res.status(502).json({ message: 'ML service unavailable', error: error.message });
  }
});

router.get('/graph/centrality', authenticateToken, async (req, res) => {
  try {
    const metric = req.query.metric || 'all';
    const result = await mlService.graphCentrality(metric);
    res.json(result);
  } catch (error) {
    res.status(502).json({ message: 'ML service unavailable', error: error.message });
  }
});

router.get('/graph/bottlenecks', authenticateToken, async (req, res) => {
  try {
    const threshold = parseFloat(req.query.threshold) || 0.3;
    const result = await mlService.graphBottlenecks(threshold);
    res.json(result);
  } catch (error) {
    res.status(502).json({ message: 'ML service unavailable', error: error.message });
  }
});

router.get('/graph/stability-index', authenticateToken, async (req, res) => {
  try {
    const result = await mlService.graphStabilityIndex();
    res.json(result);
  } catch (error) {
    res.status(502).json({ message: 'ML service unavailable', error: error.message });
  }
});

router.post('/find-similar-cases', authenticateToken, async (req, res) => {
  try {
    if (!hasClinicalInsightsAccess(req)) {
      return res.status(403).json({ message: 'Access denied for clinical insights' });
    }

    const { patientFeatures, topK = 10 } = req.body || {};
    if (!patientFeatures) {
      return res.status(400).json({ message: 'patientFeatures is required' });
    }

    const result = await mlService.findSimilarCases(patientFeatures, topK);
    const role = String(req.userRole || '').toLowerCase();
    if (role === 'hospital_admin') {
      return res.json(sanitizeSimilarCasesForHospital(result));
    }

    return res.json(result);
  } catch (error) {
    return res.status(502).json({ message: 'ML service unavailable', error: error.message });
  }
});

router.post('/recommend-treatment', authenticateToken, async (req, res) => {
  try {
    if (!hasClinicalInsightsAccess(req)) {
      return res.status(403).json({ message: 'Access denied for clinical insights' });
    }

    const { patientFeatures, topK = 10 } = req.body || {};
    if (!patientFeatures) {
      return res.status(400).json({ message: 'patientFeatures is required' });
    }

    const result = await mlService.recommendTreatment(patientFeatures, topK);
    return res.json(result);
  } catch (error) {
    return res.status(502).json({ message: 'ML service unavailable', error: error.message });
  }
});

router.post('/predict-outcome', authenticateToken, async (req, res) => {
  try {
    if (!hasClinicalInsightsAccess(req)) {
      return res.status(403).json({ message: 'Access denied for clinical insights' });
    }

    const { patientFeatures, treatmentPlan = {} } = req.body || {};
    if (!patientFeatures) {
      return res.status(400).json({ message: 'patientFeatures is required' });
    }

    const result = await mlService.predictClinicalOutcome(patientFeatures, treatmentPlan);
    return res.json(result);
  } catch (error) {
    return res.status(502).json({ message: 'ML service unavailable', error: error.message });
  }
});

function emitForecastEvent(req, event, payload) {
  const io = req.app.get('io');
  if (io) {
    io.emit(event, payload);
  }
}

router.post('/v2/forecast/causal-analysis', authenticateToken, validateHospitalAccess, async (req, res) => {
  try {
    const payload = {
      ...req.body,
      hospitalId: req.body.hospitalId || req.hospitalId,
    };
    const result = await mlService.causalAnalysisV2(payload);
    return res.json(result);
  } catch (error) {
    return res.status(502).json({ message: 'ML v2 causal service unavailable', error: error.message });
  }
});

router.post('/v2/forecast/bayesian/update', authenticateToken, validateHospitalAccess, async (req, res) => {
  try {
    const payload = {
      ...req.body,
      hospitalId: req.body.hospitalId || req.hospitalId,
    };
    const result = await mlService.bayesianUpdateV2(payload);
    return res.json(result);
  } catch (error) {
    return res.status(502).json({ message: 'ML v2 bayesian update unavailable', error: error.message });
  }
});

router.get('/v2/forecast/bayesian/predict', authenticateToken, async (req, res) => {
  try {
    const bloodGroup = req.query.bloodGroup || 'O+';
    const horizon = Number(req.query.horizon || 7);
    const result = await mlService.bayesianPredictV2(bloodGroup, horizon);
    return res.json(result);
  } catch (error) {
    return res.status(502).json({ message: 'ML v2 bayesian predict unavailable', error: error.message });
  }
});

router.get('/v2/forecast/epi-coupling/active-alerts', authenticateToken, validateHospitalAccess, async (req, res) => {
  try {
    const result = await mlService.epiActiveAlertsV2(req.hospitalId || req.query.hospitalId || req.user._id);
    if (Array.isArray(result.activeOutbreaks) && result.activeOutbreaks.length > 0) {
      emitForecastEvent(req, 'outbreak-detected', {
        hospitalId: req.hospitalId,
        outbreaks: result.activeOutbreaks,
        generatedAt: result.generated_at,
      });
    }
    return res.json(result);
  } catch (error) {
    return res.status(502).json({ message: 'ML v2 epi alerts unavailable', error: error.message });
  }
});

router.post('/v2/forecast/epi-coupling/adjust', authenticateToken, validateHospitalAccess, async (req, res) => {
  try {
    const result = await mlService.epiAdjustV2(req.body || {});
    return res.json(result);
  } catch (error) {
    return res.status(502).json({ message: 'ML v2 epi adjust unavailable', error: error.message });
  }
});

router.get('/v2/forecast/rare-group-augmentation/status', authenticateToken, validateHospitalAccess, async (req, res) => {
  try {
    const result = await mlService.rareGroupStatusV2(req.hospitalId || req.query.hospitalId || req.user._id);
    return res.json(result);
  } catch (error) {
    return res.status(502).json({ message: 'ML v2 augmentation status unavailable', error: error.message });
  }
});

router.post('/v2/forecast/rare-group-augmentation/trigger', authenticateToken, validateHospitalAccess, async (req, res) => {
  try {
    const result = await mlService.rareGroupTriggerV2(req.body || {});
    return res.json(result);
  } catch (error) {
    return res.status(502).json({ message: 'ML v2 augmentation trigger unavailable', error: error.message });
  }
});

router.post('/v2/forecast/monte-carlo-stress/run', authenticateToken, validateHospitalAccess, async (req, res) => {
  try {
    const payload = {
      ...req.body,
      hospitalId: req.body.hospitalId || req.hospitalId,
    };
    const result = await mlService.monteCarloStressV2(payload);
    const highRisk = Object.values(result.stockoutProbability || {}).some((value) => Number(value) > 0.7);
    if (highRisk) {
      emitForecastEvent(req, 'stockout-probability-high', {
        hospitalId: req.hospitalId,
        scenario: result.scenario,
        stockoutProbability: result.stockoutProbability,
        generatedAt: result.generated_at,
      });
    }
    return res.json(result);
  } catch (error) {
    return res.status(502).json({ message: 'ML v2 Monte Carlo unavailable', error: error.message });
  }
});

router.get('/v2/forecast/circadian', authenticateToken, async (req, res) => {
  try {
    const bloodGroup = req.query.bloodGroup || 'O+';
    const hours = Number(req.query.hours || 24);
    const result = await mlService.circadianV2(bloodGroup, hours);

    const imminentPeak = (result.curve || []).find((item) => item.urgencyWindow === true);
    if (imminentPeak) {
      emitForecastEvent(req, 'circadian-peak-approaching', {
        hospitalId: req.query.hospitalId || req.user?._id,
        bloodGroup,
        nextPeakHour: imminentPeak.hour,
        generatedAt: result.generated_at,
      });
    }

    return res.json(result);
  } catch (error) {
    return res.status(502).json({ message: 'ML v2 circadian unavailable', error: error.message });
  }
});

router.get('/v2/forecast/supply-demand-coforecast/gap-analysis', authenticateToken, validateHospitalAccess, async (req, res) => {
  try {
    const weeks = Number(req.query.weeks || 6);
    const result = await mlService.supplyGapV2(req.hospitalId || req.user._id, weeks);

    const criticalRows = (result.rows || []).filter((row) => row.gapSeverity === 'critical');
    if (criticalRows.length > 0) {
      emitForecastEvent(req, 'gap-critical', {
        hospitalId: req.hospitalId,
        criticalRows,
        generatedAt: result.generated_at,
      });
    }

    return res.json(result);
  } catch (error) {
    return res.status(502).json({ message: 'ML v2 supply-demand gap unavailable', error: error.message });
  }
});

router.post('/v2/forecast/supply-demand-coforecast/optimize-recruitment', authenticateToken, validateHospitalAccess, async (req, res) => {
  try {
    const result = await mlService.optimizeRecruitmentV2(req.body || {});
    return res.json(result);
  } catch (error) {
    return res.status(502).json({ message: 'ML v2 recruitment optimizer unavailable', error: error.message });
  }
});

router.post('/v2/forecast/hospital-actions', authenticateToken, validateHospitalAccess, async (req, res) => {
  try {
    const { actionType, payload = {} } = req.body || {};
    const allowed = ['schedule_camp', 'notify_lab_team', 'broadcast_peak_alert', 'set_safety_stock_floor'];
    if (!allowed.includes(actionType)) {
      return res.status(400).json({ message: 'Unsupported actionType' });
    }

    const response = {
      success: true,
      actionType,
      hospitalId: req.hospitalId,
      payload,
      executedAt: new Date().toISOString(),
      model_version: 'ops-action-v2.0',
      confidence_level: 0.92,
    };

    emitForecastEvent(req, 'hospital-forecast-action', response);
    return res.json(response);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to execute hospital action', error: error.message });
  }
});

module.exports = router;
