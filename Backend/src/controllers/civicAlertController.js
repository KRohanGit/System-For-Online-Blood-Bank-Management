const CivicAlert = require('../models/CivicAlert');
const HospitalProfile = require('../models/HospitalProfile');

const calculateUrgencyScore = (alert) => {
  let score = 50;
  
  const rarityScores = {
    'AB-': 25, 'B-': 20, 'A-': 15, 'O-': 15,
    'AB+': 10, 'A+': 5, 'B+': 5, 'O+': 5
  };
  
  if (alert.bloodGroup && rarityScores[alert.bloodGroup]) {
    score += rarityScores[alert.bloodGroup];
  }
  
  if (alert.unitsRequired) {
    if (alert.unitsRequired >= 10) score += 20;
    else if (alert.unitsRequired >= 5) score += 10;
    else score += 5;
  }
  
  if (alert.alertType === 'SHORTAGE') score += 15;
  if (alert.alertType === 'EXPIRY') {
    if (alert.expiryWarningHours <= 24) score += 20;
    else if (alert.expiryWarningHours <= 48) score += 10;
  }
  
  return Math.min(Math.max(score, 0), 100);
};

exports.getCivicAlerts = async (req, res) => {
  try {
    const { lat, lng, radius = 20000 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const alerts = await CivicAlert.find({
      isActive: true,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseInt(radius)
        }
      }
    })
    .sort({ urgencyScore: -1, createdAt: -1 })
    .limit(50)
    .populate('hospitalId', 'name contactNumber')
    .lean();

    const alertsWithDistance = alerts.map(alert => {
      const distance = calculateDistance(
        parseFloat(lat),
        parseFloat(lng),
        alert.location.coordinates[1],
        alert.location.coordinates[0]
      );
      
      return {
        ...alert,
        distance: Math.round(distance * 10) / 10
      };
    });

    res.json({
      success: true,
      count: alertsWithDistance.length,
      data: alertsWithDistance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching civic alerts',
      error: error.message
    });
  }
};

exports.createCivicAlert = async (req, res) => {
  try {
    const alertData = req.body;
    
    if (alertData.hospitalId) {
      const hospital = await HospitalProfile.findById(alertData.hospitalId);
      if (hospital) {
        alertData.hospitalName = hospital.name;
        if (!alertData.location && hospital.location) {
          alertData.location = {
            type: 'Point',
            coordinates: [hospital.location.coordinates[0], hospital.location.coordinates[1]]
          };
        }
      }
    }
    
    alertData.urgencyScore = calculateUrgencyScore(alertData);
    
    const alert = await CivicAlert.create(alertData);
    
    res.status(201).json({
      success: true,
      data: alert
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating civic alert',
      error: error.message
    });
  }
};

exports.updateAlertStatus = async (req, res) => {
  try {
    const { alertId } = req.params;
    const { isActive } = req.body;
    
    const alert = await CivicAlert.findByIdAndUpdate(
      alertId,
      { isActive },
      { new: true }
    );
    
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }
    
    res.json({
      success: true,
      data: alert
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating alert status',
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
