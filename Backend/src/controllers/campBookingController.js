/**
 * Camp Booking Controller
 * 
 * Purpose: Handle blood camp booking operations for public users
 * 
 * Academic Context:
 * - Implements transaction-like operations for booking slots
 * - Prevents race conditions in concurrent bookings
 * - Enforces business rules (no double booking, capacity limits)
 */

const CampBooking = require('../models/CampBooking');
const BloodCamp = require('../models/BloodCamp');
const Notification = require('../models/Notification');
const PublicUser = require('../models/PublicUser');

/**
 * Book a blood camp slot
 * Access: Verified PUBLIC_USER only
 */
exports.bookCamp = async (req, res) => {
  try {
    const userId = req.userId;
    const { campId } = req.params;
    const { notes } = req.body;

    console.log('Booking camp - User:', userId, 'Camp:', campId);

    // Verify user is a verified public user
    const user = await PublicUser.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.verificationStatus !== 'verified') {
      return res.status(403).json({
        success: false,
        message: 'Only verified users can book blood camps'
      });
    }

    // Check if camp exists and is bookable
    const camp = await BloodCamp.findById(campId);

    if (!camp) {
      return res.status(404).json({
        success: false,
        message: 'Blood camp not found'
      });
    }

    if (!camp.canBeBooked()) {
      return res.status(400).json({
        success: false,
        message: 'This camp cannot be booked. It may be full, cancelled, or in the past.'
      });
    }

    // Check if user already has a booking for this camp
    const existingBooking = await CampBooking.findOne({
      campId,
      userId,
      status: { $in: ['confirmed', 'pending'] }
    });

    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: 'You have already booked this camp'
      });
    }

    // Check if camp still has available slots
    if (camp.bookedSlots >= camp.capacity) {
      return res.status(400).json({
        success: false,
        message: 'Camp is fully booked'
      });
    }

    // Create booking
    const booking = new CampBooking({
      campId,
      userId,
      userInfo: {
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        bloodGroup: user.bloodGroup || 'Unknown'
      },
      notes
    });

    await booking.save();

    // Increment booked slots atomically to prevent race conditions
    await BloodCamp.findByIdAndUpdate(
      campId,
      { $inc: { bookedSlots: 1 } },
      { new: true }
    );

    // Send confirmation notification
    await Notification.createNotification({
      userId,
      userModel: 'PublicUser',
      title: 'Booking Confirmed',
      message: `Your booking for "${camp.title}" on ${new Date(camp.dateTime).toLocaleDateString()} is confirmed!`,
      type: 'camp_booking',
      priority: 'high',
      relatedEntity: {
        entityType: 'CampBooking',
        entityId: booking._id
      },
      actionButton: {
        text: 'View Booking',
        url: `/my-bookings/${booking._id}`
      }
    });

    res.status(201).json({
      success: true,
      message: 'Camp booked successfully',
      data: { booking }
    });
  } catch (error) {
    console.error('Error booking camp:', error);
    
    // Handle duplicate booking error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already booked this camp'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to book camp',
      error: error.message
    });
  }
};

/**
 * Cancel a booking
 * Access: PUBLIC_USER (own bookings only)
 */
exports.cancelBooking = async (req, res) => {
  try {
    const userId = req.userId;
    const { bookingId } = req.params;
    const { reason } = req.body;

    const booking = await CampBooking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user owns this booking
    if (booking.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to cancel this booking'
      });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already cancelled'
      });
    }

    if (booking.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a completed booking'
      });
    }

    // Get camp details
    const camp = await BloodCamp.findById(booking.campId);

    if (!camp) {
      return res.status(404).json({
        success: false,
        message: 'Associated camp not found'
      });
    }

    // Check if camp date is in the past
    if (new Date(camp.dateTime) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel booking for a past camp'
      });
    }

    // Cancel booking
    booking.cancel(reason || 'Cancelled by user', 'user');
    await booking.save();

    // Decrement booked slots atomically
    await BloodCamp.findByIdAndUpdate(
      booking.campId,
      { $inc: { bookedSlots: -1 } }
    );

    // Send cancellation notification
    await Notification.createNotification({
      userId,
      userModel: 'PublicUser',
      title: 'Booking Cancelled',
      message: `Your booking for "${camp.title}" has been cancelled successfully.`,
      type: 'booking_cancelled',
      priority: 'medium',
      relatedEntity: {
        entityType: 'CampBooking',
        entityId: booking._id
      }
    });

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      data: { booking }
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel booking',
      error: error.message
    });
  }
};

/**
 * Get user's bookings
 * Access: PUBLIC_USER
 */
exports.getMyBookings = async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 10, status } = req.query;

    const skip = (page - 1) * limit;
    const query = { userId };

    if (status) {
      query.status = status;
    }

    const bookings = await CampBooking.find(query)
      .populate('campId')
      .sort({ bookingTime: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await CampBooking.countDocuments(query);

    res.status(200).json({
      success: true,
      message: 'Your bookings retrieved successfully',
      data: {
        bookings,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error getting user bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve bookings',
      error: error.message
    });
  }
};

/**
 * Get single booking details
 * Access: PUBLIC_USER (own bookings) or Camp organizer
 */
exports.getBookingById = async (req, res) => {
  try {
    const userId = req.userId;
    const { bookingId } = req.params;

    const booking = await CampBooking.findById(bookingId)
      .populate('campId')
      .populate('userId', 'fullName email phone bloodGroup');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check authorization - user owns booking or user is camp organizer
    const isOwner = booking.userId._id.toString() === userId.toString();
    const isOrganizer = booking.campId && booking.campId.organizerId.toString() === userId.toString();

    if (!isOwner && !isOrganizer) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this booking'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Booking retrieved successfully',
      data: { booking }
    });
  } catch (error) {
    console.error('Error getting booking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve booking',
      error: error.message
    });
  }
};

/**
 * Get all bookings for a specific camp
 * Access: Camp organizer only
 */
exports.getCampBookings = async (req, res) => {
  try {
    const userId = req.userId;
    const { campId } = req.params;
    const { page = 1, limit = 50, status } = req.query;

    // Check if user is the camp organizer
    const camp = await BloodCamp.findById(campId);

    if (!camp) {
      return res.status(404).json({
        success: false,
        message: 'Camp not found'
      });
    }

    if (camp.organizerId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this camp\'s bookings'
      });
    }

    const skip = (page - 1) * limit;
    const query = { campId };

    if (status) {
      query.status = status;
    }

    const bookings = await CampBooking.find(query)
      .populate('userId', 'fullName email phone bloodGroup')
      .sort({ bookingTime: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await CampBooking.countDocuments(query);

    // Get booking statistics
    const stats = await CampBooking.aggregate([
      { $match: { campId: camp._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      message: 'Camp bookings retrieved successfully',
      data: {
        bookings,
        stats,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error getting camp bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve camp bookings',
      error: error.message
    });
  }
};

/**
 * Check-in a user for a camp
 * Access: Camp organizer only
 */
exports.checkInBooking = async (req, res) => {
  try {
    const userId = req.userId;
    const { bookingId } = req.params;

    const booking = await CampBooking.findById(bookingId).populate('campId');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user is the camp organizer
    if (booking.campId.organizerId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to check in this booking'
      });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Only confirmed bookings can be checked in'
      });
    }

    if (booking.checkedIn) {
      return res.status(400).json({
        success: false,
        message: 'User is already checked in'
      });
    }

    // Check in the booking
    booking.checkIn();
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'User checked in successfully',
      data: { booking }
    });
  } catch (error) {
    console.error('Error checking in booking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check in booking',
      error: error.message
    });
  }
};

/**
 * Mark booking as completed (donation done)
 * Access: Camp organizer only
 */
exports.completeBooking = async (req, res) => {
  try {
    const userId = req.userId;
    const { bookingId } = req.params;

    const booking = await CampBooking.findById(bookingId).populate('campId');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user is the camp organizer
    if (booking.campId.organizerId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to complete this booking'
      });
    }

    if (booking.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already completed'
      });
    }

    // Complete the booking
    booking.complete();
    await booking.save();

    // Send completion notification
    await Notification.createNotification({
      userId: booking.userId,
      userModel: 'PublicUser',
      title: 'Donation Completed',
      message: `Thank you for your donation at "${booking.campId.title}"! Your contribution will save lives.`,
      type: 'camp_completion',
      priority: 'high',
      relatedEntity: {
        entityType: 'CampBooking',
        entityId: booking._id
      }
    });

    res.status(200).json({
      success: true,
      message: 'Booking marked as completed',
      data: { booking }
    });
  } catch (error) {
    console.error('Error completing booking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete booking',
      error: error.message
    });
  }
};

module.exports = exports;
