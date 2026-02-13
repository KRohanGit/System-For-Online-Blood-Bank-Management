const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');
const {
  getDonorDashboard,
  getDonationHistory,
  getCertificates
} = require('../controllers/donor.controller');

router.get('/dashboard', auth, checkRole(['donor']), getDonorDashboard);
router.get('/history', auth, checkRole(['donor']), getDonationHistory);
router.get('/certificates', auth, checkRole(['donor']), getCertificates);

module.exports = router;
