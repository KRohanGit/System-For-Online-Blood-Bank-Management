const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const TOKEN_EXPIRY = '1d';
const REFRESH_TOKEN_EXPIRY = '7d';

const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
};

const generateRefreshToken = (payload) => {
  return jwt.sign(
    { ...payload, type: 'refresh' },
    process.env.JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
};

const generateTokenPair = (userId, role) => {
  const accessToken = generateAccessToken({ userId, role });
  const refreshToken = generateRefreshToken({ userId, role });
  return { accessToken, refreshToken };
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

const rotateToken = (oldToken) => {
  try {
    const decoded = jwt.verify(oldToken, process.env.JWT_SECRET, { ignoreExpiration: true });
    if (decoded.type !== 'refresh') {
      throw new Error('Not a refresh token');
    }
    return generateTokenPair(decoded.userId, decoded.role);
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

const generateSecureOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    otp += digits[bytes[i] % 10];
  }
  return otp;
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyToken,
  rotateToken,
  generateSecureOTP,
  TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY
};
