const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');
const graphIntelligenceService = require('../services/graph-intelligence');

router.use(protect);
router.use(checkRole(['HOSPITAL_ADMIN', 'SUPER_ADMIN', 'hospital_admin', 'super_admin']));

function parseForce(queryValue) {
  return String(queryValue || 'false').toLowerCase() === 'true';
}

router.get('/centrality', async (req, res) => {
  try {
    const force = parseForce(req.query.force);
    const result = await graphIntelligenceService.getCentrality(force);
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/bottlenecks', async (req, res) => {
  try {
    const force = parseForce(req.query.force);
    const result = await graphIntelligenceService.getBottlenecks(force);
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/stability', async (req, res) => {
  try {
    const force = parseForce(req.query.force);
    const result = await graphIntelligenceService.getStability(force);
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
