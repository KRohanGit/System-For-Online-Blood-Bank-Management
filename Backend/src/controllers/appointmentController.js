const DonationAppointment = require('../models/DonationAppointment');
const HospitalProfile = require('../models/HospitalProfile');
const PublicUser = require('../models/PublicUser');
const Notification = require('../models/Notification');

exports.createAppointment = async (req, res) => {
  try {
    const { hospitalId, postId, bloodGroup, scheduledDate, scheduledTime, notes } = req.body;
    
    const user = await PublicUser.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const hospital = await HospitalProfile.findById(hospitalId);
    if (!hospital) {
      return res.status(404).json({ success: false, message: 'Hospital not found' });
    }
    
    const existing = await DonationAppointment.findOne({
      userId: req.user.id,
      hospitalId,
      scheduledDate: new Date(scheduledDate),
      status: { $in: ['scheduled', 'confirmed'] }
    });
    
    if (existing) {
      return res.status(400).json({ success: false, message: 'You already have an appointment at this hospital on this date' });
    }
    
    const appointment = await DonationAppointment.create({
      userId: req.user.id,
      hospitalId,
      postId,
      bloodGroup,
      scheduledDate,
      scheduledTime,
      notes,
      userInfo: {
        name: user.name,
        phone: user.phone,
        email: user.email
      },
      hospitalInfo: {
        name: hospital.hospitalName,
        address: hospital.address,
        phone: hospital.phone
      }
    });
    
    await Notification.create({
      userId: req.user.id,
      userModel: 'PublicUser',
      title: 'Appointment Confirmed',
      message: `Your blood donation appointment at ${hospital.hospitalName} is scheduled`,
      type: 'appointment',
      relatedEntity: { model: 'DonationAppointment', id: appointment._id }
    });
    
    res.status(201).json({ success: true, appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMyAppointments = async (req, res) => {
  try {
    const { status } = req.query;
    const query = { userId: req.user.id };
    if (status) query.status = status;
    
    const appointments = await DonationAppointment.find(query)
      .sort({ scheduledDate: 1 })
      .lean();
    
    res.status(200).json({ success: true, appointments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.cancelAppointment = async (req, res) => {
  try {
    const { reason } = req.body;
    const appointment = await DonationAppointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    
    if (appointment.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    
    appointment.status = 'cancelled';
    appointment.cancellationReason = reason;
    await appointment.save();
    
    res.status(200).json({ success: true, appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getHospitalAppointments = async (req, res) => {
  try {
    const appointments = await DonationAppointment.find({ hospitalId: req.user.hospitalId })
      .sort({ scheduledDate: 1 })
      .lean();
    
    res.status(200).json({ success: true, appointments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { status, donationCompleted } = req.body;
    const appointment = await DonationAppointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    
    appointment.status = status;
    if (donationCompleted !== undefined) {
      appointment.donationCompleted = donationCompleted;
      if (donationCompleted) {
        appointment.completedAt = new Date();
      }
    }
    
    await appointment.save();
    
    await Notification.create({
      userId: appointment.userId,
      userModel: 'PublicUser',
      title: 'Appointment Updated',
      message: `Your appointment status has been updated to ${status}`,
      type: 'appointment',
      relatedEntity: { model: 'DonationAppointment', id: appointment._id }
    });
    
    res.status(200).json({ success: true, appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
