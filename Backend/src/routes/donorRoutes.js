const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');
const {
  getDonorProfile,
  updateDonorPassword
} = require('../controllers/donorController');

/**
 * @route   GET /api/donor/profile
 * @desc    Get donor's profile
 * @access  Private (Donor only)
 */
router.get('/profile', auth, checkRole('donor'), getDonorProfile);

/**
 * @route   PUT /api/donor/password
 * @desc    Update donor's password
 * @access  Private (Donor only)
 */
router.put('/password', auth, checkRole('donor'), updateDonorPassword);

module.exports = router;
