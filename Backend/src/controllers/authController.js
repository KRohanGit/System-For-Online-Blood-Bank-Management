const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const HospitalProfile = require('../models/HospitalProfile');
const { generateToken } = require('../utils/jwt');
const { isValidEmail, validatePassword, isValidRole } = require('../utils/validation');
const { processEncryptedUpload } = require('../utils/fileEncryptionService');
const fs = require('fs').promises;

/**
 * Register a new doctor
 */
const registerDoctor = async (req, res) => {
  try {
    const { email, password, name, hospitalName } = req.body;

    // Validate required fields
    if (!email || !password || !name || !hospitalName) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: email, password, name, hospitalName'
      });
    }

    // Validate email
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Medical certificate is required'
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

    // Create user
    const user = new User({
      email: email.toLowerCase(),
      password,
      role: 'doctor',
      isVerified: false
    });

    await user.save();

    // Encrypt certificate file with three-layer encryption
    const fileBuffer = await fs.readFile(req.file.path);
    const encryptionPackage = await processEncryptedUpload(fileBuffer, {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      fieldName: 'certificate'
    });

    // Create doctor profile with encryption metadata
    const doctorProfile = new DoctorProfile({
      userId: user._id,
      fullName: name,
      hospitalName,
      certificateFilePath: req.file.path, // Keep original path for backward compatibility
      encryptedCertificateData: encryptionPackage.encryptedFileData,
      encryptedAESKey: encryptionPackage.encryptedAESKey,
      encryptionIV: encryptionPackage.encryptionIV,
      encryptionMetadata: encryptionPackage.encryptionMetadata
    });

    await doctorProfile.save();

    // Generate token
    const token = generateToken({
      userId: user._id,
      role: user.role
    });

    res.status(201).json({
      success: true,
      message: 'Doctor registration successful. Your account is pending verification.',
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified
        },
        profile: {
          fullName: doctorProfile.fullName,
          hospitalName: doctorProfile.hospitalName,
          verificationStatus: doctorProfile.verificationStatus
        }
      }
    });

  } catch (error) {
    console.error('Doctor registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Register a new hospital/admin
 */
const registerHospital = async (req, res) => {
  try {
    const { 
      hospitalName, 
      officialEmail, 
      licenseNumber, 
      adminName, 
      adminEmail, 
      password 
    } = req.body;

    // Validate required fields
    if (!hospitalName || !officialEmail || !licenseNumber || !adminName || !adminEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Validate emails
    if (!isValidEmail(adminEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid admin email format'
      });
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Hospital license is required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: adminEmail.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Admin email already registered'
      });
    }

    // Check if license number already exists
    const existingLicense = await HospitalProfile.findOne({ licenseNumber });
    if (existingLicense) {
      return res.status(400).json({
        success: false,
        message: 'License number already registered'
      });
    }

    // Create user
    const user = new User({
      email: adminEmail.toLowerCase(),
      password,
      role: 'hospital_admin',
      isVerified: false
    });

    await user.save();
    console.log('✅ Hospital admin user created:', { email: user.email, id: user._id, isVerified: user.isVerified });

    // Encrypt license file with three-layer encryption
    const fileBuffer = await fs.readFile(req.file.path);
    const encryptionPackage = await processEncryptedUpload(fileBuffer, {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      fieldName: 'license'
    });

    // Create hospital profile with encryption metadata
    const hospitalProfile = new HospitalProfile({
      userId: user._id,
      hospitalName,
      officialEmail: officialEmail.toLowerCase(),
      licenseNumber,
      licenseFilePath: req.file.path, // Keep original path for backward compatibility
      encryptedLicenseData: encryptionPackage.encryptedFileData,
      encryptedAESKey: encryptionPackage.encryptedAESKey,
      encryptionIV: encryptionPackage.encryptionIV,
      encryptionMetadata: encryptionPackage.encryptionMetadata,
      adminName,
      adminEmail: adminEmail.toLowerCase(),
      verificationStatus: 'pending'
    });

    await hospitalProfile.save();
    console.log('✅ Hospital profile created for:', adminName);

    // Generate token
    const token = generateToken({
      userId: user._id,
      role: user.role
    });

    res.status(201).json({
      success: true,
      message: 'Hospital registration successful. Your account is pending verification.',
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified
        },
        profile: {
          hospitalName: hospitalProfile.hospitalName,
          licenseNumber: hospitalProfile.licenseNumber,
          adminName: hospitalProfile.adminName,
          verificationStatus: hospitalProfile.verificationStatus
        }
      }
    });

  } catch (error) {
    console.error('Hospital registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Login for all roles
 */
const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Validate email
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if role matches (if role is provided)
    if (role && user.role !== role.toLowerCase()) {
      return res.status(401).json({
        success: false,
        message: `This account is not registered as ${role}`
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = generateToken({
      userId: user._id,
      role: user.role
    });

    // Get role-specific profile
    let profile = null;
    if (user.role === 'doctor') {
      profile = await DoctorProfile.findOne({ userId: user._id });
    } else if (user.role === 'hospital_admin') {
      profile = await HospitalProfile.findOne({ userId: user._id });
    }
    // super_admin has no profile - central authority

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified
        },
        profile: profile ? {
          verificationStatus: profile.verificationStatus,
          ...(user.role === 'doctor' ? {
            fullName: profile.fullName,
            hospitalName: profile.hospitalName
          } : {
            hospitalName: profile.hospitalName,
            adminName: profile.adminName
          })
        } : null
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get current user profile
 */
const getProfile = async (req, res) => {
  try {
    const user = req.user;

    // Get role-specific profile
    let profile = null;
    if (user.role === 'doctor') {
      profile = await DoctorProfile.findOne({ userId: user._id });
      console.log('🔍 Doctor profile retrieved:', {
        userId: user._id,
        verificationStatus: profile?.verificationStatus,
        fullName: profile?.fullName
      });
    } else if (user.role === 'hospital_admin') {
      profile = await HospitalProfile.findOne({ userId: user._id });
    }
    // super_admin has no profile

    console.log('📤 Sending profile response:', {
      userId: user._id,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      profileVerificationStatus: profile?.verificationStatus
    });

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        profile: profile || null
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Register a new donor/patient
 */
const registerDonor = async (req, res) => {
  try {
    const { email, password, name, bloodType, phone, address } = req.body;

    // Validate required fields
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and name are required'
      });
    }

    // Validate email
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
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

    // Create user (donors are automatically verified)
    const user = new User({
      email: email.toLowerCase(),
      password,
      role: 'donor',
      isVerified: true // Donors don't need admin verification
    });

    await user.save();

    // Generate token
    const token = generateToken({
      userId: user._id,
      role: user.role
    });

    res.status(201).json({
      success: true,
      message: 'Donor registration successful!',
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified
        }
      }
    });

  } catch (error) {
    console.error('Donor registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  registerDoctor,
  registerHospital,
  registerDonor,
  login,
  getProfile
};
