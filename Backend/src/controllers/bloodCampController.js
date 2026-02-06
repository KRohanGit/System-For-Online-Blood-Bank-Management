const BloodCamp = require('../models/BloodCamp');
const CampBooking = require('../models/CampBooking');
const Notification = require('../models/Notification');
const PublicUser = require('../models/PublicUser');
const User = require('../models/User');

exports.getAllCamps = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status = 'upcoming',
      sortBy = 'dateTime',
      sortOrder = 'asc'
    } = req.query;

    const skip = (page - 1) * limit;
    const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Build query
    const query = {
      isActive: true
    };

    if (status) {
      query.status = status;
    }

    // Only show future camps
    query.dateTime = { $gt: new Date() };

    const camps = await BloodCamp.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    const total = await BloodCamp.countDocuments(query);

    res.status(200).json({
      success: true,
      message: 'Blood camps retrieved successfully',
      data: {
        camps,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error getting blood camps:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve blood camps',
      error: error.message
    });
  }
};

/**
 * Get nearby blood camps using geospatial query
 * Access: Public (no authentication required)
 */
exports.getNearbyCamps = async (req, res) => {
  try {
    const { longitude, latitude, maxDistance = 50 } = req.query;

    // Validate coordinates
    if (!longitude || !latitude) {
      return res.status(400).json({
        success: false,
        message: 'Longitude and latitude are required'
      });
    }

    const long = parseFloat(longitude);
    const lat = parseFloat(latitude);

    if (isNaN(long) || isNaN(lat)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates'
      });
    }

    // Use geospatial query to find nearby camps
    const camps = await BloodCamp.find({
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [long, lat]
          },
          $maxDistance: parseFloat(maxDistance) * 1000 // Convert km to meters
        }
      },
      isActive: true,
      status: 'upcoming',
      dateTime: { $gt: new Date() }
    }).select('-__v');

    // Calculate distance for each camp
    const campsWithDistance = camps.map(camp => {
      const campLong = camp.location.coordinates[0];
      const campLat = camp.location.coordinates[1];
      
      // Haversine formula to calculate distance
      const R = 6371; // Earth's radius in km
      const dLat = (campLat - lat) * Math.PI / 180;
      const dLon = (campLong - long) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat * Math.PI / 180) * Math.cos(campLat * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;
      
      return {
        ...camp.toJSON(),
        distance: parseFloat(distance.toFixed(2))
      };
    });

    res.status(200).json({
      success: true,
      message: 'Nearby blood camps retrieved successfully',
      data: {
        camps: campsWithDistance,
        userLocation: { longitude: long, latitude: lat },
        searchRadius: maxDistance
      }
    });
  } catch (error) {
    console.error('Error getting nearby camps:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve nearby camps',
      error: error.message
    });
  }
};

/**
 * Get single blood camp by ID
 * Access: Public
 */
exports.getCampById = async (req, res) => {
  try {
    const { id } = req.params;

    const camp = await BloodCamp.findById(id)
      .populate('organizerId', 'fullName email phone hospitalName');

    if (!camp) {
      return res.status(404).json({
        success: false,
        message: 'Blood camp not found'
      });
    }

    // Get booking count
    const bookingCount = await CampBooking.countDocuments({
      campId: id,
      status: { $in: ['confirmed', 'pending'] }
    });

    res.status(200).json({
      success: true,
      message: 'Blood camp retrieved successfully',
      data: {
        camp: {
          ...camp.toJSON(),
          currentBookings: bookingCount
        }
      }
    });
  } catch (error) {
    console.error('Error getting camp by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve blood camp',
      error: error.message
    });
  }
};

/**
 * Create a new blood camp
 * Access: Verified PUBLIC_USER or HOSPITAL_ADMIN
 */
exports.createCamp = async (req, res) => {
  try {
    const userId = req.userId;
    const userRole = req.userRole;

    console.log('Creating camp - User:', userId, 'Role:', userRole);

    // Verify user permissions
    if (userRole === 'PUBLIC_USER') {
      const publicUser = await PublicUser.findById(userId);
      
      if (!publicUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (publicUser.verificationStatus !== 'verified') {
        return res.status(403).json({
          success: false,
          message: 'Only verified users can organize blood camps'
        });
      }
    } else if (userRole !== 'HOSPITAL_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Only verified public users or hospital admins can organize blood camps'
      });
    }

    // Extract camp data from request
    const {
      title,
      description,
      location,
      dateTime,
      duration,
      capacity,
      facilities,
      bloodGroupsNeeded,
      organizerContact
    } = req.body;

    // Validate required fields
    if (!title || !description || !location || !dateTime || !capacity) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Get organizer details
    let organizer, organizerModel;
    if (userRole === 'PUBLIC_USER') {
      organizer = await PublicUser.findById(userId);
      organizerModel = 'PublicUser';
    } else {
      organizer = await User.findById(userId);
      organizerModel = 'User';
    }

    // Create camp
    const camp = new BloodCamp({
      title,
      description,
      organizerId: userId,
      organizerModel,
      organizerName: organizer.fullName || organizer.hospitalName,
      organizerContact: organizerContact || {
        phone: organizer.phone,
        email: organizer.email
      },
      location,
      dateTime,
      duration: duration || { hours: 4 },
      capacity,
      facilities,
      bloodGroupsNeeded
    });

    await camp.save();

    // Send notification to nearby users (within 25km)
    // This is an async operation that doesn't need to block the response
    notifyNearbyUsers(camp).catch(err => console.error('Error notifying users:', err));

    res.status(201).json({
      success: true,
      message: 'Blood camp created successfully',
      data: { camp }
    });
  } catch (error) {
    console.error('Error creating blood camp:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create blood camp',
      error: error.message
    });
  }
};

/**
 * Update blood camp
 * Access: Camp organizer only
 */
exports.updateCamp = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const camp = await BloodCamp.findById(id);

    if (!camp) {
      return res.status(404).json({
        success: false,
        message: 'Blood camp not found'
      });
    }

    // Check if user is the organizer
    if (camp.organizerId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this camp'
      });
    }

    // Prevent updates to completed or cancelled camps
    if (camp.status === 'completed' || camp.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update completed or cancelled camps'
      });
    }

    // Update allowed fields
    const allowedUpdates = [
      'title', 'description', 'location', 'dateTime', 'duration',
      'capacity', 'facilities', 'bloodGroupsNeeded', 'organizerContact'
    ];

    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    Object.assign(camp, updates);
    await camp.save();

    // Notify all booked users about the update
    notifyCampBookings(id, 'camp_update', 'Camp Updated', 
      `The blood camp "${camp.title}" has been updated. Please check the new details.`)
      .catch(err => console.error('Error notifying bookings:', err));

    res.status(200).json({
      success: true,
      message: 'Blood camp updated successfully',
      data: { camp }
    });
  } catch (error) {
    console.error('Error updating blood camp:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update blood camp',
      error: error.message
    });
  }
};

/**
 * Cancel blood camp
 * Access: Camp organizer only
 */
exports.cancelCamp = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const { reason } = req.body;

    const camp = await BloodCamp.findById(id);

    if (!camp) {
      return res.status(404).json({
        success: false,
        message: 'Blood camp not found'
      });
    }

    // Check if user is the organizer
    if (camp.organizerId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to cancel this camp'
      });
    }

    if (camp.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Camp is already cancelled'
      });
    }

    if (camp.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a completed camp'
      });
    }

    // Cancel camp
    camp.status = 'cancelled';
    camp.cancellationReason = reason || 'Not specified';
    camp.cancelledAt = new Date();
    await camp.save();

    // Cancel all bookings and notify users
    const bookings = await CampBooking.find({
      campId: id,
      status: { $in: ['confirmed', 'pending'] }
    });

    for (const booking of bookings) {
      booking.cancel(camp.cancellationReason, 'organizer');
      await booking.save();

      // Send cancellation notification
      await Notification.createNotification({
        userId: booking.userId,
        userModel: 'PublicUser',
        title: 'Camp Cancelled',
        message: `The blood camp "${camp.title}" scheduled for ${new Date(camp.dateTime).toLocaleDateString()} has been cancelled. Reason: ${camp.cancellationReason}`,
        type: 'camp_cancellation',
        priority: 'high',
        relatedEntity: {
          entityType: 'BloodCamp',
          entityId: camp._id
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Blood camp cancelled successfully',
      data: {
        camp,
        cancelledBookings: bookings.length
      }
    });
  } catch (error) {
    console.error('Error cancelling blood camp:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel blood camp',
      error: error.message
    });
  }
};

/**
 * Delete blood camp (soft delete)
 * Access: Camp organizer only
 */
exports.deleteCamp = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const camp = await BloodCamp.findById(id);

    if (!camp) {
      return res.status(404).json({
        success: false,
        message: 'Blood camp not found'
      });
    }

    // Check if user is the organizer
    if (camp.organizerId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this camp'
      });
    }

    // Check if camp has bookings
    const bookingCount = await CampBooking.countDocuments({
      campId: id,
      status: { $in: ['confirmed', 'pending'] }
    });

    if (bookingCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete camp with active bookings. Please cancel the camp instead.'
      });
    }

    // Soft delete
    camp.isActive = false;
    await camp.save();

    res.status(200).json({
      success: true,
      message: 'Blood camp deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting blood camp:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete blood camp',
      error: error.message
    });
  }
};

/**
 * Get camps organized by the logged-in user
 * Access: Authenticated users (PUBLIC_USER or HOSPITAL_ADMIN)
 */
exports.getMyCamps = async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 10, status } = req.query;

    const skip = (page - 1) * limit;
    const query = { organizerId: userId };

    if (status) {
      query.status = status;
    }

    const camps = await BloodCamp.find(query)
      .sort({ dateTime: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    const total = await BloodCamp.countDocuments(query);

    res.status(200).json({
      success: true,
      message: 'Your camps retrieved successfully',
      data: {
        camps,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error getting my camps:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve your camps',
      error: error.message
    });
  }
};

// ============= Helper Functions =============

/**
 * Notify nearby users about new camp
 */
async function notifyNearbyUsers(camp) {
  try {
    const nearbyUsers = await PublicUser.find({
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: camp.location.coordinates
          },
          $maxDistance: 25000 // 25km in meters
        }
      },
      verificationStatus: 'verified',
      isActive: true
    }).select('_id');

    const notifications = nearbyUsers.map(user => ({
      userId: user._id,
      userModel: 'PublicUser',
      title: 'New Blood Camp Nearby',
      message: `A new blood donation camp "${camp.title}" is organized near you on ${new Date(camp.dateTime).toLocaleDateString()}.`,
      type: 'new_camp',
      priority: 'medium',
      relatedEntity: {
        entityType: 'BloodCamp',
        entityId: camp._id
      },
      actionButton: {
        text: 'View Camp',
        url: `/camps/${camp._id}`
      }
    }));

    await Notification.insertMany(notifications);
    console.log(`Notified ${notifications.length} nearby users about new camp`);
  } catch (error) {
    console.error('Error notifying nearby users:', error);
  }
}

/**
 * Notify all users with bookings for a camp
 */
async function notifyCampBookings(campId, type, title, message) {
  try {
    const bookings = await CampBooking.find({
      campId,
      status: { $in: ['confirmed', 'pending'] }
    }).select('userId');

    const notifications = bookings.map(booking => ({
      userId: booking.userId,
      userModel: 'PublicUser',
      title,
      message,
      type,
      priority: 'high',
      relatedEntity: {
        entityType: 'BloodCamp',
        entityId: campId
      }
    }));

    await Notification.insertMany(notifications);
    console.log(`Notified ${notifications.length} users about camp update`);
  } catch (error) {
    console.error('Error notifying camp bookings:', error);
  }
}

module.exports = exports;
