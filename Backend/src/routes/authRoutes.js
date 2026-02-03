const express = require('express');
const router = express.Router();
const { upload, handleMulterError } = require('../middleware/upload');
const {
  registerDoctor,
  registerHospital,
  registerDonor,
  login,
  getProfile
} = require('../controllers/authController');
const auth = require('../middleware/auth');

/**
 * @route   POST /api/auth/register/doctor
 * @desc    Register a new doctor
 * @access  Public
 */
router.post(
  '/register/doctor',
  upload.single('certificate'),
  handleMulterError,
  registerDoctor
);

/**
 * @route   POST /api/auth/register/hospital
 * @desc    Register a new hospital/admin
 * @access  Public
 */
router.post(
  '/register/hospital',
  upload.single('license'),
  handleMulterError,
  registerHospital
);

/**
 * @route   POST /api/auth/register/donor
 * @desc    Register a new donor/patient
 * @access  Public
 */
router.post('/register/donor', registerDonor);

/**
 * @route   POST /api/auth/login
 * @desc    Login for all roles
 * @access  Public
 */
router.post('/login', login);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', auth, getProfile);

module.exports = router;
