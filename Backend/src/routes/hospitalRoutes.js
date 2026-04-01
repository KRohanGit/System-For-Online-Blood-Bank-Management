const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');
const hospitalDecisionAssistant = require('../services/hospital-decision-assistant');
const {
  getHospitalProfile,
  updateHospitalProfile,
  getVerificationStatus,
  createDonorAccount,
  resendDonorCredentials,
  updateDonorStatus,
  deleteDonorAccount
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
router.get('/profile', auth, checkRole('hospital_admin'), getHospitalProfile);

/**
 * @route   PUT /api/hospital/profile
 * @desc    Update hospital's profile
 * @access  Private (Admin only)
 */
router.put('/profile', auth, checkRole('hospital_admin'), updateHospitalProfile);

/**
 * @route   GET /api/hospital/verification-status
 * @desc    Get verification status
 * @access  Private (Admin only)
 */
router.get('/verification-status', auth, checkRole('hospital_admin'), getVerificationStatus);

/**
 * @route   POST /api/hospital/donor
 * @desc    Create a donor account
 * @access  Private (Admin only)
 */
router.post('/donor', auth, checkRole('hospital_admin'), createDonorAccount);

/**
 * @route   POST /api/hospital/donor/:donorId/resend-credentials
 * @desc    Resend donor credentials email with new OTP
 * @access  Private (Admin only)
 */
router.post('/donor/:donorId/resend-credentials', auth, checkRole('hospital_admin'), resendDonorCredentials);

/**
 * @route   PUT /api/hospital/donor/:donorId/status
 * @desc    Update donor status (activate/deactivate)
 * @access  Private (Admin only)
 */
router.put('/donor/:donorId/status', auth, checkRole('hospital_admin'), updateDonorStatus);

/**
 * @route   DELETE /api/hospital/donor/:donorId
 * @desc    Delete donor account for this hospital
 * @access  Private (Admin only)
 */
router.delete('/donor/:donorId', auth, checkRole('hospital_admin'), deleteDonorAccount);

router.post('/certificates', auth, checkRole('hospital_admin'), certificateController.createCertificate);

router.post('/civic-alert', auth, checkRole('hospital_admin'), createCivicAlert);
router.post('/emergency-event', auth, checkRole('hospital_admin'), createEmergencyEvent);
router.get('/my-alerts', auth, checkRole('hospital_admin'), getMyAlerts);
router.get('/my-events', auth, checkRole('hospital_admin'), getMyEvents);
router.put('/alert/:alertId/status', auth, checkRole('hospital_admin'), updateAlertStatus);
router.put('/event/:eventId/status', auth, checkRole('hospital_admin'), updateEventStatus);

router.post('/auto-contact', auth, checkRole(['hospital_admin', 'super_admin']), async (req, res) => {
  try {
    const result = await hospitalDecisionAssistant.autoContactHospital(req.body || {}, req.user);
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to auto-contact top hospital.'
    });
  }
});

router.get('/list', async (req, res) => {
  try {
    const HospitalProfile = require('../models/HospitalProfile');
    // Use verificationStatus field (seed scripts set verificationStatus: 'approved')
    const hospitals = await HospitalProfile.find({ verificationStatus: 'approved' }).lean();
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
    // Query by verificationStatus to match schema
    const hospitals = await HospitalProfile.find({
      verificationStatus: 'approved',
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
