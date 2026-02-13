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

// Returns a Date object 'minutes' minutes from now. Default: 30 minutes.
const getOTPExpiry = (minutes = 30) => {
  const expiry = new Date();
  expiry.setTime(expiry.getTime() + minutes * 60 * 1000);
  return expiry;
};

module.exports = {
  generateOTP,
  hashOTP,
  validateOTP,
  getOTPExpiry
};
