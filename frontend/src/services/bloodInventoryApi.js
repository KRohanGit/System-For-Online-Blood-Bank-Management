// Blood Inventory API Service
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Helper function to get auth token
const getAuthToken = () => {
  return localStorage.getItem('token');
};

// Helper function for API requests
const apiRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'API request failed');
  }

  return response.json();
};

// Blood Inventory API Functions
export const getAllUnits = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.bloodGroup) params.append('bloodGroup', filters.bloodGroup);
  if (filters.status) params.append('status', filters.status);
  if (filters.page) params.append('page', filters.page);
  if (filters.limit) params.append('limit', filters.limit);

  return apiRequest(`/blood-inventory?${params.toString()}`);
};

export const getStockOverview = async () => {
  return apiRequest('/blood-inventory/stock-overview');
};

export const getStorageCapacity = async () => {
  return apiRequest('/blood-inventory/storage-capacity');
};

export const getNearbyCampsInventory = async (radius = 50) => {
  return apiRequest(`/blood-inventory/nearby-camps?radius=${radius * 1000}`);
};

export const requestBloodFromCamp = async (campId, bloodGroup, units, reason) => {
  return apiRequest('/blood-inventory/request-from-camp', {
    method: 'POST',
    body: JSON.stringify({ campId, bloodGroup, units, reason }),
  });
};

export const addUnit = async (unitData) => {
  return apiRequest('/blood-inventory', {
    method: 'POST',
    body: JSON.stringify(unitData),
  });
};

export const updateUnit = async (unitId, updateData) => {
  return apiRequest(`/blood-inventory/${unitId}`, {
    method: 'PUT',
    body: JSON.stringify(updateData),
  });
};

export const deleteUnit = async (unitId) => {
  return apiRequest(`/blood-inventory/${unitId}`, {
    method: 'DELETE',
  });
};

export const reserveUnit = async (unitId, patientId) => {
  return apiRequest(`/blood-inventory/${unitId}/reserve`, {
    method: 'POST',
    body: JSON.stringify({ patientId }),
  });
};

export const issueUnit = async (unitId, patientId) => {
  return apiRequest(`/blood-inventory/${unitId}/issue`, {
    method: 'POST',
    body: JSON.stringify({ patientId }),
  });
};

export const getUnitLifecycle = async (unitId) => {
  return apiRequest(`/blood-inventory/${unitId}/lifecycle`);
};

export const getExpiringUnits = async () => {
  return apiRequest('/blood-inventory/expiring');
};

export const getFIFOSuggestions = async (bloodGroup = '') => {
  const params = bloodGroup ? `?bloodGroup=${bloodGroup}` : '';
  return apiRequest(`/blood-inventory/fifo-suggestions${params}`);
};

export const emergencyRelease = async (bloodGroup, quantity, patientId, reason) => {
  return apiRequest('/blood-inventory/emergency-release', {
    method: 'POST',
    body: JSON.stringify({ bloodGroup, quantity, patientId, reason }),
  });
};

// Utility Functions
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getExpiryColor = (expiryDate) => {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 1) return '#991b1b'; // Expired - dark red
  if (daysUntilExpiry <= 3) return '#ef4444'; // Critical - red
  if (daysUntilExpiry <= 7) return '#f59e0b'; // Warning - orange
  return '#4b5563'; // Normal - gray
};

export const getStatusColor = (status) => {
  const colors = {
    'Available': '#10b981',
    'Reserved': '#f59e0b',
    'Issued': '#3b82f6',
    'Expired': '#ef4444',
    'Quarantined': '#f97316',
  };
  return colors[status] || '#6b7280';
};
