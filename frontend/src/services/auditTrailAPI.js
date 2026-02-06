import api from './api';

const auditTrailAPI = {
  getAuditLogs: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await api.get(`/audit-trail/logs?${params}`);
    return response.data;
  },

  getLogDetails: async (logId) => {
    const response = await api.get(`/audit-trail/logs/${logId}`);
    return response.data;
  },

  getActionDistribution: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await api.get(`/audit-trail/analytics/action-distribution?${params}`);
    return response.data;
  },

  getOverrideFrequency: async (days = 30, doctorId) => {
    const params = new URLSearchParams({ days });
    if (doctorId) params.append('doctorId', doctorId);
    const response = await api.get(`/audit-trail/analytics/override-frequency?${params}`);
    return response.data;
  },

  getBloodUsageAnalytics: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await api.get(`/audit-trail/analytics/blood-usage?${params}`);
    return response.data;
  },

  getEmergencyPatterns: async (days = 30) => {
    const response = await api.get(`/audit-trail/analytics/emergency-patterns?days=${days}`);
    return response.data;
  }
};

export default auditTrailAPI;
