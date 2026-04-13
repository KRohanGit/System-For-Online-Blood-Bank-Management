const BloodCamp = require('../models/BloodCamp');
const CampBooking = require('../models/CampBooking');
const Notification = require('../models/Notification');
const PublicUser = require('../models/PublicUser');
const User = require('../models/User');
const HospitalProfile = require('../models/HospitalProfile');
const { broadcast, emitToRole, emitToHospital } = require('../services/realtime/socketService');

const normalizeStatus = (camp) => {
  if (camp.status) return camp.status;
  const lifecycle = String(camp.lifecycle?.status || '').toLowerCase();
  if (lifecycle === 'completed') return 'completed';
  if (lifecycle === 'cancelled') return 'cancelled';
  return 'upcoming';
};

const getOrganizerId = (camp) => camp.organizerId || camp.organizer?.userId;

const getCampTitle = (camp) => camp.title || camp.campName;

const getCampDate = (camp) => camp.dateTime || camp.schedule?.date;

const getCampLocation = (camp) => {
  if (camp.location?.coordinates?.length === 2) return camp.location;
  if (camp.venue?.location?.coordinates?.length === 2) {
    return {
      type: 'Point',
      coordinates: camp.venue.location.coordinates,
      address: camp.venue.address,
      city: camp.venue.city,
      state: camp.venue.state,
      pincode: camp.venue.pincode
    };
  }
  return null;
};

const formatCampForClient = (camp) => ({
  _id: camp._id,
  title: getCampTitle(camp),
  description: camp.description,
  dateTime: getCampDate(camp),
  duration: camp.duration || { hours: 4 },
  capacity: camp.capacity || camp.venue?.expectedDonors || 0,
  location: getCampLocation(camp),
  bloodGroupsNeeded: camp.bloodGroupsNeeded || [],
  organizer: {
    id: getOrganizerId(camp),
    name: camp.organizerName || camp.organizer?.name,
    type: camp.organizer?.type || null,
    contactPhone: camp.organizerContact?.phone || camp.organizer?.contactPhone,
    contactEmail: camp.organizerContact?.email || camp.organizer?.contactEmail
  },
  organizerName: camp.organizerName || camp.organizer?.name,
  status: normalizeStatus(camp),
  lifecycle: camp.lifecycle,
  createdAt: camp.createdAt,
  updatedAt: camp.updatedAt
});

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

    // Build query against canonical schema fields
    const query = {
      'schedule.date': { $gt: new Date() },
      'lifecycle.status': { $nin: ['Cancelled', 'Completed'] }
    };

    if (status && status !== 'upcoming') {
      if (String(status).toLowerCase() === 'cancelled') query['lifecycle.status'] = 'Cancelled';
      if (String(status).toLowerCase() === 'completed') query['lifecycle.status'] = 'Completed';
    }

    const camps = await BloodCamp.find(query)
      .sort({ 'schedule.date': sortOptions.dateTime || 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    const total = await BloodCamp.countDocuments(query);

    res.status(200).json({
      success: true,
      message: 'Blood camps retrieved successfully',
      data: {
        camps: camps.map(formatCampForClient),
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
 * Get camps for a specific hospital (public)
 * Route: GET /api/blood-camps/by-hospital/:hospitalId
 */
exports.getCampsByHospital = async (req, res) => {
  try {
    const { hospitalId } = req.params;

    if (!hospitalId) {
      return res.status(400).json({ success: false, message: 'hospitalId is required' });
    }

    // Match camps where organizer.affiliatedHospital or medicalSupport.coordinatingHospital equals hospitalId
    const query = {
      isActive: true,
      $or: [
        { 'organizer.affiliatedHospital': hospitalId },
        { 'medicalSupport.coordinatingHospital': hospitalId },
        { 'organizer.userId': hospitalId }
      ]
    };

    // Only upcoming camps
    // Some documents use schedule.date, some use dateTime - support both
    query.$or = query.$or.concat([
      { 'schedule.date': { $gt: new Date() } },
      { dateTime: { $gt: new Date() } }
    ]);

    const camps = await BloodCamp.find(query).select('-__v').lean();

    res.status(200).json({ success: true, data: { camps } });
  } catch (error) {
    console.error('Error getting camps by hospital:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve camps', error: error.message });
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
      'venue.location': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [long, lat]
          },
          $maxDistance: parseFloat(maxDistance) * 1000 // Convert km to meters
        }
      },
      'lifecycle.status': { $nin: ['Cancelled', 'Completed'] },
      'schedule.date': { $gt: new Date() }
    }).select('-__v');

    // Calculate distance for each camp
    const campsWithDistance = camps.map(camp => {
      const coordinates = camp.venue?.location?.coordinates || [0, 0];
      const campLong = coordinates[0];
      const campLat = coordinates[1];
      
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
        ...formatCampForClient(camp.toJSON()),
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

    const camp = await BloodCamp.findById(id);

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
          ...formatCampForClient(camp.toJSON()),
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
    const userRoleRaw = req.userRole;
    const userRole = String(userRoleRaw || '').toLowerCase();

    console.log('Creating camp - User:', userId, 'Role:', userRoleRaw);

    // Verify user permissions (case-insensitive)
    if (userRole === 'public_user') {
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
    } else if (userRole !== 'hospital_admin') {
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
    if (userRole === 'public_user') {
      organizer = await PublicUser.findById(userId);
      organizerModel = 'PublicUser';
    } else {
      organizer = await User.findById(userId);
      organizerModel = 'User';
    }

    // Create camp
    const campDate = new Date(dateTime);
    const startTime = campDate.toTimeString().slice(0, 5);
    const endDate = new Date(campDate.getTime() + Number((duration?.hours || 4)) * 60 * 60 * 1000);
    const endTime = endDate.toTimeString().slice(0, 5);

    let coordinatingHospital = null;
    if (userRole === 'hospital_admin') {
      const hp = await HospitalProfile.findOne({ userId }).lean();
      coordinatingHospital = hp?._id || null;
    }
    if (!coordinatingHospital) {
      const fallbackHospital = await HospitalProfile.findOne({ verificationStatus: 'approved' }).lean();
      coordinatingHospital = fallbackHospital?._id || null;
    }

    const camp = new BloodCamp({
      campName: title,
      description,
      organizer: {
        userId,
        userModel: organizerModel,
        name: organizer.fullName || organizer.hospitalName || organizer.email,
        type: userRole === 'hospital_admin' ? 'Hospital' : 'Individual',
        contactPhone: (organizerContact?.phone || organizer.phone || '9999999999'),
        contactEmail: (organizerContact?.email || organizer.email || 'noreply@lifelink.local'),
        affiliatedHospital: coordinatingHospital || undefined
      },
      venue: {
        name: title,
        address: location?.address || 'Address not provided',
        city: location?.city || 'Unknown',
        state: location?.state || 'Unknown',
        pincode: location?.pincode || '000000',
        location: {
          type: 'Point',
          coordinates: location?.coordinates || [0, 0]
        },
        type: 'Indoor',
        seatingCapacity: Number(capacity || 50),
        expectedDonors: Number(capacity || 50)
      },
      schedule: {
        date: campDate,
        startTime,
        endTime,
        category: 'Community'
      },
      medicalSupport: {
        coordinatingHospital,
        emergencyContactName: organizer.fullName || organizer.hospitalName || 'Coordinator',
        emergencyContactPhone: organizerContact?.phone || organizer.phone || '9999999999',
        medicalSupportAvailable: true
      },
      bloodGroupsNeeded: bloodGroupsNeeded || [],
      lifecycle: {
        status: 'Pre-Camp',
        approvalStatus: 'Pending'
      }
    });

    await camp.save();

    // Emit real-time socket event to notify all connected users
    try {
      broadcast('camp.created', {
        campId: camp._id,
        title: getCampTitle(camp),
        organizerName: camp.organizer?.name,
        dateTime: getCampDate(camp),
        location: getCampLocation(camp),
        timestamp: new Date().toISOString()
      });

      // Also emit to specific roles
      emitToRole('public_user', 'camp.created', {
        campId: camp._id,
        title: getCampTitle(camp),
        message: `New blood camp organized: ${getCampTitle(camp)}`
      });

      emitToRole('hospital_admin', 'camp.created', {
        campId: camp._id,
        title: getCampTitle(camp),
        organizer: camp.organizer?.name,
        message: `New blood camp organized: ${getCampTitle(camp)}`
      });

      emitToRole('doctor', 'camp.created', {
        campId: camp._id,
        title: getCampTitle(camp),
        organizer: camp.organizer?.name,
        message: `New blood camp organized: ${getCampTitle(camp)}`
      });

      emitToRole('super_admin', 'camp.created', {
        campId: camp._id,
        title: getCampTitle(camp),
        organizer: camp.organizer?.name,
        message: `New blood camp organized: ${getCampTitle(camp)}`
      });
    } catch (socketError) {
      console.error('Error emitting socket event:', socketError);
    }

    // Send notification to nearby users (within 25km)
    // This is an async operation that doesn't need to block the response
    notifyNearbyUsers(camp).catch(err => console.error('Error notifying users:', err));

    res.status(201).json({
      success: true,
      message: 'Blood camp created successfully',
      data: { camp: formatCampForClient(camp.toJSON()) }
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
    if (String(getOrganizerId(camp)) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this camp'
      });
    }

    // Prevent updates to completed or cancelled camps
      if (['Completed', 'Cancelled'].includes(camp.lifecycle?.status)) {
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

    if (updates.title) {
      camp.campName = updates.title;
      if (camp.venue) camp.venue.name = updates.title;
    }
    if (updates.description) camp.description = updates.description;
    if (updates.location && camp.venue) {
      camp.venue.address = updates.location.address || camp.venue.address;
      camp.venue.city = updates.location.city || camp.venue.city;
      camp.venue.state = updates.location.state || camp.venue.state;
      camp.venue.pincode = updates.location.pincode || camp.venue.pincode;
      if (updates.location.coordinates?.length === 2) {
        camp.venue.location.coordinates = updates.location.coordinates;
      }
    }
    if (updates.dateTime && camp.schedule) {
      const updatedDate = new Date(updates.dateTime);
      camp.schedule.date = updatedDate;
      camp.schedule.startTime = updatedDate.toTimeString().slice(0, 5);
    }
    if (updates.capacity && camp.venue) {
      camp.venue.expectedDonors = Number(updates.capacity);
      camp.venue.seatingCapacity = Number(updates.capacity);
    }
    if (updates.bloodGroupsNeeded) camp.bloodGroupsNeeded = updates.bloodGroupsNeeded;
    if (updates.organizerContact && camp.organizer) {
      camp.organizer.contactPhone = updates.organizerContact.phone || camp.organizer.contactPhone;
      camp.organizer.contactEmail = updates.organizerContact.email || camp.organizer.contactEmail;
    }
    await camp.save();

    // Emit real-time socket event for camp update
    try {
      broadcast('camp.updated', {
        campId: camp._id,
        title: getCampTitle(camp),
        updates: updates,
        timestamp: new Date().toISOString()
      });

      // Also emit to specific roles
      emitToRole('public_user', 'camp.updated', {
        campId: camp._id,
        title: getCampTitle(camp),
        message: `Blood camp "${getCampTitle(camp)}" has been updated`
      });

      emitToRole('hospital_admin', 'camp.updated', {
        campId: camp._id,
        title: getCampTitle(camp),
        message: `Blood camp "${getCampTitle(camp)}" has been updated`
      });

      emitToRole('doctor', 'camp.updated', {
        campId: camp._id,
        title: getCampTitle(camp),
        message: `Blood camp "${getCampTitle(camp)}" has been updated`
      });

      emitToRole('super_admin', 'camp.updated', {
        campId: camp._id,
        title: getCampTitle(camp),
        message: `Blood camp "${getCampTitle(camp)}" has been updated`
      });
    } catch (socketError) {
      console.error('Error emitting socket event:', socketError);
    }

    // Notify all booked users about the update
    notifyCampBookings(id, 'camp_update', 'Camp Updated', 
      `The blood camp "${getCampTitle(camp)}" has been updated. Please check the new details.`)
      .catch(err => console.error('Error notifying bookings:', err));

    res.status(200).json({
      success: true,
      message: 'Blood camp updated successfully',
      data: { camp: formatCampForClient(camp.toJSON()) }
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
    if (String(getOrganizerId(camp)) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to cancel this camp'
      });
    }

    if (camp.lifecycle?.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Camp is already cancelled'
      });
    }

    if (camp.lifecycle?.status === 'Completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a completed camp'
      });
    }

    // Cancel camp
    camp.lifecycle.status = 'Cancelled';
    camp.cancellationReason = reason || 'Not specified';
    camp.cancelledAt = new Date();
    await camp.save();

    // Emit real-time socket event for camp cancellation
    try {
      broadcast('camp.cancelled', {
        campId: camp._id,
        title: getCampTitle(camp),
        reason: camp.cancellationReason,
        timestamp: new Date().toISOString()
      });

      // Also emit to specific roles
      emitToRole('public_user', 'camp.cancelled', {
        campId: camp._id,
        title: getCampTitle(camp),
        reason: camp.cancellationReason,
        message: `Blood camp "${getCampTitle(camp)}" has been cancelled. Reason: ${camp.cancellationReason}`
      });

      emitToRole('hospital_admin', 'camp.cancelled', {
        campId: camp._id,
        title: getCampTitle(camp),
        reason: camp.cancellationReason,
        message: `Blood camp "${getCampTitle(camp)}" has been cancelled`
      });

      emitToRole('doctor', 'camp.cancelled', {
        campId: camp._id,
        title: getCampTitle(camp),
        reason: camp.cancellationReason,
        message: `Blood camp "${getCampTitle(camp)}" has been cancelled`
      });

      emitToRole('super_admin', 'camp.cancelled', {
        campId: camp._id,
        title: getCampTitle(camp),
        reason: camp.cancellationReason,
        message: `Blood camp "${getCampTitle(camp)}" has been cancelled`
      });
    } catch (socketError) {
      console.error('Error emitting socket event:', socketError);
    }

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
        message: `The blood camp "${getCampTitle(camp)}" scheduled for ${new Date(getCampDate(camp)).toLocaleDateString()} has been cancelled. Reason: ${camp.cancellationReason}`,
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
        camp: formatCampForClient(camp.toJSON()),
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
    if (String(getOrganizerId(camp)) !== String(userId)) {
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
    camp.lifecycle.status = 'Cancelled';
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
    const query = { 'organizer.userId': userId };

    if (status) {
      query.status = status;
    }

    const camps = await BloodCamp.find(query)
      .sort({ 'schedule.date': -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    const total = await BloodCamp.countDocuments(query);

    res.status(200).json({
      success: true,
      message: 'Your camps retrieved successfully',
      data: {
        camps: camps.map(formatCampForClient),
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
