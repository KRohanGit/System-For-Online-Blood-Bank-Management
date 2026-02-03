const CivicAlert = require('../models/CivicAlert');
const EmergencyMobilizationEvent = require('../models/EmergencyMobilizationEvent');
const HospitalProfile = require('../models/HospitalProfile');

exports.createCivicAlert = async (req, res) => {
  try {
    const { alertType, bloodGroup, title, message, location, expiresAt } = req.body;

    if (!req.user || !req.user.hospitalId) {
      return res.status(403).json({ message: 'Only hospital admins can create alerts' });
    }

    const hospital = await HospitalProfile.findById(req.user.hospitalId);
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    let urgencyScore = 50;
    const rarityMap = { 'O-': 15, 'AB-': 15, 'B-': 10, 'A-': 10, 'AB+': 5, 'O+': 0, 'A+': 0, 'B+': 0 };
    
    if (alertType === 'SHORTAGE') {
      urgencyScore = 70 + (rarityMap[bloodGroup] || 0);
    } else if (alertType === 'EXPIRY') {
      urgencyScore = 40;
    } else if (alertType === 'CAMP') {
      urgencyScore = 60;
    } else {
      urgencyScore = 30;
    }

    const alertLocation = location || {
      type: 'Point',
      coordinates: hospital.location ? hospital.location.coordinates : [0, 0]
    };

    const alert = new CivicAlert({
      hospitalId: req.user.hospitalId,
      alertType,
      bloodGroup: bloodGroup || null,
      title,
      message,
      urgencyScore,
      location: alertLocation,
      expiresAt: expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isActive: true
    });

    await alert.save();
    res.status(201).json({ message: 'Civic alert created successfully', alert });
  } catch (error) {
    console.error('Error creating civic alert:', error);
    res.status(500).json({ message: 'Failed to create civic alert', error: error.message });
  }
};

exports.createEmergencyEvent = async (req, res) => {
  try {
    const {
      eventTitle,
      bloodGroup,
      unitsRequired,
      volunteersRequired,
      description,
      urgencyLevel,
      location,
      eventStartTime,
      eventEndTime
    } = req.body;

    if (!req.user || !req.user.hospitalId) {
      return res.status(403).json({ message: 'Only hospital admins can create emergency events' });
    }

    const hospital = await HospitalProfile.findById(req.user.hospitalId);
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    const eventLocation = location || {
      type: 'Point',
      coordinates: hospital.location ? hospital.location.coordinates : [0, 0]
    };

    const event = new EmergencyMobilizationEvent({
      hospitalId: req.user.hospitalId,
      eventTitle,
      bloodGroup,
      unitsRequired,
      volunteersRequired,
      description,
      urgencyLevel: urgencyLevel || 'MEDIUM',
      eventStatus: 'ACTIVE',
      location: eventLocation,
      eventStartTime: eventStartTime || new Date(),
      eventEndTime: eventEndTime || new Date(Date.now() + 48 * 60 * 60 * 1000),
      volunteersRegistered: 0
    });

    await event.save();
    res.status(201).json({ message: 'Emergency event created successfully', event });
  } catch (error) {
    console.error('Error creating emergency event:', error);
    res.status(500).json({ message: 'Failed to create emergency event', error: error.message });
  }
};

exports.getMyAlerts = async (req, res) => {
  try {
    const alerts = await CivicAlert.find({ hospitalId: req.user.hospitalId })
      .populate('hospitalId', 'name location')
      .sort({ createdAt: -1 });
    res.json({ alerts });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ message: 'Failed to fetch alerts', error: error.message });
  }
};

exports.getMyEvents = async (req, res) => {
  try {
    const events = await EmergencyMobilizationEvent.find({ hospitalId: req.user.hospitalId })
      .populate('hospitalId', 'name location')
      .sort({ createdAt: -1 });
    res.json({ events });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ message: 'Failed to fetch events', error: error.message });
  }
};

exports.updateAlertStatus = async (req, res) => {
  try {
    const { alertId } = req.params;
    const { isActive } = req.body;

    const alert = await CivicAlert.findOne({ _id: alertId, hospitalId: req.user.hospitalId });
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found or unauthorized' });
    }

    alert.isActive = isActive;
    await alert.save();

    res.json({ message: 'Alert status updated', alert });
  } catch (error) {
    console.error('Error updating alert:', error);
    res.status(500).json({ message: 'Failed to update alert', error: error.message });
  }
};

exports.updateEventStatus = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { eventStatus } = req.body;

    const event = await EmergencyMobilizationEvent.findOne({ 
      _id: eventId, 
      hospitalId: req.user.hospitalId 
    });
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found or unauthorized' });
    }

    event.eventStatus = eventStatus;
    await event.save();

    res.json({ message: 'Event status updated', event });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ message: 'Failed to update event', error: error.message });
  }
};
