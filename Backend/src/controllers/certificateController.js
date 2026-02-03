const DonationCertificate = require('../models/DonationCertificate');
const { generateHash } = require('../utils/encryption');

const getMyCertificates = async (req, res) => {
  try {
    const userId = req.userId;

    const certificates = await DonationCertificate.find({ userId })
      .populate('hospitalId', 'hospitalName email phone address')
      .sort({ donationDate: -1 });

    res.status(200).json({
      success: true,
      count: certificates.length,
      data: certificates
    });

  } catch (error) {
    console.error('Get certificates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch certificates',
      error: error.message
    });
  }
};

const getCertificateById = async (req, res) => {
  try {
    const { certificateId } = req.params;
    const userId = req.userId;

    const certificate = await DonationCertificate.findOne({
      _id: certificateId,
      userId
    }).populate('hospitalId', 'hospitalName email phone address');

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    res.status(200).json({
      success: true,
      data: certificate
    });

  } catch (error) {
    console.error('Get certificate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch certificate',
      error: error.message
    });
  }
};

const verifyCertificate = async (req, res) => {
  try {
    const { certificateNumber, verificationHash } = req.body;

    if (!certificateNumber || !verificationHash) {
      return res.status(400).json({
        success: false,
        message: 'Certificate number and verification hash are required'
      });
    }

    const certificate = await DonationCertificate.findOne({
      certificateNumber,
      verificationHash,
      isVerified: true
    }).populate('userId', 'fullName bloodGroup')
      .populate('hospitalId', 'hospitalName address');

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found or invalid',
        verified: false
      });
    }

    res.status(200).json({
      success: true,
      message: 'Certificate is authentic',
      verified: true,
      data: {
        certificateNumber: certificate.certificateNumber,
        donorName: certificate.donorName,
        bloodGroup: certificate.bloodGroup,
        donationDate: certificate.donationDate,
        hospitalName: certificate.hospitalId?.hospitalName,
        issuedAt: certificate.createdAt
      }
    });

  } catch (error) {
    console.error('Verify certificate error:', error);
    res.status(500).json({
      success: false,
      message: 'Certificate verification failed',
      error: error.message
    });
  }
};

const createCertificate = async (req, res) => {
  try {
    const { userId, donorName, bloodGroup, donationDate, units, remarks } = req.body;
    const hospitalId = req.userId;

    if (req.userRole !== 'HOSPITAL_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Only hospitals can issue certificates'
      });
    }

    const certificateNumber = DonationCertificate.generateCertificateNumber();
    
    const dataToHash = `${certificateNumber}${userId}${bloodGroup}${donationDate}${hospitalId}`;
    const verificationHash = generateHash(dataToHash);

    const certificate = new DonationCertificate({
      userId,
      hospitalId,
      certificateNumber,
      donorName,
      bloodGroup,
      donationDate: donationDate || new Date(),
      units: units || 1,
      verificationHash,
      isVerified: true,
      remarks: remarks || null
    });

    await certificate.save();

    res.status(201).json({
      success: true,
      message: 'Certificate created successfully',
      data: certificate
    });

  } catch (error) {
    console.error('Create certificate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create certificate',
      error: error.message
    });
  }
};

module.exports = {
  getMyCertificates,
  getCertificateById,
  verifyCertificate,
  createCertificate
};
