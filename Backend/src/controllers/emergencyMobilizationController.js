const EmergencyMobilizationEvent = require('../models/EmergencyMobilizationEvent');
const EmergencyVolunteerResponse = require('../models/EmergencyVolunteerResponse');
const HospitalProfile = require('../models/HospitalProfile');

exports.getEmergencyEvents = async (req, res) => {
  try {
    const { lat, lng, radius = 50000 } = req.query;

    let query = { eventStatus: 'ACTIVE' };
    
    if (lat && lng) {
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseInt(radius)
        }
      };
    }

    const events = await EmergencyMobilizationEvent.find(query)
      .sort({ urgencyLevel: -1, createdAt: -1 })
      .populate('hospitalId', 'name contactNumber')
      .lean();

    const eventsWithDistance = events.map(event => {
      let distance = null;
      if (lat && lng) {
        distance = calculateDistance(
          parseFloat(lat),
          parseFloat(lng),
          event.location.coordinates[1],
          event.location.coordinates[0]
        );
      }
      
      const hoursRemaining = Math.max(
        0,
        event.responseWindowHours - 
        Math.floor((new Date() - new Date(event.createdAt)) / (1000 * 60 * 60))
      );
      
      return {
        ...event,
        distance: distance ? Math.round(distance * 10) / 10 : null,
        hoursRemaining,
        spotsAvailable: event.volunteersRequired - event.volunteersRegistered
      };
    });

    res.json({
      success: true,
      count: eventsWithDistance.length,
      data: eventsWithDistance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching emergency events',
      error: error.message
    });
  }
};

exports.registerVolunteer = async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId, notes } = req.body;
    
    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required'
      });
    }
    
    const event = await EmergencyMobilizationEvent.findById(eventId);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Emergency event not found'
      });
    }
    
    if (event.eventStatus !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'This event is no longer active'
      });
    }
    
    if (event.volunteersRegistered >= event.volunteersRequired) {
      return res.status(400).json({
        success: false,
        message: 'Volunteer limit reached for this event'
      });
    }
    
    const existingResponse = await EmergencyVolunteerResponse.findOne({
      eventId,
      userId
    });
    
    if (existingResponse) {
      return res.status(400).json({
        success: false,
        message: 'You have already registered for this event'
      });
    }
    
    const response = await EmergencyVolunteerResponse.create({
      eventId,
      userId,
      responseStatus: 'INTERESTED',
      notes
    });
    
    event.volunteersRegistered += 1;
    if (event.volunteersRegistered >= event.volunteersRequired) {
      event.eventStatus = 'FULFILLED';
    }
    await event.save();
    
    res.status(201).json({
      success: true,
      message: 'Successfully registered as volunteer',
      data: response
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already registered for this event'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error registering volunteer',
      error: error.message
    });
  }
};

exports.updateVolunteerStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { responseId, status } = req.body;
    
    const response = await EmergencyVolunteerResponse.findOne({
      _id: responseId,
      userId
    });
    
    if (!response) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer response not found'
      });
    }
    
    response.responseStatus = status;
    await response.save();
    
    res.json({
      success: true,
      message: 'Status updated successfully',
      data: response
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating volunteer status',
      error: error.message
    });
  }
};

exports.getMyVolunteerResponses = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const responses = await EmergencyVolunteerResponse.find({ userId })
      .sort({ createdAt: -1 })
      .populate({
        path: 'eventId',
        populate: {
          path: 'hospitalId',
          select: 'name contactNumber'
        }
      })
      .lean();
    
    res.json({
      success: true,
      count: responses.length,
      data: responses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching volunteer responses',
      error: error.message
    });
  }
};

exports.createEmergencyEvent = async (req, res) => {
  try {
    const {
      hospitalId,
      bloodGroup,
      unitsRequired,
      location,
      responseWindowHours,
      volunteersRequired,
      urgencyLevel,
      description,
      instructions
    } = req.body;
    
    if (!hospitalId || !bloodGroup || !unitsRequired || !location) {
      return res.status(400).json({
        success: false,
        message: 'Required fields missing'
      });
    }
    
    const hospital = await HospitalProfile.findById(hospitalId);
    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found'
      });
    }
    
    const event = await EmergencyMobilizationEvent.create({
      hospitalId,
      hospitalName: hospital.name,
      bloodGroup,
      unitsRequired,
      location,
      responseWindowHours: responseWindowHours || 24,
      volunteersRequired: volunteersRequired || 10,
      urgencyLevel: urgencyLevel || 'HIGH',
      description,
      instructions
    });
    
    res.status(201).json({
      success: true,
      message: 'Emergency event created successfully',
      data: event
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating emergency event',
      error: error.message
    });
  }
};

exports.closeEmergencyEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const event = await EmergencyMobilizationEvent.findByIdAndUpdate(
      eventId,
      { eventStatus: 'CLOSED' },
      { new: true }
    );
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Event closed successfully',
      data: event
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error closing event',
      error: error.message
    });
  }
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (value) => {
  return value * Math.PI / 180;
};

module.exports = exports;
