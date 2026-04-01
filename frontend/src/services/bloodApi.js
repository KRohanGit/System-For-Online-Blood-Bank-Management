import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Blood API Client
 * 
 * All blood tracing and lifecycle management endpoints
 */

const bloodApi = {
  // Public: Trace blood unit by ID or QR code
  traceBloodUnit: async (unitId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/blood/trace/${unitId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: error.message };
    }
  },

  // Donor: Get all my blood unit donations
  getDonorBloodUnits: async () => {
    try {
      const response = await apiClient.get('/blood/my-donations');
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: error.message };
    }
  },

  // Admin: Create blood unit
  createBloodUnit: async (donorId, bloodGroup, component, volume = 450) => {
    try {
      const response = await apiClient.post('/blood/create', {
        donorId,
        bloodGroup,
        component,
        volume
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: error.message };
    }
  },

  // Admin: Get blood unit details
  getBloodUnitDetails: async (unitId) => {
    try {
      const response = await apiClient.get(`/blood/unit/${unitId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: error.message };
    }
  },

  // Admin: Get unit timeline
  getUnitTimeline: async (unitId) => {
    try {
      const response = await apiClient.get(`/blood/timeline/${unitId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: error.message };
    }
  },

  // Transfer: Initiate transfer
  initiateTransfer: async (unitId, toFacility, toFacilityName) => {
    try {
      const response = await apiClient.post('/blood/transfer/initiate', {
        unitId,
        toFacility,
        toFacilityName
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: error.message };
    }
  },

  // Transfer: Complete transfer
  completeTransfer: async (unitId, facility, facilityName, metadata = {}) => {
    try {
      const response = await apiClient.post('/blood/transfer/complete', {
        unitId,
        facility,
        facilityName,
        metadata
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: error.message };
    }
  },

  // Usage: Record transfusion
  recordUsage: async (unitId, hospital, ageGroup, procedure, urgency, outcome) => {
    try {
      const response = await apiClient.post('/blood/usage/record', {
        unitId,
        hospital,
        ageGroup,
        procedure,
        urgency,
        outcome
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: error.message };
    }
  },

  // Monitoring: Get status
  getMonitoringStatus: async () => {
    try {
      const response = await apiClient.get('/blood/monitoring/status');
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: error.message };
    }
  },

  // Monitoring: Run AI checks
  runAIMonitoring: async () => {
    try {
      const response = await apiClient.post('/blood/monitoring/run');
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: error.message };
    }
  }
};

export default bloodApi;
