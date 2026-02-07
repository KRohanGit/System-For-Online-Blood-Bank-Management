const EmergencyMessage = require('../models/EmergencyMessage');
const DonorCredential = require('../models/DonorCredential');
const Donation = require('../models/Donation');
const PublicUser = require('../models/PublicUser');
const HospitalProfile = require('../models/HospitalProfile');
const { sendEmergencyAlertEmail } = require('../services/email.service');

const sendEmergencyAlert = async (req, res) => {
  try {
    const { bloodGroup, message } = req.body;
    const hospitalId = req.user._id;

    if (!bloodGroup || !message) {
      return res.status(400).json({
        success: false,
        message: 'Blood group and message are required'
      });
    }

    const cooldownDays = 90;
    const cooldownDate = new Date();
    cooldownDate.setDate(cooldownDate.getDate() - cooldownDays);

    const eligibleDonors = await Donation.aggregate([
      {
        $match: {
          hospitalId: hospitalId,
          status: 'COMPLETED',
          bloodGroup: bloodGroup
        }
      },
      {
        $group: {
          _id: '$donorId',
          lastDonation: { $max: '$donationDate' }
        }
      },
      {
        $match: {
          lastDonation: { $lt: cooldownDate }
        }
      }
    ]);

    const donorIds = eligibleDonors.map(d => d._id);

    const verifiedCredentials = await DonorCredential.find({
      hospitalId: hospitalId,
      donorId: { $in: donorIds },
      isVerified: true
    });

    const verifiedDonorIds = verifiedCredentials.map(c => c.donorId);

    const donors = await PublicUser.find({
      _id: { $in: verifiedDonorIds },
      bloodGroup: bloodGroup
    });

    const hospitalProfile = await HospitalProfile.findOne({ userId: hospitalId });
    const hospitalName = hospitalProfile?.hospitalName || 'Hospital';

    const messages = [];
    for (const donor of donors) {
      const emergencyMsg = new EmergencyMessage({
        hospitalId,
        donorId: donor._id,
        message,
        bloodGroup,
        readStatus: false
      });
      await emergencyMsg.save();
      messages.push(emergencyMsg);

      await sendEmergencyAlertEmail(donor.email, hospitalName, message);
    }

    res.status(200).json({
      success: true,
      message: `Emergency alert sent to ${messages.length} donors`,
      data: { count: messages.length }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getEmergencyMessages = async (req, res) => {
  try {
    const donorId = req.user._id;

    const messages = await EmergencyMessage.find({ donorId })
      .populate('hospitalId', 'email')
      .sort({ createdAt: -1 });

    const hospitalProfiles = await HospitalProfile.find({
      userId: { $in: messages.map(m => m.hospitalId) }
    });

    const hospitalMap = {};
    hospitalProfiles.forEach(hp => {
      hospitalMap[hp.userId.toString()] = hp.hospitalName;
    });

    const result = messages.map(m => ({
      id: m._id,
      hospitalName: hospitalMap[m.hospitalId._id.toString()] || 'Hospital',
      message: m.message,
      bloodGroup: m.bloodGroup,
      readStatus: m.readStatus,
      createdAt: m.createdAt
    }));

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const markMessageAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const donorId = req.user._id;

    const message = await EmergencyMessage.findOne({
      _id: messageId,
      donorId: donorId
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    message.readStatus = true;
    await message.save();

    res.status(200).json({
      success: true,
      message: 'Message marked as read'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  sendEmergencyAlert,
  getEmergencyMessages,
  markMessageAsRead
};
