const mongoose = require('mongoose');

const communityPostSchema = new mongoose.Schema({
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'authorModel',
    required: true
  },
  authorModel: {
    type: String,
    required: true,
    enum: ['User', 'PublicUser', 'HospitalProfile']
  },
  authorName: { type: String, required: true },
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true },
  type: {
    type: String,
    enum: ['request', 'announcement', 'story', 'question'],
    default: 'request'
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Any']
  },
  urgency: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low'],
    default: 'medium'
  },
  // Verification fields for badge system
  source: {
    type: String,
    enum: ['hospital', 'camp', 'community'],
    default: 'community'
  },
  adminReviewed: {
    type: Boolean,
    default: false
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  campId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BloodCamp',
    default: null
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
    address: String,
    city: String,
    state: String
  },
  contactInfo: {
    phone: String,
    email: String
  },
  comments: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PublicUser',
      required: true
    },
    userName: { type: String, required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PublicUser'
  }],
  status: {
    type: String,
    enum: ['active', 'resolved', 'closed'],
    default: 'active'
  },
  expiresAt: Date
}, {
  timestamps: true
});

communityPostSchema.index({ 'location.coordinates': '2dsphere' });
communityPostSchema.index({ status: 1, createdAt: -1 });
communityPostSchema.index({ authorId: 1, createdAt: -1 });

communityPostSchema.statics.findNearby = function(longitude, latitude, radiusInKm = 50) {
  return this.find({
    'location.coordinates': {
      $near: {
        $geometry: { type: 'Point', coordinates: [longitude, latitude] },
        $maxDistance: radiusInKm * 1000
      }
    },
    status: 'active'
  });
};

module.exports = mongoose.model('CommunityPost', communityPostSchema);
