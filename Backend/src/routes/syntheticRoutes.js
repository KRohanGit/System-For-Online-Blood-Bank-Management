const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');
const syntheticService = require('../services/synthetic-data');

router.use(protect);
router.use(checkRole(['HOSPITAL_ADMIN', 'SUPER_ADMIN', 'hospital_admin', 'super_admin']));

router.post('/generate', async (req, res) => {
  try {
    const result = await syntheticService.generateSyntheticDonors(req.body || {}, req.user);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate synthetic donors.'
    });
  }
});

router.get('/preview', async (req, res) => {
  try {
    const result = await syntheticService.getSyntheticPreview({
      generationId: req.query.generationId,
      limit: req.query.limit
    });
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch synthetic preview.'
    });
  }
});

router.get('/history', async (req, res) => {
  try {
    const result = await syntheticService.getSyntheticHistory({ limit: req.query.limit });
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch synthetic history.'
    });
  }
});

module.exports = router;
