const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');
const emergencyCoordinationController = require('../controllers/emergencyCoordinationController');

router.use(protect);

router.get(
  '/delivery-estimate',
  checkRole(['HOSPITAL_ADMIN', 'SUPER_ADMIN']),
  emergencyCoordinationController.getDeliveryEstimate
);

module.exports = router;
