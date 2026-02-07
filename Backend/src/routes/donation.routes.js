const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');
const {
  createDonation,
  completeDonation,
  getDonations,
  getDonorsByHospital
} = require('../controllers/donation.controller');

router.post('/create', auth, checkRole(['hospital_admin']), createDonation);
router.put('/complete/:donationId', auth, checkRole(['doctor']), completeDonation);
router.get('/list', auth, checkRole(['hospital_admin']), getDonations);
router.get('/donors', auth, checkRole(['hospital_admin']), getDonorsByHospital);

module.exports = router;
