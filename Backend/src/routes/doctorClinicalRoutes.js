const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');
const doctorClinicalController = require('../controllers/doctorClinicalController');

// All routes require authentication and doctor role
router.use(auth);
router.use(checkRole(['doctor']));

/**
 * Doctor Dashboard Overview
 */
router.get('/overview', doctorClinicalController.getDoctorOverview);

/**
 * Blood Unit Medical Validation
 */
router.get('/blood-units/pending', doctorClinicalController.getBloodUnitsForValidation);
router.post('/blood-units/:unitId/validate', doctorClinicalController.validateBloodUnit);

/**
 * Blood Request Medical Review
 */
router.get('/blood-requests', doctorClinicalController.getBloodRequestsForReview);
router.post('/blood-requests/:requestId/review', doctorClinicalController.reviewBloodRequestUrgency);

/**
 * Emergency Consult System
 */
router.get('/consults', doctorClinicalController.getEmergencyConsults);
router.post('/consults/:consultId/respond', doctorClinicalController.respondToConsult);

/**
 * Doctor Availability Management
 */
router.post('/availability', doctorClinicalController.updateAvailability);

/**
 * Blood Camp Oversight
 */
router.get('/camps', doctorClinicalController.getCampsForOversight);
router.post('/camps/:campId/oversight', doctorClinicalController.submitCampOversight);

/**
 * Clinical Advisory System
 */
router.post('/advisories', doctorClinicalController.submitClinicalAdvisory);
router.get('/advisories', doctorClinicalController.getClinicalAdvisories);

/**
 * Audit Trail
 */
router.get('/audit-trail', doctorClinicalController.getAuditTrail);

module.exports = router;
