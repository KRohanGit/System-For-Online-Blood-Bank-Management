const DonorCredential = require('../models/DonorCredential');
const Donation = require('../models/Donation');
const DonationCertificate = require('../models/DonationCertificate');
const EmergencyMessage = require('../models/EmergencyMessage');

const getDonorDashboard = async (req, res) => {
  try {
    const donorId = req.user._id;

    const credential = await DonorCredential.findOne({ donorId });

    const donations = await Donation.find({
      donorId,
      status: 'COMPLETED'
    }).sort({ donationDate: -1 });

    const certificates = await DonationCertificate.find({ userId: donorId });

    const unreadMessages = await EmergencyMessage.countDocuments({
      donorId,
      readStatus: false
    });

    const lastDonation = donations.length > 0 ? donations[0].donationDate : null;
    let nextEligibleDate = null;
    if (lastDonation) {
      nextEligibleDate = new Date(lastDonation);
      nextEligibleDate.setDate(nextEligibleDate.getDate() + 90);
    }

    res.status(200).json({
      success: true,
      data: {
        credentialStatus: credential?.isVerified ? 'Verified' : 'Pending',
        mustChangePassword: credential?.mustChangePassword || false,
        totalDonations: donations.length,
        lastDonationDate: lastDonation,
        nextEligibleDate,
        certificateCount: certificates.length,
        unreadMessages
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getDonationHistory = async (req, res) => {
  try {
    const donorId = req.user._id;

    const donations = await Donation.find({
      donorId,
      status: 'COMPLETED'
    })
    .populate('hospitalId', 'email')
    .sort({ donationDate: -1 });

    res.status(200).json({
      success: true,
      data: donations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getCertificates = async (req, res) => {
  try {
    const donorId = req.user._id;

    const certificates = await DonationCertificate.find({ userId: donorId })
      .sort({ donationDate: -1 });

    res.status(200).json({
      success: true,
      data: certificates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getDonorDashboard,
  getDonationHistory,
  getCertificates
};
