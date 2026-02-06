const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

const hashPassword = async (plainPassword) => {
  try {
    if (!plainPassword) {
      throw new Error('Password is required for hashing');
    }

    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);
    
    return hashedPassword;
  } catch (error) {
    console.error('❌ Bcrypt Hashing Error:', error.message);
    throw new Error('Failed to hash password');
  }
};

const comparePassword = async (plainPassword, hashedPassword) => {
  try {
    if (!plainPassword || !hashedPassword) {
      throw new Error('Both plaintext and hashed passwords are required');
    }

    const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
    
    return isMatch;
  } catch (error) {
    console.error('❌ Bcrypt Comparison Error:', error.message);
    throw new Error('Failed to compare passwords');
  }
};

const validatePasswordStrength = (password) => {
  if (!password) {
    return { valid: false, message: 'Password is required' };
  }

  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }

  if (password.length > 128) {
    return { valid: false, message: 'Password must not exceed 128 characters' };
  }

  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }

  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }

  // Check for at least one number
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }

  return { valid: true, message: 'Password meets strength requirements' };
};

module.exports = {
  hashPassword,
  comparePassword,
  validatePasswordStrength,
  SALT_ROUNDS
};
