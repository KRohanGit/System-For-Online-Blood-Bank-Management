const mongoose = require('mongoose');

const emergencyMessageSchema = new mongoose.Schema({
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  donorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PublicUser',
    required: true
  },
  message: {
    type: String,
    required: true
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: true
  },
  readStatus: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('EmergencyMessage', emergencyMessageSchema);
