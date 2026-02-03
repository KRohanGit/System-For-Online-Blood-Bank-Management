import api from './axiosInstance';

export const getDashboardStats = async () => {
  const response = await api.get('/doctor/dashboard/stats');
  return response.data;
};

export const getBloodRequests = async (filters = {}) => {
  const response = await api.get('/doctor/blood-requests', { params: filters });
  return response.data;
};

export const validateBloodRequest = async (requestId, validationData) => {
  const response = await api.post(`/doctor/blood-requests/${requestId}/validate`, validationData);
  return response.data;
};

export const getDonorsForScreening = async (filters = {}) => {
  const response = await api.get('/doctor/donors/screening', { params: filters });
  return response.data;
};

export const screenDonor = async (donorId, screeningData) => {
  const response = await api.post(`/doctor/donors/${donorId}/screen`, screeningData);
  return response.data;
};

export const getBloodUnitsForValidation = async (filters = {}) => {
  const response = await api.get('/doctor/blood-units/validation', { params: filters });
  return response.data;
};

export const validateBloodUnit = async (unitId, validationData) => {
  const response = await api.post(`/doctor/blood-units/${unitId}/validate`, validationData);
  return response.data;
};

export const getAdverseReactions = async (filters = {}) => {
  const response = await api.get('/doctor/adverse-reactions', { params: filters });
  return response.data;
};

export const logAdverseReaction = async (reactionData) => {
  const response = await api.post('/doctor/adverse-reactions', reactionData);
  return response.data;
};

export const getCampsForOversight = async (filters = {}) => {
  const response = await api.get('/doctor/camps/oversight', { params: filters });
  return response.data;
};

export const validateCamp = async (campId, validationData) => {
  const response = await api.post(`/doctor/camps/${campId}/validate`, validationData);
  return response.data;
};

export const getEmergencyRequests = async () => {
  const response = await api.get('/doctor/emergency-requests');
  return response.data;
};

export const fastTrackApproval = async (emergencyId, approvalData) => {
  const response = await api.post(`/doctor/emergency-requests/${emergencyId}/fast-track`, approvalData);
  return response.data;
};

export const getMedicalNotes = async (filters = {}) => {
  const response = await api.get('/doctor/medical-notes', { params: filters });
  return response.data;
};

export const addMedicalNote = async (noteData) => {
  const response = await api.post('/doctor/medical-notes', noteData);
  return response.data;
};

export const getDoctorAlerts = async () => {
  const response = await api.get('/doctor/alerts');
  return response.data;
};

export const markAlertRead = async (alertId) => {
  const response = await api.put(`/doctor/alerts/${alertId}/read`);
  return response.data;
};
