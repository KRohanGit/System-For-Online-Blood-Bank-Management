const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');
const attachHospitalProfile = require('../middleware/attachHospitalProfile');
const bloodInventoryController = require('../controllers/bloodInventory');

// All routes require authentication
router.use(authenticate);

// All routes require Hospital Admin role
router.use(checkRole(['hospital_admin']));

// Attach hospital profile ID to request
router.use(attachHospitalProfile);

// CRUD Operations
router.get('/', bloodInventoryController.getAllUnits);
router.post('/', bloodInventoryController.addUnit);
router.put('/:unitId', bloodInventoryController.updateUnit);
router.delete('/:unitId', bloodInventoryController.deleteUnit);

// Stock Management
router.get('/stock-overview', bloodInventoryController.getStockOverview);
router.get('/storage-capacity', bloodInventoryController.getStorageCapacity);
router.get('/nearby-camps', bloodInventoryController.getNearbyCampsInventory);
router.get('/expiring', bloodInventoryController.getExpiringUnits);
router.get('/fifo-suggestions', bloodInventoryController.getFIFOSuggestions);

router.post('/request-from-camp', bloodInventoryController.requestBloodFromCamp);

// Unit Operations
router.post('/:unitId/reserve', bloodInventoryController.reserveUnit);
router.post('/:unitId/issue', bloodInventoryController.issueUnit);
router.get('/:unitId/lifecycle', bloodInventoryController.getUnitLifecycle);

// Emergency Operations
router.post('/emergency-release', bloodInventoryController.emergencyRelease);

module.exports = router;
