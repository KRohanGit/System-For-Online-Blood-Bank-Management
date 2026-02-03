/**
 * Notification Controller
 * 
 * Purpose: Handle user notification operations
 * 
 * Academic Context:
 * - Implements notification center functionality
 * - Provides pagination for large notification lists
 * - Supports bulk operations (mark all as read, delete all)
 */

const Notification = require('../models/Notification');

/**
 * Get user's notifications
 * Access: Authenticated users
 */
exports.getMyNotifications = async (req, res) => {
  try {
    const userId = req.userId;
    const {
      page = 1,
      limit = 20,
      type,
      isRead,
      priority
    } = req.query;

    const skip = (page - 1) * limit;
    const query = { userId };

    // Apply filters
    if (type) query.type = type;
    if (isRead !== undefined) query.isRead = isRead === 'true';
    if (priority) query.priority = priority;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      userId,
      isRead: false
    });

    res.status(200).json({
      success: true,
      message: 'Notifications retrieved successfully',
      data: {
        notifications,
        unreadCount,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve notifications',
      error: error.message
    });
  }
};

/**
 * Get unread notification count
 * Access: Authenticated users
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.userId;

    const count = await Notification.getUnreadCount(userId);

    res.status(200).json({
      success: true,
      data: { unreadCount: count }
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unread count',
      error: error.message
    });
  }
};

/**
 * Mark notification as read
 * Access: Authenticated users (own notifications only)
 */
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.userId;
    const { notificationId } = req.params;

    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check if user owns this notification
    if (notification.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to modify this notification'
      });
    }

    await notification.markAsRead();

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: { notification }
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
};

/**
 * Mark notification as unread
 * Access: Authenticated users (own notifications only)
 */
exports.markAsUnread = async (req, res) => {
  try {
    const userId = req.userId;
    const { notificationId } = req.params;

    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check if user owns this notification
    if (notification.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to modify this notification'
      });
    }

    await notification.markAsUnread();

    res.status(200).json({
      success: true,
      message: 'Notification marked as unread',
      data: { notification }
    });
  } catch (error) {
    console.error('Error marking notification as unread:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as unread',
      error: error.message
    });
  }
};

/**
 * Mark all notifications as read
 * Access: Authenticated users
 */
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.userId;

    const result = await Notification.markAllAsRead(userId);

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      data: {
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: error.message
    });
  }
};

/**
 * Delete a notification
 * Access: Authenticated users (own notifications only)
 */
exports.deleteNotification = async (req, res) => {
  try {
    const userId = req.userId;
    const { notificationId } = req.params;

    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check if user owns this notification
    if (notification.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this notification'
      });
    }

    await notification.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: error.message
    });
  }
};

/**
 * Delete all read notifications
 * Access: Authenticated users
 */
exports.deleteAllRead = async (req, res) => {
  try {
    const userId = req.userId;

    const result = await Notification.deleteAllRead(userId);

    res.status(200).json({
      success: true,
      message: 'All read notifications deleted',
      data: {
        deletedCount: result.deletedCount
      }
    });
  } catch (error) {
    console.error('Error deleting read notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete read notifications',
      error: error.message
    });
  }
};

/**
 * Create a test notification (for development/testing)
 * Access: Authenticated users
 */
exports.createTestNotification = async (req, res) => {
  try {
    const userId = req.userId;
    const userModel = req.userRole === 'PUBLIC_USER' ? 'PublicUser' : 'User';

    const notification = await Notification.createNotification({
      userId,
      userModel,
      title: 'Test Notification',
      message: 'This is a test notification created at ' + new Date().toLocaleString(),
      type: 'system',
      priority: 'low'
    });

    res.status(201).json({
      success: true,
      message: 'Test notification created',
      data: { notification }
    });
  } catch (error) {
    console.error('Error creating test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create test notification',
      error: error.message
    });
  }
};

module.exports = exports;
