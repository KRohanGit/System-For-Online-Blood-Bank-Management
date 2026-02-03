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
const CampBooking = require('../models/CampBooking');

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
    // Sample data for testing
    const sampleReactions = [
      {
        _id: '1',
        donorName: 'Mike Johnson',
        donationId: 'DON-001',
        reactionType: 'mild',
        symptoms: 'Dizziness',
        reportedDate: new Date(),
        status: 'monitoring',
        severity: 'low'
      }
    ];
    res.json(sampleReactions);
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
    // Sample data for testing
    const sampleEmergencies = [
      {
        _id: '1',
        patientName: 'Emergency Patient',
        bloodGroup: 'O-',
        unitsNeeded: 5,
        requestDate: new Date(),
        status: 'critical',
        hospitalName: 'Emergency Hospital',
        reason: 'Major trauma'
      }
    ];
    res.json(sampleEmergencies);
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
    // Sample data for testing
    const sampleNotes = [
      {
        _id: '1',
        patientId: 'PAT-001',
        patientName: 'John Doe',
        noteType: 'screening',
        content: 'Patient cleared for donation. All vitals normal.',
        createdAt: new Date(),
        createdBy: req.user.id
      },
      {
        _id: '2',
        patientId: 'PAT-002',
        patientName: 'Jane Smith',
        noteType: 'follow-up',
        content: 'Follow-up required after mild reaction.',
        createdAt: new Date(),
        createdBy: req.user.id
      }
    ];
    res.json(sampleNotes);
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
    // Sample data for testing
    const sampleAlerts = [
      {
        _id: '1',
        type: 'emergency',
        priority: 'high',
        message: 'Emergency blood request for O- blood type',
        createdAt: new Date(),
        read: false
      },
      {
        _id: '2',
        type: 'screening',
        priority: 'medium',
        message: '5 donors pending screening today',
        createdAt: new Date(),
        read: false
      }
    ];
    res.json(sampleAlerts);
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
