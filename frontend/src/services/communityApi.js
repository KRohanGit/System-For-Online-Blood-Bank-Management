import axios from 'axios';
import config from '../config/config';

const API_URL = config.API_URL;

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const communityAPI = {
  getAllPosts: (params = {}) =>
    axios.get(`${API_URL}/community`, { params }),
  
  getNearbyPosts: (longitude, latitude, radius = 50) =>
    axios.get(`${API_URL}/community/nearby`, {
      params: { longitude, latitude, radius }
    }),
  
  getPostById: (id) =>
    axios.get(`${API_URL}/community/${id}`),
  
  createPost: (data) =>
    axios.post(`${API_URL}/community`, data, { headers: getAuthHeader() }),
  
  addComment: (postId, content) =>
    axios.post(`${API_URL}/community/${postId}/comment`, { content }, { headers: getAuthHeader() }),
  
  likePost: (postId) =>
    axios.post(`${API_URL}/community/${postId}/like`, {}, { headers: getAuthHeader() }),
  
  updatePostStatus: (postId, status) =>
    axios.patch(`${API_URL}/community/${postId}/status`, { status }, { headers: getAuthHeader() }),
  
  deletePost: (postId) =>
    axios.delete(`${API_URL}/community/${postId}`, { headers: getAuthHeader() })
};

export const appointmentAPI = {
  createAppointment: (data) =>
    axios.post(`${API_URL}/appointments`, data, { headers: getAuthHeader() }),
  
  getMyAppointments: (status = '') =>
    axios.get(`${API_URL}/appointments/my-appointments`, {
      params: { status },
      headers: getAuthHeader()
    }),
  
  cancelAppointment: (id, reason) =>
    axios.patch(`${API_URL}/appointments/${id}/cancel`, { reason }, { headers: getAuthHeader() })
};

export const hospitalAPI = {
  getAllHospitals: (params = {}) =>
    axios.get(`${API_URL}/hospital/list`, { params }),
  
  getNearbyHospitals: (longitude, latitude, radius = 50) =>
    axios.get(`${API_URL}/hospital/nearby`, {
      params: { longitude, latitude, radius }
    }),
  
  getHospitalById: (id) =>
    axios.get(`${API_URL}/hospital/${id}`)
  ,
  getCampsByHospital: (hospitalId) =>
    axios.get(`${API_URL}/blood-camps/by-hospital/${hospitalId}`)
};

export const geolocationHelper = {
  getCurrentLocation: () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          reject(new Error('Location access denied'));
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    });
  }
};
