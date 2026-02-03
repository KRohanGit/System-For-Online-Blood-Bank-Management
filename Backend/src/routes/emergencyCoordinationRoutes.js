/**
 * Emergency Coordination Routes
 * 
 * Endpoints for emergency blood request management
 */

const express = require('express');
const router = express.Router();
const emergencyCoordinationController = require('../controllers/emergencyCoordinationController');
const { protect } = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');

// All routes require authentication
router.use(protect);

// Emergency Request Management
router.post(
  '/request',
  checkRole(['HOSPITAL_ADMIN']),
  emergencyCoordinationController.createEmergencyRequest
);

router.get(
  '/requests',
  checkRole(['HOSPITAL_ADMIN', 'SUPER_ADMIN']),
  emergencyCoordinationController.getEmergencyRequests
);

router.get(
  '/request/:requestId',
  checkRole(['HOSPITAL_ADMIN', 'SUPER_ADMIN']),
  emergencyCoordinationController.getRequestDetails
);

router.get(
  '/request/:requestId/matches',
  checkRole(['HOSPITAL_ADMIN']),
  emergencyCoordinationController.getMatchingHospitals
);

// Request Response Actions
router.post(
  '/request/:requestId/accept',
  checkRole(['HOSPITAL_ADMIN']),
  emergencyCoordinationController.acceptEmergencyRequest
);

router.post(
  '/request/:requestId/decline',
  checkRole(['HOSPITAL_ADMIN']),
  emergencyCoordinationController.declineEmergencyRequest
);

// Logistics & Transfer Management
router.post(
  '/request/:requestId/dispatch',
  checkRole(['HOSPITAL_ADMIN']),
  emergencyCoordinationController.dispatchBloodTransfer
);

router.post(
  '/transfer/:transferId/location',
  emergencyCoordinationController.updateTransferLocation
);

router.post(
  '/transfer/:transferId/temperature',
  emergencyCoordinationController.logTemperature
);

router.post(
  '/transfer/:transferId/complete',
  checkRole(['HOSPITAL_ADMIN']),
  emergencyCoordinationController.completeDelivery
);

module.exports = router;
