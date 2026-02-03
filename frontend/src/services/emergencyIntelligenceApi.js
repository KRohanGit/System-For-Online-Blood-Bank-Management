import api from './axiosInstance';

/**
 * Emergency Intelligence Service
 * Handles all API calls for emergency scenario management
 */

// Create a new emergency scenario
export const createEmergencyScenario = async (scenarioData) => {
  const response = await api.post('/emergency-intelligence/scenarios', scenarioData);
  return response.data;
};

// Get all scenarios
export const getAllScenarios = async (filters = {}) => {
  const response = await api.get('/emergency-intelligence/scenarios', { params: filters });
  return response.data;
};

// Get scenario by ID
export const getScenarioById = async (scenarioId) => {
  const response = await api.get(`/emergency-intelligence/scenarios/${scenarioId}`);
  return response.data;
};

// Re-run simulation with modified parameters
export const rerunSimulation = async (scenarioId, modifications) => {
  const response = await api.put(`/emergency-intelligence/scenarios/${scenarioId}/rerun`, modifications);
  return response.data;
};

// Approve or reject a recommendation
export const updateRecommendation = async (scenarioId, recommendationIndex, decision) => {
  const response = await api.put(
    `/emergency-intelligence/scenarios/${scenarioId}/recommendations/${recommendationIndex}`,
    decision
  );
  return response.data;
};

// Delete a scenario
export const deleteScenario = async (scenarioId) => {
  const response = await api.delete(`/emergency-intelligence/scenarios/${scenarioId}`);
  return response.data;
};

// Helper: Get active scenarios only
export const getActiveScenarios = async () => {
  return getAllScenarios({ status: 'active', isSimulation: 'false' });
};

// Helper: Get simulation scenarios only
export const getSimulationScenarios = async () => {
  return getAllScenarios({ isSimulation: 'true' });
};
