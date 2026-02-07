const DonorCredential = require('../models/DonorCredential');
const PublicUser = require('../models/PublicUser');
const { validateOTP } = require('../services/otp.service');
const { generateToken } = require('../utils/jwt');
const bcrypt = require('bcrypt');

const loginWithOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    const credential = await DonorCredential.findOne({
      email: email.toLowerCase(),
      isOtpUsed: false
    });

    if (!credential) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials or OTP already used'
      });
    }

    if (new Date() > credential.otpExpiry) {
      return res.status(401).json({
        success: false,
        message: 'OTP has expired'
      });
    }

    const isValid = await validateOTP(otp, credential.otpHash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    credential.isOtpUsed = true;
    credential.isVerified = true;
    await credential.save();

    const donor = await PublicUser.findById(credential.donorId);

    const token = generateToken({
      userId: donor._id,
      role: 'donor'
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        mustChangePassword: credential.mustChangePassword,
        donor: {
          id: donor._id,
          email: donor.email,
          fullName: donor.fullName,
          bloodGroup: donor.bloodGroup
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const donorId = req.user._id;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters'
      });
    }

    const donor = await PublicUser.findById(donorId).select('+password');
    donor.password = newPassword;
    await donor.save();

    const credential = await DonorCredential.findOne({ donorId });
    if (credential) {
      credential.mustChangePassword = false;
      await credential.save();
    }

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const loginWithPassword = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const donor = await PublicUser.findOne({
      email: email.toLowerCase()
    }).select('+password');

    if (!donor) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, donor.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const credential = await DonorCredential.findOne({
      donorId: donor._id,
      isVerified: true
    });

    if (!credential) {
      return res.status(401).json({
        success: false,
        message: 'Donor credentials not found'
      });
    }

    const token = generateToken({
      userId: donor._id,
      role: 'donor'
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        mustChangePassword: false,
        donor: {
          id: donor._id,
          email: donor.email,
          fullName: donor.fullName,
          bloodGroup: donor.bloodGroup
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  loginWithOTP,
  changePassword,
  loginWithPassword
};
