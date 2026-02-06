const express = require('express');
const router = express.Router();
const advisoryController = require('../controllers/clinicalAdvisoryController');
const auth = require('../middleware/auth');

router.get('/active', auth, advisoryController.getActiveAdvisories);
router.post('/transfusion', auth, advisoryController.getTransfusionAdvisory);
router.post('/action', auth, advisoryController.recordAdvisoryAction);
router.get('/trends', auth, advisoryController.getAdvisoryTrends);

module.exports = router;
