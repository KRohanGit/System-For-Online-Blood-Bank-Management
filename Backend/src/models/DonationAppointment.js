const mongoose = require('mongoose');

const donationAppointmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PublicUser',
    required: true
  },
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HospitalProfile',
    required: true
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CommunityPost'
  },
  bloodGroup: {
    type: String,
    required: true,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  scheduledTime: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'completed', 'cancelled', 'missed'],
    default: 'scheduled'
  },
  userInfo: {
    name: String,
    phone: String,
    email: String
  },
  hospitalInfo: {
    name: String,
    address: String,
    phone: String
  },
  notes: String,
  cancellationReason: String,
  donationCompleted: {
    type: Boolean,
    default: false
  },
  completedAt: Date
}, {
  timestamps: true
});

donationAppointmentSchema.index({ userId: 1, scheduledDate: -1 });
donationAppointmentSchema.index({ hospitalId: 1, scheduledDate: 1 });
donationAppointmentSchema.index({ status: 1, scheduledDate: 1 });

module.exports = mongoose.model('DonationAppointment', donationAppointmentSchema);
