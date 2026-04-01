const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';

// ML Service connection state
let mlServiceReady = false;
let mlServiceCheckInterval = null;

/**
 * Call ML Service with automatic retry mechanism
 * Retries up to 3 times with exponential backoff if service is unavailable
 */
async function callMLService(endpoint, method = 'POST', body = null, retries = 3) {
  const url = `${ML_SERVICE_URL}${endpoint}`;
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000 // 30 second timeout
  };
  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const error = await response.text();
        // If service is temporarily unavailable, retry
        if (response.status === 503 || response.status === 502) {
          if (attempt < retries - 1) {
            const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
            console.log(`⚠️  ML Service temporarily unavailable (${response.status}). Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        throw new Error(`ML Service error (${response.status}): ${error}`);
      }
      
      mlServiceReady = true;
      return response.json();
    } catch (error) {
      // If this is the last attempt, throw the error
      if (attempt === retries - 1) {
        mlServiceReady = false;
        throw new Error(`ML Service unavailable: ${error.message}. Make sure ML service is running on ${ML_SERVICE_URL}`);
      }
      
      // Otherwise, wait and retry
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`⚠️  ML Service connection attempt ${attempt + 1}/${retries} failed. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

async function predictDemand(hospitalId, bloodGroup, horizonDays = 7) {
  return callMLService('/predict/demand', 'POST', {
    hospital_id: hospitalId,
    blood_group: bloodGroup,
    horizon_days: horizonDays,
    include_confidence: true
  });
}

async function predictCrisis(hospitalId, lookaheadHours = 48) {
  return callMLService('/predict/crisis', 'POST', {
    hospital_id: hospitalId,
    lookahead_hours: lookaheadHours
  });
}

async function predictDonorReturn(donorId, donationHistory = [], demographics = {}) {
  return callMLService('/predict/donor-return', 'POST', {
    donor_id: donorId,
    donation_history: donationHistory,
    demographics
  });
}

async function predictWastage(hospitalId, bloodGroup = null, horizonDays = 14) {
  return callMLService('/predict/wastage', 'POST', {
    hospital_id: hospitalId,
    blood_group: bloodGroup,
    horizon_days: horizonDays
  });
}

async function detectAnomalies(hospitalId = null, metricType = 'inventory', timeWindowHours = 24) {
  return callMLService('/predict/anomalies', 'POST', {
    hospital_id: hospitalId,
    metric_type: metricType,
    time_window_hours: timeWindowHours
  });
}

async function rankHospitals(bloodGroup, urgency, patientLocation, unitsNeeded = 1, maxDistanceKm = 50) {
  return callMLService('/predict/hospital-ranking', 'POST', {
    blood_group: bloodGroup,
    urgency,
    patient_location: patientLocation,
    units_needed: unitsNeeded,
    max_distance_km: maxDistanceKm
  });
}

async function runSimulation(scenarioType, parameters, durationDays = 30, monteCarloRuns = 100) {
  return callMLService('/simulation/run', 'POST', {
    scenario_type: scenarioType,
    parameters,
    duration_days: durationDays,
    monte_carlo_runs: monteCarloRuns
  });
}

async function optimizeTransfers(objective = 'minimize_waste', constraints = {}, hospitalIds = null, bloodGroups = null) {
  return callMLService('/optimize/classical', 'POST', {
    objective,
    constraints,
    hospital_ids: hospitalIds,
    blood_groups: bloodGroups
  });
}

async function generateSyntheticData(dataType, count = 100, hospitalIds = null, seed = 42) {
  return callMLService('/synthetic/generate', 'POST', {
    data_type: dataType,
    count,
    hospital_ids: hospitalIds,
    seed
  });
}

async function getMLHealth() {
  return callMLService('/health', 'GET');
}

async function digitalTwinSimulate(scenario = 'baseline', parameters = {}, durationDays = 14, monteCarloRuns = 20) {
  return callMLService('/digital-twin/simulate', 'POST', {
    scenario, parameters, duration_days: durationDays, monte_carlo_runs: monteCarloRuns
  });
}

async function digitalTwinStatus() {
  return callMLService('/digital-twin/status', 'GET');
}

async function digitalTwinResilience() {
  return callMLService('/digital-twin/resilience-score', 'GET');
}

async function digitalTwinCompare(scenarios = ['baseline', 'disaster', 'donor_campaign'], parameters = {}, durationDays = 14, monteCarloRuns = 200) {
  return callMLService('/digital-twin/compare', 'POST', {
    scenarios,
    parameters,
    duration_days: durationDays,
    monte_carlo_runs: monteCarloRuns
  });
}

async function digitalTwinStrategyRecommendation(parameters = {}, durationDays = 14, monteCarloRuns = 200) {
  return callMLService('/digital-twin/strategy-recommendation', 'POST', {
    parameters,
    duration_days: durationDays,
    monte_carlo_runs: monteCarloRuns
  });
}

async function rlAgentTrain(episodes = 50, algorithm = 'policy_gradient', maxHospitals = 10) {
  return callMLService('/rl-agent/train', 'POST', {
    episodes, algorithm, max_hospitals: maxHospitals
  });
}

async function rlAgentSimulate(strategy = 'optimal', durationDays = 30) {
  return callMLService('/rl-agent/simulate', 'POST', {
    strategy, duration_days: durationDays
  });
}

async function rlAgentPolicy() {
  return callMLService('/rl-agent/policy', 'GET');
}

async function graphCentrality(metric = 'all') {
  return callMLService(`/graph/centrality?metric=${metric}`, 'GET');
}

async function graphBottlenecks(threshold = 0.3) {
  return callMLService(`/graph/bottlenecks?threshold=${threshold}`, 'GET');
}

async function graphStabilityIndex() {
  return callMLService('/graph/stability-index', 'GET');
}

/**
 * Start monitoring ML Service health
 * Periodically checks if ML service is available and logs status
 */
function startMLServiceMonitoring() {
  // Check immediately
  checkMLServiceHealth();

  // Then check every 30 seconds
  mlServiceCheckInterval = setInterval(checkMLServiceHealth, 30000);
  console.log('🔍 ML Service health monitoring started (checks every 30 seconds)');
}

/**
 * Check ML Service health
 */
async function checkMLServiceHealth() {
  try {
    const health = await callMLService('/health', 'GET', null, 1);
    mlServiceReady = true;
    console.log(`✅ ML Service is healthy and ready at ${ML_SERVICE_URL}`);
  } catch (error) {
    mlServiceReady = false;
    console.warn(`⚠️  ML Service health check failed: ${error.message}`);
  }
}

/**
 * Stop ML Service monitoring
 */
function stopMLServiceMonitoring() {
  if (mlServiceCheckInterval) {
    clearInterval(mlServiceCheckInterval);
    mlServiceCheckInterval = null;
    console.log('🛑 ML Service health monitoring stopped');
  }
}

/**
 * Get ML Service status
 */
function isMLServiceReady() {
  return mlServiceReady;
}

/**
 * Get ML Service URL
 */
function getMLServiceURL() {
  return ML_SERVICE_URL;
}

module.exports = {
  callMLService,
  predictDemand,
  predictCrisis,
  predictDonorReturn,
  predictWastage,
  detectAnomalies,
  rankHospitals,
  runSimulation,
  optimizeTransfers,
  generateSyntheticData,
  getMLHealth,
  digitalTwinSimulate,
  digitalTwinStatus,
  digitalTwinResilience,
  digitalTwinCompare,
  digitalTwinStrategyRecommendation,
  rlAgentTrain,
  rlAgentSimulate,
  rlAgentPolicy,
  graphCentrality,
  graphBottlenecks,
  graphStabilityIndex,
  startMLServiceMonitoring,
  stopMLServiceMonitoring,
  isMLServiceReady,
  getMLServiceURL
};
