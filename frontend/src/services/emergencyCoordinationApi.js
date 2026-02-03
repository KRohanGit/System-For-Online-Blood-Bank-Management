/**
 * Emergency Coordination API Service
 * 
 * Handles API calls for emergency blood requests
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const getAuthToken = () => {
  return localStorage.getItem('token');
};

const authHeader = () => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Create new emergency request
 */
export const createEmergencyRequest = async (requestData) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/emergency-coordination/request`,
      requestData,
      { headers: authHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Get all emergency requests
 */
export const getEmergencyRequests = async (filters = {}) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/emergency-coordination/requests`,
      {
        headers: authHeader(),
        params: filters
      }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Get request details
 */
export const getRequestDetails = async (requestId) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/emergency-coordination/request/${requestId}`,
      { headers: authHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Get matching hospitals for request
 */
export const getMatchingHospitals = async (requestId) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/emergency-coordination/request/${requestId}/matches`,
      { headers: authHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Accept emergency request
 */
export const acceptEmergencyRequest = async (requestId, acceptanceData) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/emergency-coordination/request/${requestId}/accept`,
      acceptanceData,
      { headers: authHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Decline emergency request
 */
export const declineEmergencyRequest = async (requestId, reason) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/emergency-coordination/request/${requestId}/decline`,
      { reason },
      { headers: authHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Dispatch blood transfer
 */
export const dispatchBloodTransfer = async (requestId, dispatchData) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/emergency-coordination/request/${requestId}/dispatch`,
      dispatchData,
      { headers: authHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Update transfer location (GPS tracking)
 */
export const updateTransferLocation = async (transferId, locationData) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/emergency-coordination/transfer/${transferId}/location`,
      locationData,
      { headers: authHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Log temperature reading
 */
export const logTemperature = async (transferId, temperatureData) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/emergency-coordination/transfer/${transferId}/temperature`,
      temperatureData,
      { headers: authHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Complete delivery
 */
export const completeDelivery = async (transferId, deliveryData) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/emergency-coordination/transfer/${transferId}/complete`,
      deliveryData,
      { headers: authHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export default {
  createEmergencyRequest,
  getEmergencyRequests,
  getRequestDetails,
  getMatchingHospitals,
  acceptEmergencyRequest,
  declineEmergencyRequest,
  dispatchBloodTransfer,
  updateTransferLocation,
  logTemperature,
  completeDelivery
};
