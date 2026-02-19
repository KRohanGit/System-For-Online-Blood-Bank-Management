import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/signin';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (email, password, role) => {
    const response = await apiClient.post('/auth/login', { email, password, role });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  },

  register: async (userData) => {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    window.location.href = '/signin';
  },

  getProfile: async () => {
    const response = await apiClient.get('/auth/profile');
    return response.data;
  },
};

export const userService = {
  getAllUsers: async () => {
    const response = await apiClient.get('/users');
    return response.data;
  },

  getUserById: async (id) => {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
  },

  updateUser: async (id, data) => {
    const response = await apiClient.put(`/users/${id}`, data);
    return response.data;
  },

  deleteUser: async (id) => {
    const response = await apiClient.delete(`/users/${id}`);
    return response.data;
  },
};

export const donorService = {
  getDonors: async (filters) => {
    const response = await apiClient.get('/donor', { params: filters });
    return response.data;
  },

  createDonor: async (donorData) => {
    const response = await apiClient.post('/donor', donorData);
    return response.data;
  },

  updateDonor: async (id, data) => {
    const response = await apiClient.put(`/donor/${id}`, data);
    return response.data;
  },
};

export const bloodInventoryService = {
  getInventory: async () => {
    const response = await apiClient.get('/blood-inventory');
    return response.data;
  },

  updateStock: async (bloodType, quantity) => {
    const response = await apiClient.put('/blood-inventory/update', {
      bloodType,
      quantity,
    });
    return response.data;
  },

  getAlerts: async () => {
    const response = await apiClient.get('/blood-inventory/alerts');
    return response.data;
  },
};

export default apiClient;
