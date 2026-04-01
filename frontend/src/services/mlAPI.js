import api from './axiosInstance';

export const predictDemand = (hospitalId, bloodGroup, horizonDays = 7) =>
  api.post('/ml/predict/demand', { hospitalId, bloodGroup, horizonDays });

export const predictCrisis = (hospitalId, lookaheadHours = 48) =>
  api.post('/ml/predict/crisis', { hospitalId, lookaheadHours });

export const predictDonorReturn = (donorId, donationHistory = [], demographics = {}) =>
  api.post('/ml/predict/donor-return', { donorId, donationHistory, demographics });

export const predictWastage = (hospitalId, bloodGroup = null, horizonDays = 14) =>
  api.post('/ml/predict/wastage', { hospitalId, bloodGroup, horizonDays });

export const detectAnomalies = (hospitalId = null, metricType = 'inventory', timeWindowHours = 24) =>
  api.post('/ml/predict/anomalies', { hospitalId, metricType, timeWindowHours });

export const rankHospitals = (
  bloodGroup,
  urgency,
  patientLocation,
  unitsNeeded = 1,
  maxDistanceKm = 50,
  useOptimizationValidation = false
) =>
  api.post('/ml/predict/hospital-ranking', {
    bloodGroup,
    urgency,
    patientLocation,
    unitsNeeded,
    maxDistanceKm,
    useOptimizationValidation
  });

export const autoContactHospital = ({
  topHospitalId = null,
  bloodGroup,
  unitsNeeded = 1,
  urgency = 'high',
  maxDistanceKm = 50,
  patientLocation = null,
  useOptimizationValidation = false
} = {}) =>
  api.post('/hospital/auto-contact', {
    topHospitalId,
    bloodGroup,
    unitsNeeded,
    urgency,
    maxDistanceKm,
    patientLocation,
    useOptimizationValidation
  });

export const runSimulation = (scenarioType, parameters, durationDays = 30, monteCarloRuns = 100) =>
  api.post('/ml/simulation/run', { scenarioType, parameters, durationDays, monteCarloRuns });

export const optimizeTransfers = (
  {
    mode = 'auto',
    constraints = {},
    hospitalIds = null,
    bloodGroups = null,
    timeHorizonDays = 7,
    includeRLSuggestions = true,
    includeGraphConnectivity = true
  } = {}
) =>
  api.post('/optimize/transfers', {
    mode,
    constraints,
    hospitalIds,
    bloodGroups,
    timeHorizonDays,
    includeRLSuggestions,
    includeGraphConnectivity
  });

export const getOptimizationHistory = (limit = 12) =>
  api.get('/optimize/history', { params: { limit } });

export const getOptimizationCompare = (runId = null) =>
  api.get('/optimize/compare', {
    params: runId ? { runId } : {}
  });

export const generateSyntheticData = (
  {
    dataType = 'donors',
    count = 100,
    seed = 42,
    scenario = 'normal',
    district = 'all',
    includeGeo = true,
    injectToSystem = false
  } = {}
) =>
  api.post('/synthetic/generate', {
    dataType,
    count,
    seed,
    scenario,
    district,
    includeGeo,
    injectToSystem
  });

export const getSyntheticPreview = (generationId = null, limit = 20) =>
  api.get('/synthetic/preview', {
    params: {
      ...(generationId ? { generationId } : {}),
      limit
    }
  });

export const getSyntheticHistory = (limit = 10) =>
  api.get('/synthetic/history', { params: { limit } });

export const getMLHealth = () =>
  api.get('/ml/health');

export const digitalTwinSimulate = (scenario = 'baseline', parameters = {}, durationDays = 14, monteCarloRuns = 20) =>
  api.post('/ml/digital-twin/simulate', { scenario, parameters, durationDays, monteCarloRuns });

export const digitalTwinStatus = () =>
  api.get('/ml/digital-twin/status');

export const digitalTwinResilience = () =>
  api.get('/ml/digital-twin/resilience-score');

export const digitalTwinCompare = (
  scenarios = ['baseline', 'disaster', 'donor_campaign'],
  parameters = {},
  durationDays = 14,
  monteCarloRuns = 200
) =>
  api.post('/ml/digital-twin/compare', { scenarios, parameters, durationDays, monteCarloRuns });

export const digitalTwinStrategyRecommendation = (parameters = {}, durationDays = 14, monteCarloRuns = 200) =>
  api.post('/ml/digital-twin/strategy-recommendation', { parameters, durationDays, monteCarloRuns });

export const rlAgentTrain = (episodes = 50, algorithm = 'policy_gradient', maxHospitals = 10) =>
  api.post('/ml/rl-agent/train', { episodes, algorithm, maxHospitals });

export const rlAgentSimulate = (strategy = 'optimal', durationDays = 30) =>
  api.post('/ml/rl-agent/simulate', { strategy, durationDays });

export const rlAgentPolicy = () =>
  api.get('/ml/rl-agent/policy');

export const graphCentrality = (metric = 'all') =>
  api.get(`/ml/graph/centrality?metric=${metric}`);

export const graphBottlenecks = (threshold = 0.3) =>
  api.get(`/ml/graph/bottlenecks?threshold=${threshold}`);

export const graphStabilityIndex = () =>
  api.get('/ml/graph/stability-index');
