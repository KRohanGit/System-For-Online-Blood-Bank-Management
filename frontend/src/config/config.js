const config = {
  API_BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  API_URL: process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api` : 'http://localhost:5000/api',
  FRONTEND_URL: process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3000',
  NODE_ENV: process.env.NODE_ENV || 'development',
};

export default config;
