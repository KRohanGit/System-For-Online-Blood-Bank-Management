import api from './axiosInstance';

/**
 * Doctor Clinical Intelligence API Service
 * Handles all doctor dashboard API calls
 */

// Get doctor dashboard overview
export const getDoctorOverview = async () => {
  const response = await api.get('/doctor-clinical/overview');
  return response.data;
};

// Blood Unit Validation
export const getBloodUnitsForValidation = async (params = {}) => {
  const response = await api.get('/doctor-clinical/blood-units/pending', { params });
  return response.data;
};

export const validateBloodUnit = async (unitId, validationData) => {
  const response = await api.post(`/doctor-clinical/blood-units/${unitId}/validate`, validationData);
  return response.data;
};

// Blood Request Review
export const getBloodRequestsForReview = async (params = {}) => {
  const response = await api.get('/doctor-clinical/blood-requests', { params });
  return response.data;
};

export const reviewBloodRequestUrgency = async (requestId, reviewData) => {
  const response = await api.post(`/doctor-clinical/blood-requests/${requestId}/review`, reviewData);
  return response.data;
};

// Emergency Consults
export const getEmergencyConsults = async (params = {}) => {
  const response = await api.get('/doctor-clinical/consults', { params });
  return response.data;
};

export const respondToConsult = async (consultId, responseData) => {
  const response = await api.post(`/doctor-clinical/consults/${consultId}/respond`, responseData);
  return response.data;
};

// Doctor Availability
export const updateAvailability = async (availabilityData) => {
  const response = await api.post('/doctor-clinical/availability', availabilityData);
  return response.data;
};

// Blood Camp Oversight
export const getCampsForOversight = async (params = {}) => {
  const response = await api.get('/doctor-clinical/camps', { params });
  return response.data;
};

export const submitCampOversight = async (campId, oversightData) => {
  const response = await api.post(`/doctor-clinical/camps/${campId}/oversight`, oversightData);
  return response.data;
};

// Clinical Advisory
export const submitClinicalAdvisory = async (advisoryData) => {
  const response = await api.post('/doctor-clinical/advisories', advisoryData);
  return response.data;
};

export const getClinicalAdvisories = async (params = {}) => {
  const response = await api.get('/doctor-clinical/advisories', { params });
  return response.data;
};

// Audit Trail
export const getAuditTrail = async (params = {}) => {
  const response = await api.get('/doctor-clinical/audit-trail', { params });
  return response.data;
};

const doctorClinicalAPI = {
  getDoctorOverview,
  getBloodUnitsForValidation,
  validateBloodUnit,
  getBloodRequestsForReview,
  reviewBloodRequestUrgency,
  getEmergencyConsults,
  respondToConsult,
  updateAvailability,
  getCampsForOversight,
  submitCampOversight,
  submitClinicalAdvisory,
  getClinicalAdvisories,
  getAuditTrail
};

export default doctorClinicalAPI;
