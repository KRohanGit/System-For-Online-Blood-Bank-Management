const mongoose = require('mongoose');

const donorCandidateSchema = new mongoose.Schema({
  donorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PublicUser',
    required: true
  },
  score: { type: Number, required: true },
  distanceKm: { type: Number, default: null },
  responseHistoryScore: { type: Number, default: 0.5 },
  availabilityProbability: { type: Number, default: 0.5 },
  lastDonationDays: { type: Number, default: null },
  status: {
    type: String,
    enum: ['QUEUED', 'NOTIFIED', 'ACCEPTED', 'REJECTED', 'TIMEOUT', 'SKIPPED'],
    default: 'QUEUED'
  },
  notifiedAt: { type: Date, default: null },
  respondedAt: { type: Date, default: null }
}, { _id: false });

const chainResponseSchema = new mongoose.Schema({
  donorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PublicUser',
    required: true
  },
  decision: {
    type: String,
    enum: ['ACCEPT', 'REJECT', 'TIMEOUT'],
    required: true
  },
  respondedAt: { type: Date, default: Date.now },
  scoreSnapshot: { type: Number, default: null }
}, { _id: false });

const timelineEntrySchema = new mongoose.Schema({
  status: { type: String, required: true },
  message: { type: String, required: true },
  donorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PublicUser',
    default: null
  },
  ts: { type: Date, default: Date.now }
}, { _id: false });

const peerEmergencyChainRequestSchema = new mongoose.Schema({
  requesterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PublicUser',
    required: true
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    },
    address: { type: String, default: null },
    city: { type: String, default: null },
    state: { type: String, default: null }
  },
  urgency: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'HIGH'
  },
  unitsNeeded: {
    type: Number,
    required: true,
    min: 1,
    max: 20
  },
  status: {
    type: String,
    enum: ['SEARCHING', 'NOTIFYING', 'ACCEPTED', 'ESCALATED', 'CLOSED'],
    default: 'SEARCHING'
  },
  aiMessage: { type: String, default: 'Finding best donors...' },
  candidateDonors: {
    type: [donorCandidateSchema],
    default: []
  },
  currentDonorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PublicUser',
    default: null
  },
  currentDonorExpiresAt: { type: Date, default: null },
  acceptedDonorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PublicUser',
    default: null
  },
  responses: {
    type: [chainResponseSchema],
    default: []
  },
  timeline: {
    type: [timelineEntrySchema],
    default: []
  },
  escalation: {
    hospitalAlerted: { type: Boolean, default: false },
    adminAlerted: { type: Boolean, default: false },
    triggeredAt: { type: Date, default: null },
    hospitals: {
      type: [{
        hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'HospitalProfile' },
        hospitalName: { type: String },
        adminEmail: { type: String }
      }],
      default: []
    }
  },
  blockchain: {
    requestTxId: { type: String, default: null },
    responseTxIds: { type: [String], default: [] }
  },
  chainStartedAt: { type: Date, default: Date.now },
  chainEndedAt: { type: Date, default: null }
}, { timestamps: true });

peerEmergencyChainRequestSchema.index({ requesterId: 1, createdAt: -1 });
peerEmergencyChainRequestSchema.index({ status: 1, createdAt: -1 });
peerEmergencyChainRequestSchema.index({ currentDonorId: 1, status: 1 });
peerEmergencyChainRequestSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('PeerEmergencyChainRequest', peerEmergencyChainRequestSchema);
