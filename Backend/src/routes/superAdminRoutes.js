const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');
const { getSystemEncryptionStatus, testEncryptionSystem } = require('../controllers/encryptionStatusController');
const auth = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');

// All routes require authentication and super_admin role
router.use(auth);
router.use(checkRole(['super_admin']));

// Dashboard statistics
router.get('/stats', superAdminController.getDashboardStats);

// Recent activity
router.get('/activity', superAdminController.getRecentActivity);

// User management
router.get('/users/pending', superAdminController.getPendingUsers);
router.get('/users', superAdminController.getAllUsers);

// Approval actions
router.put('/users/:userId/approve', superAdminController.approveUser);
router.delete('/users/:userId/reject', superAdminController.rejectUser);

// PUBLIC_USER approval actions
router.put('/public-users/:userId/approve', superAdminController.approvePublicUser);
router.put('/public-users/:userId/reject', superAdminController.rejectPublicUser);

// Encryption system status
router.get('/encryption-status', getSystemEncryptionStatus);
router.post('/test-encryption', testEncryptionSystem);

module.exports = router;
