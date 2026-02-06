import api from './api';

const clinicalAdvisoryAPI = {
  getActiveAdvisories: async () => {
    const response = await api.get('/clinical-advisory/active');
    return response.data;
  },

  getTransfusionAdvisory: async (data) => {
    const response = await api.post('/clinical-advisory/transfusion', data);
    return response.data;
  },

  recordAction: async (actionData) => {
    const response = await api.post('/clinical-advisory/action', actionData);
    return response.data;
  },

  getTrends: async (days = 30) => {
    const response = await api.get(`/clinical-advisory/trends?days=${days}`);
    return response.data;
  }
};

export default clinicalAdvisoryAPI;
