import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
};

export const donorAPI = {
  loginWithOTP: (email, otp) =>
    axios.post(`${API_URL}/api/donor-auth/login/otp`, { email, otp }),

  loginWithPassword: (email, password) =>
    axios.post(`${API_URL}/api/donor-auth/login/password`, { email, password }),

  changePassword: (newPassword) =>
    axios.post(
      `${API_URL}/api/donor-auth/change-password`,
      { newPassword },
      { headers: getAuthHeaders() }
    ),

  getDashboard: () =>
    axios.get(`${API_URL}/api/donor-dashboard/dashboard`, {
      headers: getAuthHeaders()
    }),

  getHistory: () =>
    axios.get(`${API_URL}/api/donor-dashboard/history`, {
      headers: getAuthHeaders()
    }),

  getCertificates: () =>
    axios.get(`${API_URL}/api/donor-dashboard/certificates`, {
      headers: getAuthHeaders()
    }),

  getEmergencyMessages: () =>
    axios.get(`${API_URL}/api/emergency/messages`, {
      headers: getAuthHeaders()
    }),

  markMessageAsRead: (messageId) =>
    axios.put(
      `${API_URL}/api/emergency/messages/${messageId}/read`,
      {},
      { headers: getAuthHeaders() }
    )
};

export const donationAPI = {
  createDonation: (data) =>
    axios.post(`${API_URL}/api/donations/create`, data, {
      headers: getAuthHeaders()
    }),

  getDonations: () =>
    axios.get(`${API_URL}/api/donations/list`, { headers: getAuthHeaders() }),

  completeDonation: (donationId) =>
    axios.put(
      `${API_URL}/api/donations/complete/${donationId}`,
      {},
      { headers: getAuthHeaders() }
    ),

  getDonors: () =>
    axios.get(`${API_URL}/api/donations/donors`, { headers: getAuthHeaders() })
};

export const emergencyAPI = {
  sendAlert: (bloodGroup, message) =>
    axios.post(
      `${API_URL}/api/emergency/send`,
      { bloodGroup, message },
      { headers: getAuthHeaders() }
    )
};
