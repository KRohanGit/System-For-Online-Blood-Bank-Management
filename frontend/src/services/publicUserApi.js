const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const register = async (formData) => {
  const response = await fetch(`${API_BASE_URL}/public/register`, {
    method: 'POST',
    body: formData
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Registration failed');
  }
  return data;
};

export const login = async (email, password) => {
  const response = await fetch(`${API_BASE_URL}/public/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Login failed');
  }
  return data;
};

export const getNearbyBloodBanks = async (latitude, longitude, radius = 10, bloodGroup = '') => {
  const params = new URLSearchParams({ latitude, longitude, radius });
  if (bloodGroup) params.append('bloodGroup', bloodGroup);
  
  const response = await fetch(`${API_BASE_URL}/public/nearby-blood-banks?${params}`, {
    headers: getAuthHeader()
  });
  return response.json();
};

export const getBloodNews = async (latitude = null, longitude = null, radius = 50, bloodGroup = '') => {
  const params = new URLSearchParams();
  if (latitude) params.append('latitude', latitude);
  if (longitude) params.append('longitude', longitude);
  params.append('radius', radius);
  if (bloodGroup) params.append('bloodGroup', bloodGroup);
  
  const response = await fetch(`${API_BASE_URL}/public/blood-news?${params}`, {
    headers: getAuthHeader()
  });
  return response.json();
};

export const respondToBloodNews = async (newsId, message) => {
  const response = await fetch(`${API_BASE_URL}/public/blood-news/${newsId}/respond`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify({ message })
  });
  return response.json();
};

export const getMyCertificates = async () => {
  const response = await fetch(`${API_BASE_URL}/public/certificates`, {
    headers: getAuthHeader()
  });
  return response.json();
};

export const getCertificateById = async (certificateId) => {
  const response = await fetch(`${API_BASE_URL}/public/certificates/${certificateId}`, {
    headers: getAuthHeader()
  });
  return response.json();
};

export const verifyCertificate = async (certificateNumber, verificationHash) => {
  const response = await fetch(`${API_BASE_URL}/public/certificates/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ certificateNumber, verificationHash })
  });
  return response.json();
};

export const requestEmergencyDonorChain = async (payload) => {
  const response = await fetch(`${API_BASE_URL}/emergency/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(payload)
  });
  return response.json();
};

export const respondEmergencyDonorChain = async (requestId, decision) => {
  const response = await fetch(`${API_BASE_URL}/emergency/request/${requestId}/respond`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify({ decision })
  });
  return response.json();
};

export const getMyEmergencyChainRequests = async () => {
  const response = await fetch(`${API_BASE_URL}/emergency/request/my`, {
    headers: getAuthHeader()
  });
  return response.json();
};

export const getEmergencyChainRequestById = async (requestId) => {
  const response = await fetch(`${API_BASE_URL}/emergency/request/${requestId}`, {
    headers: getAuthHeader()
  });
  return response.json();
};

export const getMyPendingDonorChainActions = async () => {
  const response = await fetch(`${API_BASE_URL}/emergency/donor-chain/pending`, {
    headers: getAuthHeader()
  });
  return response.json();
};
