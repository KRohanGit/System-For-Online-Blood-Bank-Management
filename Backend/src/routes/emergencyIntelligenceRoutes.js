const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');
const emergencyController = require('../controllers/emergencyIntelligenceController');

/**
 * @route   POST /api/emergency-intelligence/scenarios
 * @desc    Create new emergency scenario
 * @access  Super Admin, Hospital Admin
 */
router.post('/scenarios', 
  auth, 
  checkRole(['Super Admin', 'hospital_admin']), 
  emergencyController.createScenario
);

/**
 * @route   GET /api/emergency-intelligence/scenarios
 * @desc    Get all scenarios
 * @access  Super Admin, Hospital Admin, Doctor
 */
router.get('/scenarios', 
  auth, 
  checkRole(['Super Admin', 'hospital_admin', 'doctor']), 
  emergencyController.getAllScenarios
);

/**
 * @route   GET /api/emergency-intelligence/scenarios/:id
 * @desc    Get scenario by ID
 * @access  Super Admin, Hospital Admin, Doctor
 */
router.get('/scenarios/:id', 
  auth, 
  checkRole(['Super Admin', 'hospital_admin', 'doctor']), 
  emergencyController.getScenarioById
);

/**
 * @route   PUT /api/emergency-intelligence/scenarios/:id/rerun
 * @desc    Re-run simulation with modified inputs
 * @access  Super Admin, Hospital Admin
 */
router.put('/scenarios/:id/rerun', 
  auth, 
  checkRole(['Super Admin', 'hospital_admin']), 
  emergencyController.rerunSimulation
);

/**
 * @route   PUT /api/emergency-intelligence/scenarios/:scenarioId/recommendations/:recommendationIndex
 * @desc    Approve/reject a recommendation
 * @access  Super Admin, Hospital Admin
 */
router.put('/scenarios/:scenarioId/recommendations/:recommendationIndex', 
  auth, 
  checkRole(['Super Admin', 'hospital_admin']), 
  emergencyController.updateRecommendation
);

/**
 * @route   DELETE /api/emergency-intelligence/scenarios/:id
 * @desc    Delete scenario
 * @access  Super Admin only
 */
router.delete('/scenarios/:id', 
  auth, 
  checkRole('Super Admin'), 
  emergencyController.deleteScenario
);

module.exports = router;
