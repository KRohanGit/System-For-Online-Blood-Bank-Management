const apiBaseUrl = process.env.REACT_APP_API_URL || '/api';
const frontendUrl = process.env.REACT_APP_FRONTEND_URL || (typeof window !== 'undefined' ? window.location.origin : '');

const config = {
  API_BASE_URL: apiBaseUrl,
  API_URL: apiBaseUrl,
  FRONTEND_URL: frontendUrl,
  NODE_ENV: process.env.NODE_ENV || 'development',
};

export default config;
