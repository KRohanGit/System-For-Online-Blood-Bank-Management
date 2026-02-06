const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditTrailController');
const auth = require('../middleware/auth');

router.get('/logs', auth, auditController.getAuditLogs);
router.get('/logs/:logId', auth, auditController.getAuditLogDetails);
router.get('/analytics/action-distribution', auth, auditController.getActionDistribution);
router.get('/analytics/override-frequency', auth, auditController.getOverrideFrequency);
router.get('/analytics/blood-usage', auth, auditController.getBloodUsageAnalytics);
router.get('/analytics/emergency-patterns', auth, auditController.getEmergencyTagPatterns);

module.exports = router;
