const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');
const optimizationAssistant = require('../services/optimization-assistant');

router.use(protect);
router.use(checkRole(['HOSPITAL_ADMIN', 'SUPER_ADMIN', 'hospital_admin', 'super_admin']));

router.post('/transfers', async (req, res) => {
  try {
    const result = await optimizationAssistant.runOptimization(req.body || {}, req.user);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to optimize transfer plan.'
    });
  }
});

router.get('/history', async (req, res) => {
  try {
    const result = await optimizationAssistant.getHistory(req.query.limit);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch optimization history.'
    });
  }
});

router.get('/compare', async (req, res) => {
  try {
    const result = await optimizationAssistant.getCompare(req.query.runId || null);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch optimization comparison.'
    });
  }
});

module.exports = router;
