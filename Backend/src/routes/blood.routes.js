const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');
const bloodTraceController = require('../controllers/bloodTraceController');

/**
 * Blood Tracing Routes
 * 
 * Public: /blood/trace/:id                       - Anonymized QR trace
 * 
 * Donor Routes: /blood/my-donations              - View own donations
 * 
 * Admin Routes: All operational endpoints
 */

// ============================================================================
// PUBLIC ROUTES (No authentication required)
// ============================================================================

// QR Code Trace - Anyone can view (public transparency)
router.get('/trace/:unitId', bloodTraceController.traceBloodUnit);

// ============================================================================
// DONOR ROUTES (Authenticated PUBLIC_USER)
// ============================================================================

// Donor: View my blood unit donations
router.get('/my-donations', auth, checkRole(['PUBLIC_USER']), bloodTraceController.getDonorBloodUnits);

// ============================================================================
// ADMIN/HOSPITAL ROUTES (Authenticated ADMIN/HOSPITAL_ADMIN)
// ============================================================================

// Create blood unit (Collection Center/Blood Bank)
router.post('/create', auth, checkRole(['ADMIN', 'HOSPITAL_ADMIN']), bloodTraceController.createBloodUnit);

// Get blood unit details (Full details with history)
router.get('/unit/:id', auth, checkRole(['ADMIN', 'HOSPITAL_ADMIN']), bloodTraceController.getBloodUnitDetails);

// Get unit timeline/lifecycle events
router.get('/timeline/:unitId', auth, checkRole(['ADMIN', 'HOSPITAL_ADMIN']), bloodTraceController.getUnitTimeline);

// ============================================================================
// TRANSFER ROUTES
// ============================================================================

// Initiate transfer between facilities
router.post('/transfer/initiate', auth, checkRole(['ADMIN', 'HOSPITAL_ADMIN']), bloodTraceController.initiateTransfer);

// Complete transfer (Receive at destination)
router.post('/transfer/complete', auth, checkRole(['ADMIN', 'HOSPITAL_ADMIN']), bloodTraceController.completeTransfer);

// ============================================================================
// USAGE ROUTES
// ============================================================================

// Record transfusion/usage
router.post('/usage/record', auth, checkRole(['ADMIN', 'HOSPITAL_ADMIN']), bloodTraceController.recordUsage);

// ============================================================================
// MONITORING ROUTES
// ============================================================================

// Get monitoring status (Summary of alerts and metrics)
router.get('/monitoring/status', auth, checkRole(['ADMIN', 'HOSPITAL_ADMIN']), bloodTraceController.getMonitoringStatus);

// Run AI monitoring checks
router.post('/monitoring/run', auth, checkRole(['ADMIN']), bloodTraceController.runAIMonitoring);

module.exports = router;
