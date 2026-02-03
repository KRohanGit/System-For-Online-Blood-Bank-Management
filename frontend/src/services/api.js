// API Configuration and Service
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Handle API response
 */
const handleResponse = async (response) => {
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }
  
  return data;
};

/**
 * Make API request with error handling
 */
const apiRequest = async (endpoint, options = {}) => {
  try {
    const config = {
      headers: {
        ...options.headers,
      },
      ...options,
    };

    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token && !options.skipAuth) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    return await handleResponse(response);
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

/**
 * Authentication API calls
 */
export const authAPI = {
  // Register Doctor
  registerDoctor: async (formData) => {
    const data = new FormData();
    data.append('email', formData.email);
    data.append('password', formData.password);
    data.append('name', formData.name);
    data.append('hospitalName', formData.hospitalName);
    data.append('certificate', formData.certificate);

    return apiRequest('/auth/register/doctor', {
      method: 'POST',
      body: data,
      headers: {}, // Let browser set Content-Type for FormData
    });
  },

  // Register Hospital
  registerHospital: async (formData) => {
    const data = new FormData();
    data.append('hospitalName', formData.hospitalName);
    data.append('officialEmail', formData.officialEmail);
    data.append('licenseNumber', formData.licenseNumber);
    data.append('adminName', formData.adminName);
    data.append('adminEmail', formData.adminEmail);
    data.append('password', formData.password);
    data.append('license', formData.license);

    return apiRequest('/auth/register/hospital', {
      method: 'POST',
      body: data,
      headers: {}, // Let browser set Content-Type for FormData
    });
  },

  // Register Donor/Patient
  registerDonor: async (formData) => {
    return apiRequest('/auth/register/donor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });
  },

  // Login
  login: async (email, password) => {
    return apiRequest('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
  },

  // Get Profile
  getProfile: async () => {
    return apiRequest('/auth/profile', {
      method: 'GET',
    });
  },
};

/**
 * Doctor API calls
 */
export const doctorAPI = {
  // Get pending doctors (admin only)
  getPendingDoctors: async () => {
    return apiRequest('/doctor/pending', {
      method: 'GET',
    });
  },

  // Verify doctor (admin only)
  verifyDoctor: async (doctorId, status, rejectionReason = null) => {
    return apiRequest(`/doctor/verify/${doctorId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status, rejectionReason }),
    });
  },
};

/**
 * Hospital API calls
 */
export const hospitalAPI = {
  // Get pending hospitals (admin only)
  getPendingHospitals: async () => {
    return apiRequest('/hospital/pending', {
      method: 'GET',
    });
  },

  // Verify hospital (admin only)
  verifyHospital: async (hospitalId, status, rejectionReason = null) => {
    return apiRequest(`/hospital/verify/${hospitalId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status, rejectionReason }),
    });
  },
};

/**
 * Donor API calls
 */
export const donorAPI = {
  // Get all donors
  getAllDonors: async () => {
    return apiRequest('/donor/all', {
      method: 'GET',
    });
  },

  // Search donors
  searchDonors: async (filters) => {
    const queryParams = new URLSearchParams(filters).toString();
    return apiRequest(`/donor/search?${queryParams}`, {
      method: 'GET',
    });
  },
};

/**
 * Utility functions
 */
export const auth = {
  // Save token to localStorage
  setToken: (token) => {
    localStorage.setItem('token', token);
  },

  // Get token from localStorage
  getToken: () => {
    return localStorage.getItem('token');
  },

  // Remove token from localStorage
  removeToken: () => {
    localStorage.removeItem('token');
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },
};

export default {
  authAPI,
  doctorAPI,
  hospitalAPI,
  donorAPI,
  auth,
};
