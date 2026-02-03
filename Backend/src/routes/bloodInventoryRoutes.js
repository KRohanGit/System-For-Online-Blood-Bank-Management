const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');
const bloodInventoryController = require('../controllers/bloodInventory');

// All routes require authentication
router.use(authenticate);

// All routes require Hospital Admin role
router.use(checkRole(['Hospital Admin']));

// CRUD Operations
router.get('/', bloodInventoryController.getAllUnits);
router.post('/', bloodInventoryController.addUnit);
router.put('/:unitId', bloodInventoryController.updateUnit);
router.delete('/:unitId', bloodInventoryController.deleteUnit);

// Stock Management
router.get('/stock-overview', bloodInventoryController.getStockOverview);
router.get('/expiring', bloodInventoryController.getExpiringUnits);
router.get('/fifo-suggestions', bloodInventoryController.getFIFOSuggestions);

// Unit Operations
router.post('/:unitId/reserve', bloodInventoryController.reserveUnit);
router.post('/:unitId/issue', bloodInventoryController.issueUnit);
router.get('/:unitId/lifecycle', bloodInventoryController.getUnitLifecycle);

// Emergency Operations
router.post('/emergency-release', bloodInventoryController.emergencyRelease);

module.exports = router;
