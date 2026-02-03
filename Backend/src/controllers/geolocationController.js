/**
 * Geolocation Intelligence Controller
 * 
 * Purpose: Centralized geolocation services for blood bank management
 * 
 * Features:
 * - Nearby hospital discovery with emergency support filtering
 * - Blood camp proximity search
 * - Geospatial analytics and statistics
 * - Emergency route optimization data
 * - Coverage area analysis
 */

const HospitalProfile = require('../models/HospitalProfile');
const BloodCamp = require('../models/BloodCamp');
const User = require('../models/User');

/**
 * Utility: Calculate distance between two coordinates using Haversine formula
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Get nearby hospitals with advanced filtering
 * @route GET /api/geolocation/nearby-hospitals
 * @access Public
 */
exports.getNearbyHospitals = async (req, res) => {
  try {
    const { 
      latitude, 
      longitude, 
      radius = 10, 
      emergencyOnly = false,
      limit = 20 
    } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const radiusInMeters = parseFloat(radius) * 1000;

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates'
      });
    }

    // Query hospitals from User model (HOSPITAL_ADMIN role)
    const query = {
      role: 'HOSPITAL_ADMIN',
      isActive: true,
      verificationStatus: 'approved',
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lon, lat]
          },
          $maxDistance: radiusInMeters
        }
      }
    };

    const hospitals = await User.find(query)
      .select('hospitalName email phone location address city state emergencySupport')
      .limit(parseInt(limit));

    // Calculate distance and enrich data
    const hospitalsWithDetails = hospitals.map(hospital => {
      const [hospLon, hospLat] = hospital.location.coordinates;
      const distance = calculateDistance(lat, lon, hospLat, hospLon);
      
      return {
        id: hospital._id,
        name: hospital.hospitalName,
        address: hospital.address,
        city: hospital.city,
        state: hospital.state,
        phone: hospital.phone,
        email: hospital.email,
        location: {
          latitude: hospLat,
          longitude: hospLon
        },
        distance: parseFloat(distance.toFixed(2)),
        emergencySupport: hospital.emergencySupport || false
      };
    });

    // Filter emergency hospitals if requested
    const filteredHospitals = emergencyOnly 
      ? hospitalsWithDetails.filter(h => h.emergencySupport)
      : hospitalsWithDetails;

    // Sort by distance
    filteredHospitals.sort((a, b) => a.distance - b.distance);

    res.status(200).json({
      success: true,
      message: 'Nearby hospitals retrieved successfully',
      data: {
        hospitals: filteredHospitals,
        count: filteredHospitals.length,
        userLocation: { latitude: lat, longitude: lon },
        searchRadius: parseFloat(radius)
      }
    });

  } catch (error) {
    console.error('Error in getNearbyHospitals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve nearby hospitals',
      error: error.message
    });
  }
};

/**
 * Get nearby blood camps
 * @route GET /api/geolocation/nearby-camps
 * @access Public
 */
exports.getNearbyCamps = async (req, res) => {
  try {
    const { 
      latitude, 
      longitude, 
      radius = 20, 
      upcomingOnly = true,
      limit = 15 
    } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const radiusInMeters = parseFloat(radius) * 1000;

    // Build query
    const query = {
      'venue.location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lon, lat]
          },
          $maxDistance: radiusInMeters
        }
      },
      isActive: true
    };

    if (upcomingOnly) {
      query.status = 'upcoming';
      query.dateTime = { $gte: new Date() };
    }

    const camps = await BloodCamp.find(query)
      .select('campName description dateTime venue organizer status slotsTotal slotsBooked')
      .limit(parseInt(limit));

    // Calculate distance and enrich data
    const campsWithDetails = camps.map(camp => {
      const [campLon, campLat] = camp.venue.location.coordinates;
      const distance = calculateDistance(lat, lon, campLat, campLon);
      
      return {
        id: camp._id,
        name: camp.campName,
        description: camp.description,
        date: camp.dateTime,
        venue: {
          name: camp.venue.name,
          address: camp.venue.address,
          city: camp.venue.city,
          state: camp.venue.state
        },
        location: {
          latitude: campLat,
          longitude: campLon
        },
        organizer: camp.organizer.name,
        status: camp.status,
        availability: {
          total: camp.slotsTotal,
          booked: camp.slotsBooked,
          available: camp.slotsTotal - camp.slotsBooked
        },
        distance: parseFloat(distance.toFixed(2))
      };
    });

    // Sort by distance
    campsWithDetails.sort((a, b) => a.distance - b.distance);

    res.status(200).json({
      success: true,
      message: 'Nearby blood camps retrieved successfully',
      data: {
        camps: campsWithDetails,
        count: campsWithDetails.length,
        userLocation: { latitude: lat, longitude: lon },
        searchRadius: parseFloat(radius)
      }
    });

  } catch (error) {
    console.error('Error in getNearbyCamps:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve nearby camps',
      error: error.message
    });
  }
};

/**
 * Get comprehensive geolocation intelligence analytics
 * @route GET /api/geolocation/analytics
 * @access Public
 */
exports.getGeoAnalytics = async (req, res) => {
  try {
    const { latitude, longitude, radius = 50 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const radiusInMeters = parseFloat(radius) * 1000;

    // Parallel queries for efficiency
    const [hospitals, camps, emergencyHospitals] = await Promise.all([
      // Total hospitals in area
      User.countDocuments({
        role: 'HOSPITAL_ADMIN',
        isActive: true,
        verificationStatus: 'approved',
        'location.coordinates': {
          $near: {
            $geometry: { type: 'Point', coordinates: [lon, lat] },
            $maxDistance: radiusInMeters
          }
        }
      }),
      
      // Upcoming camps in area
      BloodCamp.countDocuments({
        'venue.location.coordinates': {
          $near: {
            $geometry: { type: 'Point', coordinates: [lon, lat] },
            $maxDistance: radiusInMeters
          }
        },
        isActive: true,
        status: 'upcoming',
        dateTime: { $gte: new Date() }
      }),
      
      // Emergency support hospitals
      User.countDocuments({
        role: 'HOSPITAL_ADMIN',
        isActive: true,
        verificationStatus: 'approved',
        emergencySupport: true,
        'location.coordinates': {
          $near: {
            $geometry: { type: 'Point', coordinates: [lon, lat] },
            $maxDistance: radiusInMeters
          }
        }
      })
    ]);

    // Get nearest emergency hospital
    const nearestEmergency = await User.findOne({
      role: 'HOSPITAL_ADMIN',
      isActive: true,
      verificationStatus: 'approved',
      emergencySupport: true,
      'location.coordinates': {
        $near: {
          $geometry: { type: 'Point', coordinates: [lon, lat] },
          $maxDistance: radiusInMeters
        }
      }
    }).select('hospitalName location');

    let nearestEmergencyData = null;
    if (nearestEmergency) {
      const [eLon, eLat] = nearestEmergency.location.coordinates;
      const distance = calculateDistance(lat, lon, eLat, eLon);
      nearestEmergencyData = {
        name: nearestEmergency.hospitalName,
        distance: parseFloat(distance.toFixed(2))
      };
    }

    // Get upcoming camp details
    const upcomingCamps = await BloodCamp.find({
      'venue.location.coordinates': {
        $near: {
          $geometry: { type: 'Point', coordinates: [lon, lat] },
          $maxDistance: radiusInMeters
        }
      },
      isActive: true,
      status: 'upcoming',
      dateTime: { $gte: new Date() }
    })
      .select('campName dateTime venue slotsTotal slotsBooked')
      .limit(5)
      .sort({ dateTime: 1 });

    const campDetails = upcomingCamps.map(camp => {
      const [campLon, campLat] = camp.venue.location.coordinates;
      const distance = calculateDistance(lat, lon, campLat, campLon);
      return {
        name: camp.campName,
        date: camp.dateTime,
        venue: camp.venue.city,
        slotsAvailable: camp.slotsTotal - camp.slotsBooked,
        distance: parseFloat(distance.toFixed(2))
      };
    });

    // Calculate coverage score
    const coverageScore = Math.min(100, Math.round(
      (hospitals * 10) + (emergencyHospitals * 20) + (camps * 5)
    ));

    res.status(200).json({
      success: true,
      message: 'Geolocation analytics retrieved successfully',
      data: {
        userLocation: { latitude: lat, longitude: lon },
        searchRadius: parseFloat(radius),
        statistics: {
          totalHospitals: hospitals,
          emergencyHospitals: emergencyHospitals,
          upcomingCamps: camps,
          coverageScore: coverageScore
        },
        nearestEmergency: nearestEmergencyData,
        upcomingCampDetails: campDetails,
        insights: {
          emergencyCoverage: emergencyHospitals > 0 ? 'Good' : 'Limited',
          hospitalDensity: hospitals > 5 ? 'High' : hospitals > 2 ? 'Moderate' : 'Low',
          campActivity: camps > 3 ? 'Very Active' : camps > 0 ? 'Active' : 'Low',
          recommendation: emergencyHospitals === 0 
            ? 'Consider expanding search radius for emergency support'
            : 'Good coverage in your area'
        }
      }
    });

  } catch (error) {
    console.error('Error in getGeoAnalytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve geolocation analytics',
      error: error.message
    });
  }
};

/**
 * Get all hospitals and camps for map visualization
 * @route GET /api/geolocation/map-data
 * @access Public
 */
exports.getMapData = async (req, res) => {
  try {
    const { 
      latitude, 
      longitude, 
      radius = 30 
    } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const radiusInMeters = parseFloat(radius) * 1000;

    // Get hospitals and camps
    const [hospitals, camps] = await Promise.all([
      User.find({
        role: 'HOSPITAL_ADMIN',
        isActive: true,
        verificationStatus: 'approved',
        'location.coordinates': {
          $near: {
            $geometry: { type: 'Point', coordinates: [lon, lat] },
            $maxDistance: radiusInMeters
          }
        }
      })
        .select('hospitalName location address city emergencySupport')
        .limit(50),
      
      BloodCamp.find({
        'venue.location.coordinates': {
          $near: {
            $geometry: { type: 'Point', coordinates: [lon, lat] },
            $maxDistance: radiusInMeters
          }
        },
        isActive: true,
        status: 'upcoming',
        dateTime: { $gte: new Date() }
      })
        .select('campName venue dateTime organizer')
        .limit(30)
    ]);

    // Format hospital data
    const hospitalMarkers = hospitals.map(h => {
      const [hospLon, hospLat] = h.location.coordinates;
      return {
        id: h._id,
        type: 'hospital',
        name: h.hospitalName,
        address: h.address,
        city: h.city,
        latitude: hospLat,
        longitude: hospLon,
        emergencySupport: h.emergencySupport || false
      };
    });

    // Format camp data
    const campMarkers = camps.map(c => {
      const [campLon, campLat] = c.venue.location.coordinates;
      return {
        id: c._id,
        type: 'camp',
        name: c.campName,
        venue: c.venue.name,
        city: c.venue.city,
        date: c.dateTime,
        organizer: c.organizer.name,
        latitude: campLat,
        longitude: campLon
      };
    });

    res.status(200).json({
      success: true,
      message: 'Map data retrieved successfully',
      data: {
        userLocation: { latitude: lat, longitude: lon },
        hospitals: hospitalMarkers,
        camps: campMarkers,
        counts: {
          hospitals: hospitalMarkers.length,
          emergencyHospitals: hospitalMarkers.filter(h => h.emergencySupport).length,
          camps: campMarkers.length
        }
      }
    });

  } catch (error) {
    console.error('Error in getMapData:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve map data',
      error: error.message
    });
  }
};

module.exports = exports;
