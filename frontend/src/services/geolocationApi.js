/**
 * Geolocation API Service
 * 
 * Purpose: Frontend service for geolocation intelligence features
 */

import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Get nearby hospitals
 */
export const getNearbyHospitals = async (latitude, longitude, radius = 10, emergencyOnly = false) => {
  try {
    const response = await axios.get(`${BASE_URL}/geolocation/nearby-hospitals`, {
      params: { latitude, longitude, radius, emergencyOnly }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching nearby hospitals:', error);
    throw error;
  }
};

/**
 * Get nearby blood camps
 */
export const getNearbyCamps = async (latitude, longitude, radius = 20, upcomingOnly = true) => {
  try {
    const response = await axios.get(`${BASE_URL}/geolocation/nearby-camps`, {
      params: { latitude, longitude, radius, upcomingOnly }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching nearby camps:', error);
    throw error;
  }
};

/**
 * Get geolocation analytics
 */
export const getGeoAnalytics = async (latitude, longitude, radius = 50) => {
  try {
    const response = await axios.get(`${BASE_URL}/geolocation/analytics`, {
      params: { latitude, longitude, radius }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching geo analytics:', error);
    throw error;
  }
};

/**
 * Get map data for visualization
 */
export const getMapData = async (latitude, longitude, radius = 30) => {
  try {
    const response = await axios.get(`${BASE_URL}/geolocation/map-data`, {
      params: { latitude, longitude, radius }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching map data:', error);
    throw error;
  }
};

/**
 * Get user's current location
 */
export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        let errorMessage = 'Unable to retrieve location';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable location access.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
          default:
            errorMessage = 'An unknown error occurred';
        }
        
        reject(new Error(errorMessage));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Format distance for display
 */
export const formatDistance = (distance) => {
  if (distance < 1) {
    return `${Math.round(distance * 1000)} m`;
  }
  return `${distance.toFixed(1)} km`;
};

/**
 * Default test locations for fallback
 */
export const DEFAULT_LOCATIONS = {
  visakhapatnam: { latitude: 17.7231, longitude: 83.3012, name: 'Visakhapatnam' },
  hyderabad: { latitude: 17.4065, longitude: 78.4772, name: 'Hyderabad' },
  bangalore: { latitude: 12.9716, longitude: 77.5946, name: 'Bangalore' },
  mumbai: { latitude: 19.0760, longitude: 72.8777, name: 'Mumbai' },
  delhi: { latitude: 28.6139, longitude: 77.2090, name: 'New Delhi' }
};

export default {
  getNearbyHospitals,
  getNearbyCamps,
  getGeoAnalytics,
  getMapData,
  getCurrentLocation,
  calculateDistance,
  formatDistance,
  DEFAULT_LOCATIONS
};
