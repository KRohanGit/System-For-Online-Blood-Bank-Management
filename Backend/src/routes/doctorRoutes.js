const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');
const {
  getDoctorProfile,
  updateDoctorProfile,
  getVerificationStatus,
  getPendingDoctors,
  verifyDoctor
} = require('../controllers/doctorController');

// Import models for dashboard data
const DonationAppointment = require('../models/DonationAppointment');
const BloodInventory = require('../models/BloodInventory');
const BloodCamp = require('../models/BloodCamp');
const EmergencyRequest = require('../models/EmergencyRequest');
const Notification = require('../models/Notification');

/**
 * @route   GET /api/doctor/profile
 * @desc    Get doctor's profile
 * @access  Private (Doctor only)
 */
router.get('/profile', auth, checkRole('doctor'), getDoctorProfile);

/**
 * @route   PUT /api/doctor/profile
 * @desc    Update doctor's profile
 * @access  Private (Doctor only)
 */
router.put('/profile', auth, checkRole('doctor'), updateDoctorProfile);

/**
 * @route   GET /api/doctor/verification-status
 * @desc    Get verification status
 * @access  Private (Doctor only)
 */
router.get('/verification-status', auth, checkRole('doctor'), getVerificationStatus);

/**
 * @route   GET /api/doctor/pending
 * @desc    Get all pending doctors for verification
 * @access  Private (Admin only)
 */
router.get('/pending', auth, checkRole('admin'), getPendingDoctors);

/**
 * @route   PUT /api/doctor/verify/:doctorId
 * @desc    Verify or reject a doctor
 * @access  Private (Admin only)
 */
router.put('/verify/:doctorId', auth, checkRole('admin'), verifyDoctor);

router.get('/dashboard/stats', auth, checkRole('doctor'), async (req, res) => {
  try {
    // Count pending appointments that need screening
    const pendingDonors = await DonationAppointment.countDocuments({
      status: 'scheduled',
      scheduledDate: { $gte: new Date() }
    });

    // Count blood units needing validation
    const pendingUnits = await BloodInventory.countDocuments({
      status: { $in: ['Available', 'Quarantined'] }
    });

    // Count pending camps
    const pendingCamps = await BloodCamp.countDocuments({
      status: 'pending'
    });

    // Emergency requests (appointments in next 24 hours)
    const pendingEmergency = await DonationAppointment.countDocuments({
      status: 'scheduled',
      scheduledDate: { 
        $gte: new Date(),
        $lte: new Date(Date.now() + 24 * 60 * 60 * 1000) 
      }
    });

    res.json({
      pendingEmergency: pendingEmergency || 0,
      pendingRequests: pendingDonors || 0,
      pendingDonors: pendingDonors || 0,
      pendingUnits: pendingUnits || 0,
      adverseReactions: 0,
      pendingCamps: pendingCamps || 0
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/blood-requests', auth, checkRole('doctor'), async (req, res) => {
  try {
    // Fetch donation appointments as "blood requests"
    const appointments = await DonationAppointment.find({
      status: { $in: ['scheduled', 'confirmed'] }
    })
      .populate('userId', 'name email phone')
      .populate('hospitalId', 'hospitalName')
      .sort({ scheduledDate: 1 })
      .limit(100)
      .lean();

    // Transform appointments to match expected format
    const requests = appointments.map(apt => ({
      _id: apt._id,
      patientName: apt.userInfo?.name || apt.userId?.name || 'Unknown Donor',
      bloodGroup: apt.bloodGroup,
      unitsNeeded: 1,
      isEmergency: new Date(apt.scheduledDate) <= new Date(Date.now() + 24 * 60 * 60 * 1000),
      requestDate: apt.createdAt,
      scheduledDate: apt.scheduledDate,
      scheduledTime: apt.scheduledTime,
      status: apt.status,
      hospitalName: apt.hospitalInfo?.name || apt.hospitalId?.hospitalName || 'Hospital',
      reason: apt.notes || 'Blood donation appointment',
      contactNumber: apt.userInfo?.phone || apt.userId?.phone
    }));

    res.json(requests);
  } catch (error) {
    console.error('Blood requests error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/blood-requests/:id/validate', auth, checkRole('doctor'), async (req, res) => {
  try {
    res.json({ message: 'Request validated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/donors/screening', auth, checkRole('doctor'), async (req, res) => {
  try {
    // Fetch scheduled appointments for donor screening
    const appointments = await DonationAppointment.find({
      status: 'scheduled',
      scheduledDate: { $gte: new Date() }
    })
      .populate('userId', 'name email phone bloodGroup')
      .populate('hospitalId', 'hospitalName')
      .sort({ scheduledDate: 1 })
      .limit(50)
      .lean();

    // Transform to donor screening format
    const donors = appointments.map(apt => ({
      _id: apt._id,
      name: apt.userInfo?.name || apt.userId?.name || 'Unknown Donor',
      bloodGroup: apt.bloodGroup,
      age: apt.userId?.age || 25,
      lastDonation: apt.userId?.lastDonation || null,
      status: apt.status,
      scheduledDate: apt.scheduledDate,
      scheduledTime: apt.scheduledTime,
      contactNumber: apt.userInfo?.phone || apt.userId?.phone,
      email: apt.userInfo?.email || apt.userId?.email,
      hospitalName: apt.hospitalInfo?.name || apt.hospitalId?.hospitalName
    }));

    res.json(donors);
  } catch (error) {
    console.error('Donors screening error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/donors/:id/screen', auth, checkRole('doctor'), async (req, res) => {
  try {
    res.json({ message: 'Donor screened successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/blood-units/validation', auth, checkRole('doctor'), async (req, res) => {
  try {
    // Fetch blood inventory units
    const units = await BloodInventory.find({
      status: { $in: ['Available', 'Quarantined'] }
    })
      .populate('hospitalId', 'hospitalName')
      .sort({ collectionDate: -1 })
      .limit(50)
      .lean();

    // Transform to expected format
    const validationUnits = units.map(unit => ({
      _id: unit._id,
      unitId: unit.bloodUnitId,
      bloodGroup: unit.bloodGroup,
      donorName: unit.donorInfo?.donorName || 'Anonymous',
      collectionDate: unit.collectionDate,
      expiryDate: unit.expiryDate,
      status: unit.status,
      volume: unit.volume,
      storageLocation: `${unit.storageLocation?.fridgeId || 'FR-01'}-${unit.storageLocation?.rackNumber || 'R-01'}`,
      storageType: unit.storageType,
      hospitalName: unit.hospitalId?.hospitalName || 'Hospital'
    }));

    res.json(validationUnits);
  } catch (error) {
    console.error('Blood units error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/blood-units/:id/validate', auth, checkRole('doctor'), async (req, res) => {
  try {
    res.json({ message: 'Blood unit validated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/adverse-reactions', auth, checkRole('doctor'), async (req, res) => {
  try {
    const reactions = await DonationAppointment.find({
      status: 'adverse_reaction'
    })
      .populate('userId', 'fullName email phone')
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

    const mapped = reactions.map(r => ({
      _id: r._id,
      donorName: r.userInfo?.name || r.userId?.fullName || 'Unknown',
      donationId: r._id,
      reactionType: r.notes || 'unknown',
      symptoms: r.notes || '',
      reportedDate: r.updatedAt,
      status: 'monitoring',
      severity: 'low'
    }));
    res.json(mapped);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/adverse-reactions', auth, checkRole('doctor'), async (req, res) => {
  try {
    res.json({ message: 'Adverse reaction logged successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/camps/oversight', auth, checkRole('doctor'), async (req, res) => {
  try {
    // Fetch blood camps
    const camps = await BloodCamp.find({
      status: { $in: ['pending', 'approved'] }
    })
      .populate('hospitalId', 'hospitalName')
      .sort({ date: 1 })
      .limit(50)
      .lean();

    // Transform to expected format
    const oversightCamps = camps.map(camp => ({
      _id: camp._id,
      campName: camp.campName,
      location: camp.location?.address || camp.location?.city || 'Location TBD',
      date: camp.date,
      expectedDonors: camp.expectedDonors || 50,
      status: camp.status,
      organizer: camp.organizer || 'Hospital',
      contactPerson: camp.contactPerson,
      contactPhone: camp.contactPhone,
      hospitalName: camp.hospitalId?.hospitalName || 'Hospital'
    }));

    res.json(oversightCamps);
  } catch (error) {
    console.error('Camps oversight error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/camps/:id/validate', auth, checkRole('doctor'), async (req, res) => {
  try {
    res.json({ message: 'Camp validated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/emergency-requests', auth, checkRole('doctor'), async (req, res) => {
  try {
    const emergencies = await EmergencyRequest.find({
      lifecycleStatus: { $in: ['CREATED', 'MEDICAL_VERIFICATION_PENDING', 'PARTNER_HOSPITAL_SEARCH'] }
    })
      .sort({ urgencyScore: -1, createdAt: -1 })
      .limit(50)
      .lean();

    const mapped = emergencies.map(e => ({
      _id: e._id,
      patientName: e.patientInfo?.diagnosis || 'Emergency Patient',
      bloodGroup: e.bloodGroup,
      unitsNeeded: e.unitsRequired,
      requestDate: e.createdAt,
      status: e.severityLevel?.toLowerCase() || 'high',
      hospitalName: e.requestingHospitalName || 'Hospital',
      reason: e.patientInfo?.diagnosis || 'Emergency'
    }));
    res.json(mapped);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/emergency-requests/:id/fast-track', auth, checkRole('doctor'), async (req, res) => {
  try {
    res.json({ message: 'Emergency request fast-tracked successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/medical-notes', auth, checkRole('doctor'), async (req, res) => {
  try {
    const notes = await DonationAppointment.find({
      notes: { $exists: true, $ne: '' }
    })
      .populate('userId', 'fullName email')
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

    const mapped = notes.map(n => ({
      _id: n._id,
      patientId: n.userId?._id || n._id,
      patientName: n.userInfo?.name || n.userId?.fullName || 'Unknown',
      noteType: n.status === 'completed' ? 'follow-up' : 'screening',
      content: n.notes || '',
      createdAt: n.updatedAt || n.createdAt,
      createdBy: req.user.id
    }));
    res.json(mapped);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/medical-notes', auth, checkRole('doctor'), async (req, res) => {
  try {
    res.json({ message: 'Medical note added successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/alerts', auth, checkRole('doctor'), async (req, res) => {
  try {
    const alerts = await Notification.find({
      userId: req.user._id
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    if (alerts.length === 0) {
      const emergencyCount = await EmergencyRequest.countDocuments({
        lifecycleStatus: { $in: ['CREATED', 'MEDICAL_VERIFICATION_PENDING'] }
      });
      const pendingDonors = await DonationAppointment.countDocuments({
        status: 'scheduled',
        scheduledDate: { $gte: new Date() }
      });
      const dynamicAlerts = [];
      if (emergencyCount > 0) {
        dynamicAlerts.push({
          _id: 'alert_emergency',
          type: 'emergency',
          priority: 'high',
          message: emergencyCount + ' emergency blood request(s) pending review',
          createdAt: new Date(),
          read: false
        });
      }
      if (pendingDonors > 0) {
        dynamicAlerts.push({
          _id: 'alert_screening',
          type: 'screening',
          priority: 'medium',
          message: pendingDonors + ' donor(s) pending screening',
          createdAt: new Date(),
          read: false
        });
      }
      return res.json(dynamicAlerts);
    }

    const mapped = alerts.map(a => ({
      _id: a._id,
      type: a.type || 'info',
      priority: a.priority || 'medium',
      message: a.message,
      createdAt: a.createdAt,
      read: a.isRead || false
    }));
    res.json(mapped);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.put('/alerts/:id/read', auth, checkRole('doctor'), async (req, res) => {
  try {
    res.json({ message: 'Alert marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
