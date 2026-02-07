const crypto = require('crypto');
const bcrypt = require('bcrypt');

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const hashOTP = async (otp) => {
  return await bcrypt.hash(otp, 10);
};

const validateOTP = async (otp, hash) => {
  return await bcrypt.compare(otp, hash);
};

const getOTPExpiry = () => {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 24);
  return expiry;
};

module.exports = {
  generateOTP,
  hashOTP,
  validateOTP,
  getOTPExpiry
};
