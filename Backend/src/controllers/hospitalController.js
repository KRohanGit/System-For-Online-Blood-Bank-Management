const HospitalProfile = require('../models/HospitalProfile');
const User = require('../models/User');

/**
 * Get hospital's own profile
 */
const getHospitalProfile = async (req, res) => {
  try {
    const profile = await HospitalProfile.findOne({ userId: req.userId })
      .populate('userId', 'email role isVerified createdAt');

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Hospital profile not found'
      });
    }

    res.status(200).json({
      success: true,
      data: profile
    });

  } catch (error) {
    console.error('Get hospital profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
};

/**
 * Update hospital profile (limited fields)
 */
const updateHospitalProfile = async (req, res) => {
  try {
    const { hospitalName, officialEmail, adminName } = req.body;
    
    const profile = await HospitalProfile.findOne({ userId: req.userId });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    // Only allow updates if not yet verified
    if (profile.verificationStatus === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update verified profile. Contact support if changes needed.'
      });
    }

    // Update allowed fields
    if (hospitalName) profile.hospitalName = hospitalName;
    if (officialEmail) profile.officialEmail = officialEmail.toLowerCase();
    if (adminName) profile.adminName = adminName;

    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: profile
    });

  } catch (error) {
    console.error('Update hospital profile error:', error);
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
    const profile = await HospitalProfile.findOne({ userId: req.userId })
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
 * Create donor account (Admin only)
 * This will be expanded when donor functionality is needed
 */
const createDonorAccount = async (req, res) => {
  try {
    const { email, password, donorName } = req.body;

    // Validate required fields
    if (!email || !password || !donorName) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and donor name are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Create donor user
    const user = new User({
      email: email.toLowerCase(),
      password,
      role: 'donor',
      isVerified: true // Donors created by admin are auto-verified
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'Donor account created successfully',
      data: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Create donor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create donor account'
    });
  }
};

module.exports = {
  getHospitalProfile,
  updateHospitalProfile,
  getVerificationStatus,
  createDonorAccount
};
