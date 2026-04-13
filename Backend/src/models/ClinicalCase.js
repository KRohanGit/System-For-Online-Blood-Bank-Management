const mongoose = require('mongoose');
const { encryptText, decryptText } = require('../utils/fieldEncryption');

const { Schema } = mongoose;

const disallowedIdentityKeys = [
  'patientname',
  'fullname',
  'phone',
  'email',
  'aadhar',
  'ssn',
  'address',
  'mrn',
  'patientid'
];

const vitalsSchema = new Schema({
  systolicBP: { type: Number, default: null },
  diastolicBP: { type: Number, default: null },
  heartRate: { type: Number, default: null }
}, { _id: false });

const anonymizedPatientFeaturesSchema = new Schema({
  age: { type: Number, required: true, min: 0, max: 120 },
  gender: { type: String, enum: ['male', 'female', 'other', 'unknown'], default: 'unknown' },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: true
  },
  hemoglobinLevel: { type: Number, min: 0, max: 30, required: true },
  bloodLossEstimate: { type: Number, min: 0, max: 20000, required: true },
  conditionType: {
    type: String,
    enum: ['trauma', 'surgery', 'postpartum', 'oncology', 'anemia', 'internal_bleeding', 'other'],
    required: true
  },
  vitals: { type: vitalsSchema, default: {} },
  additionalClinicalContext: {
    type: String,
    default: null,
    set: encryptText,
    get: decryptText
  }
}, { _id: false });

const treatmentSchema = new Schema({
  unitsGiven: { type: Number, min: 0, max: 20, required: true },
  bloodTypeUsed: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: true
  },
  timing: {
    type: String,
    enum: ['immediate', 'within_1_hour', 'within_3_hours', 'within_6_hours', 'delayed', 'unknown'],
    default: 'unknown'
  }
}, { _id: false });

const outcomeSchema = new Schema({
  survival: { type: Boolean, default: null },
  recoveryTime: { type: Number, min: 0, default: null },
  complications: {
    type: [String],
    default: [],
    set: (values) => Array.isArray(values) ? values.map((v) => encryptText(v)) : [],
    get: (values) => Array.isArray(values) ? values.map((v) => decryptText(v)) : []
  }
}, { _id: false });

const clinicalCaseSchema = new Schema({
  caseId: { type: String, required: true, unique: true, index: true },
  anonymizedPatientFeatures: { type: anonymizedPatientFeaturesSchema, required: true },
  treatment: { type: treatmentSchema, required: true },
  outcome: { type: outcomeSchema, default: {} },
  hospitalId: {
    type: Schema.Types.ObjectId,
    ref: 'HospitalProfile',
    required: true,
    index: true
  },
  doctorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  aiInsights: {
    recommendationSummary: { type: String, default: null },
    confidenceScore: { type: Number, min: 0, max: 1, default: null },
    predictedSurvivalProbability: { type: Number, min: 0, max: 1, default: null },
    predictedRiskLevel: { type: String, default: null }
  },
  timestamp: { type: Date, default: Date.now, index: true }
}, {
  timestamps: true,
  strict: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

clinicalCaseSchema.pre('validate', function(next) {
  const patientPayload = this.anonymizedPatientFeatures ? this.anonymizedPatientFeatures.toObject?.() || this.anonymizedPatientFeatures : {};
  const payloadKeys = Object.keys(patientPayload || {}).map((key) => key.toLowerCase());

  const hasIdentityLeak = payloadKeys.some((key) => disallowedIdentityKeys.includes(key));
  if (hasIdentityLeak) {
    return next(new Error('Patient identity attributes are not allowed in ClinicalCase records'));
  }

  return next();
});

clinicalCaseSchema.index({ hospitalId: 1, timestamp: -1 });
clinicalCaseSchema.index({ 'anonymizedPatientFeatures.conditionType': 1, timestamp: -1 });
clinicalCaseSchema.index({ 'anonymizedPatientFeatures.bloodGroup': 1, timestamp: -1 });

module.exports = mongoose.model('ClinicalCase', clinicalCaseSchema);
