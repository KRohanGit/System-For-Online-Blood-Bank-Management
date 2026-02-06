const mongoose = require('mongoose');

const doctorClinicalDecisionSchema = new mongoose.Schema({
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  decisionType: {
    type: String,
    enum: ['validation', 'advisory', 'consult', 'override', 'approval', 'rejection'],
    required: true,
    index: true
  },
  actionType: {
    type: String,
    enum: ['accepted', 'overridden', 'rejected', 'deferred', 'approved'],
    required: true,
    index: true
  },
  caseType: {
    type: String,
    enum: ['blood_unit_validation', 'transfusion_advisory', 'emergency_consult', 'camp_approval', 'inventory_advisory'],
    required: true
  },
  caseId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  justification: {
    type: String,
    required: function() {
      return this.actionType === 'overridden' || this.actionType === 'rejected';
    }
  },
  patientContext: {
    bloodGroup: String,
    componentType: String,
    units: Number,
    urgencyLevel: {
      type: String,
      enum: ['critical', 'urgent', 'moderate', 'routine']
    }
  },
  protocolReference: {
    protocolId: String,
    protocolName: String,
    thresholds: mongoose.Schema.Types.Mixed
  },
  emergencyTag: {
    type: Boolean,
    default: false,
    index: true
  },
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HospitalProfile'
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  outcome: {
    status: String,
    notes: String,
    followUpRequired: Boolean
  }
}, {
  timestamps: true
});

doctorClinicalDecisionSchema.index({ doctorId: 1, timestamp: -1 });
doctorClinicalDecisionSchema.index({ decisionType: 1, actionType: 1 });
doctorClinicalDecisionSchema.index({ emergencyTag: 1, timestamp: -1 });
doctorClinicalDecisionSchema.index({ hospitalId: 1, timestamp: -1 });

module.exports = mongoose.model('DoctorClinicalDecision', doctorClinicalDecisionSchema);
