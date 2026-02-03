const jwt = require('jsonwebtoken');

/**
 * Generate JWT token for user
 * @param {Object} payload - Data to encode in token (userId, role)
 * @param {String} expiresIn - Token expiration time (default: 1d)
 * @returns {String} JWT token
 */
const generateToken = (payload, expiresIn = '1d') => {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn }
  );
};

/**
 * Verify JWT token
 * @param {String} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = {
  generateToken,
  verifyToken
};
