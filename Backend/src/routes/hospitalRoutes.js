const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');
const {
  getHospitalProfile,
  updateHospitalProfile,
  getVerificationStatus,
  createDonorAccount
} = require('../controllers/hospitalController');
const certificateController = require('../controllers/certificateController');
const {
  createCivicAlert,
  createEmergencyEvent,
  getMyAlerts,
  getMyEvents,
  updateAlertStatus,
  updateEventStatus
} = require('../controllers/adminEmergencyController');

/**
 * @route   GET /api/hospital/profile
 * @desc    Get hospital's profile
 * @access  Private (Admin only)
 */
router.get('/profile', auth, checkRole('admin'), getHospitalProfile);

/**
 * @route   PUT /api/hospital/profile
 * @desc    Update hospital's profile
 * @access  Private (Admin only)
 */
router.put('/profile', auth, checkRole('admin'), updateHospitalProfile);

/**
 * @route   GET /api/hospital/verification-status
 * @desc    Get verification status
 * @access  Private (Admin only)
 */
router.get('/verification-status', auth, checkRole('admin'), getVerificationStatus);

/**
 * @route   POST /api/hospital/donor
 * @desc    Create a donor account
 * @access  Private (Admin only)
 */
router.post('/donor', auth, checkRole('admin'), createDonorAccount);

router.post('/certificates', auth, checkRole('HOSPITAL_ADMIN'), certificateController.createCertificate);

router.post('/civic-alert', auth, checkRole('HOSPITAL_ADMIN'), createCivicAlert);
router.post('/emergency-event', auth, checkRole('HOSPITAL_ADMIN'), createEmergencyEvent);
router.get('/my-alerts', auth, checkRole('HOSPITAL_ADMIN'), getMyAlerts);
router.get('/my-events', auth, checkRole('HOSPITAL_ADMIN'), getMyEvents);
router.put('/alert/:alertId/status', auth, checkRole('HOSPITAL_ADMIN'), updateAlertStatus);
router.put('/event/:eventId/status', auth, checkRole('HOSPITAL_ADMIN'), updateEventStatus);

router.get('/list', async (req, res) => {
  try {
    const HospitalProfile = require('../models/HospitalProfile');
    const hospitals = await HospitalProfile.find({ approved: true, isVerified: true }).lean();
    res.json({ success: true, hospitals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/nearby', async (req, res) => {
  try {
    const { longitude, latitude, radius = 50 } = req.query;
    if (!longitude || !latitude) {
      return res.status(400).json({ success: false, message: 'Location coordinates required' });
    }
    const HospitalProfile = require('../models/HospitalProfile');
    const hospitals = await HospitalProfile.find({
      approved: true,
      isVerified: true,
      'location.coordinates': {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] },
          $maxDistance: parseFloat(radius) * 1000
        }
      }
    }).lean();
    res.json({ success: true, hospitals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const HospitalProfile = require('../models/HospitalProfile');
    const hospital = await HospitalProfile.findById(req.params.id).lean();
    if (!hospital) {
      return res.status(404).json({ success: false, message: 'Hospital not found' });
    }
    res.json({ success: true, hospital });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
