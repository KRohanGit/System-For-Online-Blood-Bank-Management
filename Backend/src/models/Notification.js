/**
 * Notification Model
 * 
 * Purpose: Store and manage user notifications for blood camps, bookings, and system announcements
 * 
 * Academic Context:
 * - Implements pub-sub pattern for real-time notifications
 * - Supports different notification types for different contexts
 * - Tracks read/unread status for user experience
 * - Can be extended for push notifications/email/SMS
 */

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Recipient
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'userModel'
  },
  
  userModel: {
    type: String,
    required: true,
    enum: ['User', 'PublicUser'], // Can notify any user type
    default: 'PublicUser'
  },
  
  // Notification content
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    trim: true,
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  
  // Notification type and category
  type: {
    type: String,
    required: true,
    enum: [
      'camp_booking',           // Booking confirmation
      'camp_reminder',          // Upcoming camp reminder
      'camp_cancellation',      // Camp cancelled
      'camp_update',            // Camp details updated
      'camp_completion',        // Camp completed
      'booking_cancelled',      // Your booking was cancelled
      'new_camp',              // New camp in your area
      'announcement',          // General announcement
      'system',                // System notifications
      'blood_request',         // Urgent blood request
      'verification_status'    // Document verification update
    ]
  },
  
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Related entities (optional references for deep linking)
  relatedEntity: {
    entityType: {
      type: String,
      enum: ['BloodCamp', 'CampBooking', 'BloodRequest', 'System', null],
      default: null
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    }
  },
  
  // Action button (optional - for actionable notifications)
  actionButton: {
    text: {
      type: String,
      default: null
    },
    url: {
      type: String,
      default: null
    }
  },
  
  // Notification state
  isRead: {
    type: Boolean,
    default: false
  },
  
  readAt: {
    type: Date,
    default: null
  },
  
  // Delivery channels
  channels: {
    inApp: {
      type: Boolean,
      default: true
    },
    email: {
      type: Boolean,
      default: false
    },
    sms: {
      type: Boolean,
      default: false
    },
    push: {
      type: Boolean,
      default: false
    }
  },
  
  // Delivery status
  deliveryStatus: {
    inApp: {
      type: String,
      enum: ['pending', 'delivered', 'failed'],
      default: 'delivered'
    },
    email: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'not_sent'],
      default: 'not_sent'
    },
    sms: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'not_sent'],
      default: 'not_sent'
    }
  },
  
  // Expiration (auto-delete old notifications)
  expiresAt: {
    type: Date,
    default: function() {
      // Default: notifications expire after 30 days
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
  },
  
  // Metadata
  metadata: {
    type: Map,
    of: String,
    default: {}
  }
  
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Indexes for efficient queries
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ priority: 1, isRead: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for auto-deletion

// Virtual to check if notification is expired
notificationSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < Date.now();
});

// Method to mark as read
notificationSchema.methods.markAsRead = function() {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
  }
  return this.save();
};

// Method to mark as unread
notificationSchema.methods.markAsUnread = function() {
  this.isRead = false;
  this.readAt = null;
  return this.save();
};

// Static method to create notification
notificationSchema.statics.createNotification = async function(notificationData) {
  const notification = new this(notificationData);
  await notification.save();
  
  // Here you can add logic to trigger real-time events (Socket.io, etc.)
  // For now, we just return the created notification
  return notification;
};

// Static method to get user's unread count
notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({ userId, isRead: false });
};

// Static method to get user notifications with pagination
notificationSchema.statics.getUserNotifications = function(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    type = null,
    isRead = null,
    priority = null
  } = options;
  
  const query = { userId };
  
  if (type) query.type = type;
  if (isRead !== null) query.isRead = isRead;
  if (priority) query.priority = priority;
  
  const skip = (page - 1) * limit;
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('relatedEntity.entityId');
};

// Static method to mark all as read for a user
notificationSchema.statics.markAllAsRead = async function(userId) {
  return this.updateMany(
    { userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
};

// Static method to delete all read notifications for a user
notificationSchema.statics.deleteAllRead = function(userId) {
  return this.deleteMany({ userId, isRead: true });
};

// Pre-save hook to validate notification
notificationSchema.pre('save', function(next) {
  // If marked as read, ensure readAt is set
  if (this.isRead && !this.readAt) {
    this.readAt = new Date();
  }
  
  // If marked as unread, clear readAt
  if (!this.isRead && this.readAt) {
    this.readAt = null;
  }
  
  next();
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
