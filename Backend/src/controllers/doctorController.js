const DoctorProfile = require('../models/DoctorProfile');
const User = require('../models/User');

/**
 * Get doctor's own profile
 */
const getDoctorProfile = async (req, res) => {
  try {
    const profile = await DoctorProfile.findOne({ userId: req.userId })
      .populate('userId', 'email role isVerified createdAt');

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found'
      });
    }

    res.status(200).json({
      success: true,
      data: profile
    });

  } catch (error) {
    console.error('Get doctor profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
};

/**
 * Update doctor profile (limited fields)
 */
const updateDoctorProfile = async (req, res) => {
  try {
    const { fullName, hospitalName } = req.body;
    
    const profile = await DoctorProfile.findOne({ userId: req.userId });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    // Only allow updates if not yet verified or rejected
    if (profile.verificationStatus === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update verified profile. Contact support if changes needed.'
      });
    }

    // Update allowed fields
    if (fullName) profile.fullName = fullName;
    if (hospitalName) profile.hospitalName = hospitalName;

    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: profile
    });

  } catch (error) {
    console.error('Update doctor profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

/**
 * Get verification status
 */
const getVerificationStatus = async (req, res) => {
  try {
    const profile = await DoctorProfile.findOne({ userId: req.userId })
      .select('verificationStatus rejectionReason verifiedAt');

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        status: profile.verificationStatus,
        rejectionReason: profile.rejectionReason,
        verifiedAt: profile.verifiedAt
      }
    });

  } catch (error) {
    console.error('Get verification status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch verification status'
    });
  }
};

/**
 * Get all pending doctors (Admin only)
 */
const getPendingDoctors = async (req, res) => {
  try {
    const pendingDoctors = await DoctorProfile.find({ verificationStatus: 'pending' })
      .populate('userId', 'email createdAt')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: pendingDoctors.length,
      data: pendingDoctors
    });

  } catch (error) {
    console.error('Get pending doctors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending doctors'
    });
  }
};

/**
 * Verify doctor (Admin only)
 */
const verifyDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { status, rejectionReason } = req.body;

    // Validate status
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either "approved" or "rejected"'
      });
    }

    // If rejected, reason is required
    if (status === 'rejected' && !rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required when rejecting'
      });
    }

    const doctorProfile = await DoctorProfile.findById(doctorId);

    if (!doctorProfile) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found'
      });
    }

    // Update verification status
    doctorProfile.verificationStatus = status;
    doctorProfile.verifiedAt = new Date();
    doctorProfile.verifiedBy = req.userId;
    
    if (status === 'rejected') {
      doctorProfile.rejectionReason = rejectionReason;
    }

    await doctorProfile.save();

    // Update user's isVerified status
    if (status === 'approved') {
      await User.findByIdAndUpdate(doctorProfile.userId, { isVerified: true });
    }

    res.status(200).json({
      success: true,
      message: `Doctor ${status === 'approved' ? 'approved' : 'rejected'} successfully`,
      data: doctorProfile
    });

  } catch (error) {
    console.error('Verify doctor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify doctor'
    });
  }
};

module.exports = {
  getDoctorProfile,
  updateDoctorProfile,
  getVerificationStatus,
  getPendingDoctors,
  verifyDoctor
};
