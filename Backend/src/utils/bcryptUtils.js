/**
 * BCRYPT UTILITY MODULE
 * 
 * PURPOSE: Password Security Layer (Layer 1)
 * 
 * WHY BCRYPT?
 * - Bcrypt is specifically designed for password hashing
 * - Includes built-in salt generation to prevent rainbow table attacks
 * - Adaptive: salt rounds can be increased as computing power grows
 * - Slow by design: protects against brute-force attacks
 * 
 * USAGE:
 * - Hash passwords during user registration (all roles: doctor, hospital, donor, public user)
 * - Compare passwords during login authentication
 * - Never store or log plaintext passwords
 * 
 * MONGODB STORAGE:
 * - Hashed passwords will be stored in User and PublicUser collections
 * - Format: $2a$12$... (bcrypt hash with salt rounds = 12)
 */

const bcrypt = require('bcryptjs');

// Salt rounds configuration (12 = highly secure, balances security and performance)
const SALT_ROUNDS = 12;

/**
 * Hash a plaintext password using bcrypt
 * @param {string} plainPassword - The plaintext password to hash
 * @returns {Promise<string>} - The hashed password
 * @throws {Error} - If hashing fails
 */
const hashPassword = async (plainPassword) => {
  try {
    if (!plainPassword) {
      throw new Error('Password is required for hashing');
    }

    // Generate salt with 12 rounds (recommended for high security)
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    
    // Hash the password with the generated salt
    const hashedPassword = await bcrypt.hash(plainPassword, salt);
    
    return hashedPassword;
  } catch (error) {
    console.error('❌ Bcrypt Hashing Error:', error.message);
    throw new Error('Failed to hash password');
  }
};

/**
 * Compare a plaintext password with a hashed password
 * @param {string} plainPassword - The plaintext password to verify
 * @param {string} hashedPassword - The stored hashed password
 * @returns {Promise<boolean>} - True if passwords match, false otherwise
 * @throws {Error} - If comparison fails
 */
const comparePassword = async (plainPassword, hashedPassword) => {
  try {
    if (!plainPassword || !hashedPassword) {
      throw new Error('Both plaintext and hashed passwords are required');
    }

    // Compare plaintext password with hashed password
    const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
    
    return isMatch;
  } catch (error) {
    console.error('❌ Bcrypt Comparison Error:', error.message);
    throw new Error('Failed to compare passwords');
  }
};

/**
 * Validate password strength requirements
 * @param {string} password - The password to validate
 * @returns {Object} - { valid: boolean, message: string }
 */
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
