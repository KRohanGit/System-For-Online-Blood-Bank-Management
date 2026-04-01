const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');
const rlAllocationAgentService = require('../services/rl-agent');

router.use(protect);
router.use(checkRole(['HOSPITAL_ADMIN', 'SUPER_ADMIN', 'hospital_admin', 'super_admin']));

router.post('/compute', async (req, res) => {
  try {
    const trigger = req.body?.trigger || 'manual_api';
    const result = await rlAllocationAgentService.compute(trigger);
    return res.json({
      success: true,
      message: 'RL allocation computed',
      ...result
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/recommendations', async (req, res) => {
  try {
    const force = String(req.query.force || 'false').toLowerCase() === 'true';
    if (force) {
      await rlAllocationAgentService.compute('forced_refresh');
    }
    const result = await rlAllocationAgentService.getRecommendations();
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/state', async (req, res) => {
  try {
    const result = await rlAllocationAgentService.getState();
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
