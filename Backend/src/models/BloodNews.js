const mongoose = require('mongoose');

const bloodNewsSchema = new mongoose.Schema({
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Hospital ID is required']
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: 1000
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'ALL'],
    required: [true, 'Blood group is required']
  },
  urgencyLevel: {
    type: String,
    enum: ['low', 'medium'],
    default: 'low'
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
    address: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    }
  },
  contactInfo: {
    phone: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: false
    }
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  viewCount: {
    type: Number,
    default: 0
  },
  responseCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

bloodNewsSchema.index({ location: '2dsphere' });
bloodNewsSchema.index({ bloodGroup: 1, isActive: 1 });
bloodNewsSchema.index({ expiresAt: 1 });
bloodNewsSchema.index({ hospitalId: 1 });

bloodNewsSchema.pre('save', function(next) {
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
  next();
});

bloodNewsSchema.methods.incrementView = function() {
  this.viewCount += 1;
  return this.save();
};

bloodNewsSchema.methods.incrementResponse = function() {
  this.responseCount += 1;
  return this.save();
};

bloodNewsSchema.statics.getActiveNews = function(filters = {}) {
  return this.find({
    isActive: true,
    expiresAt: { $gt: new Date() },
    ...filters
  }).populate('hospitalId', 'hospitalName email phone location');
};

module.exports = mongoose.model('BloodNews', bloodNewsSchema);
