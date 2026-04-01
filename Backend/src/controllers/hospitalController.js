const HospitalProfile = require('../models/HospitalProfile');
const User = require('../models/User');
const PublicUser = require('../models/PublicUser');
const DonorCredential = require('../models/DonorCredential');
const bcrypt = require('bcryptjs');
const { sendDonorCredentialEmail, getEmailDeliveryMode } = require('../services/email.service');

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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address'
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

    // Check if donor already exists by email
    const existingEmailDonor = await PublicUser.findOne({ 
      email: email.toLowerCase()
    });

    if (existingEmailDonor) {
      return res.status(409).json({
        success: false,
        message: `Account with email "${email}" already exists`,
        code: 'EMAIL_EXISTS'
      });
    }

    // Check if donor already exists by phone
    if (phone) {
      const existingPhoneDonor = await PublicUser.findOne({ 
        phone: phone
      });
      if (existingPhoneDonor) {
        return res.status(409).json({
          success: false,
          message: `Account with phone "${phone}" already exists`,
          code: 'PHONE_EXISTS'
        });
      }
    }

    const donor = new PublicUser({
      fullName: donorName,
      email: email.toLowerCase(),
      phone: phone || '',
      password: password,
      bloodGroup: bloodGroup || 'O+',
      role: 'PUBLIC_USER',
      verificationStatus: 'verified'
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

    // Send donor credential email with OTP
    let emailSent = false;
    try {
      emailSent = await sendDonorCredentialEmail(donor.email, {
        donorName: donor.fullName,
        email: donor.email,
        otp: otp,
        hospitalName: hospitalProfile.hospitalName || 'LifeLink Hospital'
      });
      console.log(`✓ Donor credential email sent to ${donor.email}`);
    } catch (emailErr) {
      console.warn('⚠ Failed to send donor credential email:', emailErr.message);
      // Don't fail the request if email fails - OTP is still in response
      emailSent = false;
    }

    res.status(201).json({
      success: true,
      message: 'Donor account created successfully',
      data: {
        id: donor._id,
        email: donor.email,
        donorName: donor.fullName,
        role: donor.role,
        emailSent,
        emailMode: getEmailDeliveryMode(),
        credentials: {
          email: donor.email,
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

/**
 * Resend donor credentials email
 */
const resendDonorCredentials = async (req, res) => {
  try {
    const { donorId } = req.params;

    // Get hospital admin's hospital ID
    const hospitalProfile = await HospitalProfile.findOne({ userId: req.user._id });
    if (!hospitalProfile) {
      return res.status(404).json({
        success: false,
        message: 'Hospital profile not found'
      });
    }

    // Find donor by ID
    const donor = await PublicUser.findById(donorId);
    if (!donor) {
      return res.status(404).json({
        success: false,
        message: 'Donor not found'
      });
    }

    const hospitalIds = [req.user._id, hospitalProfile._id];

    // Find existing credential scoped to this hospital (supports legacy hospitalId formats)
    const credential = await DonorCredential.findOne({
      donorId: donor._id,
      hospitalId: { $in: hospitalIds }
    });
    if (!credential) {
      return res.status(404).json({
        success: false,
        message: 'Donor credential not found'
      });
    }

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    const otpHash = await bcrypt.hash(otp, 10);
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Update credential with new OTP
    credential.otpHash = otpHash;
    credential.otpExpiry = otpExpiry;
    credential.isOtpUsed = false;
    credential.updatedAt = new Date();

    await credential.save();

    // Send credential email with new OTP
    let emailSent = false;
    try {
      emailSent = await sendDonorCredentialEmail(donor.email, {
        donorName: donor.fullName,
        email: donor.email,
        otp: otp,
        hospitalName: hospitalProfile.hospitalName || 'LifeLink Hospital'
      });
      console.log(`✓ Donor credential email resent to ${donor.email}`);
    } catch (emailErr) {
      console.warn('⚠ Failed to resend donor credential email:', emailErr.message);
      emailSent = false;
    }

    res.status(200).json({
      success: true,
      message: 'Credentials resent successfully',
      data: {
        email: donor.email,
        donorName: donor.fullName,
        emailSent,
        emailMode: getEmailDeliveryMode(),
        credentials: {
          email: donor.email,
          otp: otp,
          mustChangePassword: true
        }
      }
    });

  } catch (error) {
    console.error('Resend donor credentials error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend credentials',
      error: error.message
    });
  }
};

/**
 * Update donor status (activate/deactivate)
 */
const updateDonorStatus = async (req, res) => {
  try {
    const { donorId } = req.params;
    const { status } = req.body;
    const hospitalProfile = await HospitalProfile.findOne({ userId: req.user._id }).select('_id').lean();
    const hospitalIds = hospitalProfile ? [req.user._id, hospitalProfile._id] : [req.user._id];

    // Validate status
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be "active" or "inactive"'
      });
    }

    // Verify donor belongs to this hospital
    const credential = await DonorCredential.findOne({
      donorId: donorId,
      hospitalId: { $in: hospitalIds }
    });

    if (!credential) {
      return res.status(404).json({
        success: false,
        message: 'Donor not found for this hospital'
      });
    }

    // Update only this specific donor's status (mapped to isVerified)
    // isVerified = true means 'active', false means 'inactive'
    credential.isVerified = status === 'active';
    await credential.save();

    res.status(200).json({
      success: true,
      message: `Donor status updated to ${status}`,
      data: {
        donorId: credential.donorId,
        status: status,
        updatedAt: credential.updatedAt
      }
    });

  } catch (error) {
    console.error('Update donor status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update donor status',
      error: error.message
    });
  }
};

/**
 * Delete donor account for this hospital
 * Removes hospital credential mapping, and deletes donor profile if not linked to any other hospital.
 */
const deleteDonorAccount = async (req, res) => {
  try {
    const { donorId } = req.params;

    const hospitalProfile = await HospitalProfile.findOne({ userId: req.user._id }).select('_id').lean();
    const hospitalIds = hospitalProfile ? [req.user._id, hospitalProfile._id] : [req.user._id];

    // Ensure donor is actually mapped to this hospital
    const credential = await DonorCredential.findOne({
      donorId,
      hospitalId: { $in: hospitalIds }
    });

    if (!credential) {
      return res.status(404).json({
        success: false,
        message: 'Donor not found for this hospital'
      });
    }

    // Remove this hospital's credential mappings for donor
    await DonorCredential.deleteMany({
      donorId,
      hospitalId: { $in: hospitalIds }
    });

    // If donor is no longer mapped to any hospital, remove public user record as well
    const remainingCredentials = await DonorCredential.countDocuments({ donorId });
    let donorDeleted = false;
    if (remainingCredentials === 0) {
      await PublicUser.findByIdAndDelete(donorId);
      donorDeleted = true;
    }

    return res.status(200).json({
      success: true,
      message: donorDeleted
        ? 'Donor account deleted successfully'
        : 'Donor unlinked from this hospital successfully',
      data: {
        donorId,
        donorDeleted,
        remainingCredentials
      }
    });
  } catch (error) {
    console.error('Delete donor error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete donor account',
      error: error.message
    });
  }
};

module.exports = {
  getHospitalProfile,
  updateHospitalProfile,
  getVerificationStatus,
  createDonorAccount,
  resendDonorCredentials,
  updateDonorStatus,
  deleteDonorAccount
};
