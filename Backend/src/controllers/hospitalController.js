const HospitalProfile = require('../models/HospitalProfile');
const User = require('../models/User');
const PublicUser = require('../models/PublicUser');
const DonorCredential = require('../models/DonorCredential');
const bcrypt = require('bcrypt');

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
    const { email, password, donorName, phone, bloodGroup } = req.body;

    // Validate required fields
    if (!email || !password || !donorName) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and donor name are required'
      });
    }

    // Get hospital admin's hospital ID
    const hospitalProfile = await HospitalProfile.findOne({ userId: req.user._id });
    if (!hospitalProfile) {
      return res.status(404).json({
        success: false,
        message: 'Hospital profile not found'
      });
    }

    const hospitalId = hospitalProfile._id;

    // Check if donor already exists
    const existingDonor = await PublicUser.findOne({ 
      email: email.toLowerCase()
    });

    if (existingDonor) {
      return res.status(400).json({
        success: false,
        message: 'A donor with this email already exists'
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create PublicUser (donor)
    const donor = new PublicUser({
      fullName: donorName,
      email: email.toLowerCase(),
      phone: phone || '0000000000', // Placeholder if not provided
      password: hashedPassword,
      bloodGroup: bloodGroup || 'O+',
      role: 'PUBLIC_USER',
      verificationStatus: 'verified' // Pre-verified by hospital
    });

    await donor.save();

    // Generate OTP for donor credential
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    const otpHash = await bcrypt.hash(otp, 10);
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Create DonorCredential
    const credential = new DonorCredential({
      donorId: donor._id,
      hospitalId: req.user._id, // Hospital admin user ID
      email: donor.email,
      otpHash,
      otpExpiry,
      isVerified: true, // Pre-verified by hospital
      isOtpUsed: false,
      mustChangePassword: true
    });

    await credential.save();

    res.status(201).json({
      success: true,
      message: 'Donor account created successfully',
      data: {
        id: donor._id,
        email: donor.email,
        donorName: donor.fullName,
        role: donor.role,
        credentials: {
          email: donor.email,
          password: password, // Return plain password once for hospital to share with donor
          otp: otp,
          mustChangePassword: true
        }
      }
    });

  } catch (error) {
    console.error('Create donor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create donor account',
      error: error.message
    });
  }
};

module.exports = {
  getHospitalProfile,
  updateHospitalProfile,
  getVerificationStatus,
  createDonorAccount
};
