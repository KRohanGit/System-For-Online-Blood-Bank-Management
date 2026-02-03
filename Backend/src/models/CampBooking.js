/**
 * CampBooking Model
 * 
 * Purpose: Track blood camp bookings by public users
 * 
 * Academic Context:
 * - Implements booking state machine (pending → confirmed/cancelled/completed)
 * - Prevents double booking through compound unique index
 * - Tracks user participation history for analytics
 */

const mongoose = require('mongoose');

const campBookingSchema = new mongoose.Schema({
  // Camp reference
  campId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BloodCamp',
    required: [true, 'Camp ID is required']
  },
  
  // User reference - only PUBLIC_USER can book camps
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PublicUser',
    required: [true, 'User ID is required']
  },
  
  // Booking status lifecycle
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no-show'],
    default: 'confirmed' // Auto-confirm on booking
  },
  
  // User information at time of booking (for historical records)
  userInfo: {
    fullName: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'],
      default: 'Unknown'
    }
  },
  
  // Booking timestamps
  bookingTime: {
    type: Date,
    default: Date.now,
    required: true
  },
  
  confirmedAt: {
    type: Date,
    default: Date.now
  },
  
  cancelledAt: {
    type: Date,
    default: null
  },
  
  completedAt: {
    type: Date,
    default: null
  },
  
  // Cancellation details
  cancellationReason: {
    type: String,
    default: null
  },
  
  cancelledBy: {
    type: String,
    enum: ['user', 'organizer', 'system', null],
    default: null
  },
  
  // Check-in/out tracking
  checkedIn: {
    type: Boolean,
    default: false
  },
  
  checkInTime: {
    type: Date,
    default: null
  },
  
  // Donation completion
  donationCompleted: {
    type: Boolean,
    default: false
  },
  
  donationCompletedAt: {
    type: Date,
    default: null
  },
  
  // Additional notes
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
    default: null
  },
  
  // Reminder tracking
  reminderSent: {
    type: Boolean,
    default: false
  },
  
  reminderSentAt: {
    type: Date,
    default: null
  }
  
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Compound index to prevent duplicate bookings
// A user cannot book the same camp twice
campBookingSchema.index({ campId: 1, userId: 1 }, { unique: true });

// Index for querying bookings by user
campBookingSchema.index({ userId: 1, status: 1 });

// Index for querying bookings by camp
campBookingSchema.index({ campId: 1, status: 1 });

// Index for date-based queries
campBookingSchema.index({ bookingTime: -1 });

// Virtual to check if booking is active
campBookingSchema.virtual('isActive').get(function() {
  return this.status === 'confirmed' || this.status === 'pending';
});

// Method to cancel booking
campBookingSchema.methods.cancel = function(reason, cancelledBy = 'user') {
  if (this.status === 'cancelled' || this.status === 'completed') {
    throw new Error('Cannot cancel a booking that is already cancelled or completed');
  }
  
  this.status = 'cancelled';
  this.cancellationReason = reason;
  this.cancelledBy = cancelledBy;
  this.cancelledAt = new Date();
};

// Method to mark as completed
campBookingSchema.methods.complete = function() {
  if (this.status !== 'confirmed' && this.status !== 'pending') {
    throw new Error('Only confirmed or pending bookings can be completed');
  }
  
  this.status = 'completed';
  this.completedAt = new Date();
  this.donationCompleted = true;
  this.donationCompletedAt = new Date();
};

// Method to check in
campBookingSchema.methods.checkIn = function() {
  if (this.status !== 'confirmed') {
    throw new Error('Only confirmed bookings can be checked in');
  }
  
  this.checkedIn = true;
  this.checkInTime = new Date();
};

// Static method to get user's booking history
campBookingSchema.statics.getUserBookings = function(userId, status = null) {
  const query = { userId };
  if (status) {
    query.status = status;
  }
  return this.find(query)
    .populate('campId')
    .sort({ bookingTime: -1 });
};

// Static method to get camp's bookings
campBookingSchema.statics.getCampBookings = function(campId, status = null) {
  const query = { campId };
  if (status) {
    query.status = status;
  }
  return this.find(query)
    .populate('userId', 'fullName email phone bloodGroup')
    .sort({ bookingTime: -1 });
};

// Pre-save hook to validate booking status transitions
campBookingSchema.pre('save', function(next) {
  // If status is changing to confirmed, set confirmedAt
  if (this.isModified('status') && this.status === 'confirmed' && !this.confirmedAt) {
    this.confirmedAt = new Date();
  }
  next();
});

const CampBooking = mongoose.model('CampBooking', campBookingSchema);

module.exports = CampBooking;
