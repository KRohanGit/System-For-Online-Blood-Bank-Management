const Donation = require('../models/Donation');
const DonorCredential = require('../models/DonorCredential');
const PublicUser = require('../models/PublicUser');
const HospitalProfile = require('../models/HospitalProfile');
const { generateOTP, hashOTP, getOTPExpiry } = require('../services/otp.service');
const { sendDonorCredentialEmail } = require('../services/email.service');
const { generateDonationCertificate } = require('../services/certificate.service');

const createDonation = async (req, res) => {
  try {
    const { donorId, bloodGroup, units } = req.body;
    const hospitalId = req.user._id;

    const donation = new Donation({
      donorId,
      hospitalId,
      bloodGroup,
      units: units || 1,
      status: 'PENDING'
    });

    await donation.save();

    res.status(201).json({
      success: true,
      data: donation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const completeDonation = async (req, res) => {
  try {
    const { donationId } = req.params;
    const doctorId = req.user._id;

    const donation = await Donation.findById(donationId);
    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found'
      });
    }

    donation.status = 'COMPLETED';
    donation.doctorId = doctorId;
    donation.donationDate = new Date();
    await donation.save();

    const donor = await PublicUser.findById(donation.donorId);
    if (!donor) {
      return res.status(404).json({
        success: false,
        message: 'Donor not found'
      });
    }

    const hospitalProfile = await HospitalProfile.findOne({ userId: donation.hospitalId });
    const hospitalName = hospitalProfile?.hospitalName || 'Hospital';

    let credential = await DonorCredential.findOne({
      donorId: donation.donorId,
      hospitalId: donation.hospitalId
    });

    if (!credential) {
      const otp = generateOTP();
      const otpHash = await hashOTP(otp);
      const otpExpiry = getOTPExpiry();

      credential = new DonorCredential({
        donorId: donation.donorId,
        hospitalId: donation.hospitalId,
        email: donor.email,
        otpHash,
        otpExpiry,
        isVerified: false,
        isOtpUsed: false
      });

      await credential.save();
      await sendDonorCredentialEmail(donor.email, hospitalName, otp);
    }

    await generateDonationCertificate({
      donorId: donation.donorId,
      hospitalId: donation.hospitalId,
      donorName: donor.fullName,
      bloodGroup: donation.bloodGroup,
      donationDate: donation.donationDate,
      units: donation.units
    });

    res.status(200).json({
      success: true,
      data: donation,
      message: 'Donation completed and credentials sent to donor'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getDonations = async (req, res) => {
  try {
    const hospitalId = req.user._id;
    const donations = await Donation.find({ hospitalId })
      .populate('donorId', 'fullName email bloodGroup')
      .sort({ createdAt: -1 });

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

const getDonorsByHospital = async (req, res) => {
  try {
    const hospitalId = req.user._id;

    const credentials = await DonorCredential.find({ hospitalId })
      .populate('donorId', 'fullName email bloodGroup');

    const donations = await Donation.aggregate([
      { $match: { hospitalId: hospitalId, status: 'COMPLETED' } },
      { $group: {
        _id: '$donorId',
        lastDonationDate: { $max: '$donationDate' }
      }}
    ]);

    const donorMap = {};
    donations.forEach(d => {
      donorMap[d._id.toString()] = d.lastDonationDate;
    });

    const donorList = credentials.map(cred => ({
      donorId: cred.donorId._id,
      donorName: cred.donorId.fullName,
      email: cred.donorId.email,
      bloodGroup: cred.donorId.bloodGroup,
      lastDonationDate: donorMap[cred.donorId._id.toString()] || null,
      credentialStatus: cred.isVerified ? 'Verified' : 'Issued',
      emergencyContactEnabled: cred.isVerified
    }));

    res.status(200).json({
      success: true,
      data: donorList
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createDonation,
  completeDonation,
  getDonations,
  getDonorsByHospital
};
