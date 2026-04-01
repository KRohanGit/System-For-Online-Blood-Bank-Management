const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const mlService = require('../services/ml/mlService');
const hospitalDecisionAssistant = require('../services/hospital-decision-assistant');
const { authenticateToken } = require('../middleware/auth');
const HospitalProfile = require('../models/HospitalProfile');

async function validateHospitalAccess(req, res, next) {
  try {
    const { hospitalId } = req.body;

    if (!hospitalId || !mongoose.Types.ObjectId.isValid(hospitalId)) {
      return res.status(400).json({ message: 'Valid hospitalId is required' });
    }

    const profile = await HospitalProfile.findById(hospitalId).select('_id userId');
    if (!profile) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    const role = String(req.userRole || '').toLowerCase();
    if (role !== 'super_admin' && String(profile.userId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Access denied for requested hospitalId' });
    }

    req.targetHospitalProfile = profile;
    next();
  } catch (error) {
    return res.status(500).json({ message: 'Failed to validate hospital access', error: error.message });
  }
}


router.post('/predict/demand', authenticateToken, validateHospitalAccess, async (req, res) => {
  try {
    const { hospitalId, bloodGroup, horizonDays } = req.body;
    const result = await mlService.predictDemand(hospitalId, bloodGroup, horizonDays);
    res.json(result);
  } catch (error) {
    res.status(502).json({ message: 'ML service unavailable', error: error.message });
  }
});

router.post('/predict/crisis', authenticateToken, validateHospitalAccess, async (req, res) => {
  try {
    const { hospitalId, lookaheadHours } = req.body;
    const result = await mlService.predictCrisis(hospitalId, lookaheadHours);
    res.json(result);
  } catch (error) {
    res.status(502).json({ message: 'ML service unavailable', error: error.message });
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
    res.json(result);
  } catch (error) {
    res.status(502).json({ message: 'ML service unavailable', error: error.message });
  }
});

router.post('/predict/anomalies', authenticateToken, async (req, res) => {
  try {
    const { hospitalId, metricType, timeWindowHours } = req.body;
    const result = await mlService.detectAnomalies(hospitalId, metricType, timeWindowHours);
    res.json(result);
  } catch (error) {
    res.status(502).json({ message: 'ML service unavailable', error: error.message });
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

router.post('/synthetic/generate', authenticateToken, async (req, res) => {
  try {
    const { dataType, count, hospitalIds, seed } = req.body;
    const result = await mlService.generateSyntheticData(dataType, count, hospitalIds, seed);
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

module.exports = router;
