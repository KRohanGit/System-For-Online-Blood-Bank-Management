/**
 * Geolocation Routes
 * 
 * Purpose: To Handle all the geolocation-based queries for blood bank management
 * 
 * Endpoints:
 * - GET /api/geolocation/nearby-hospitals - Find hospitals near user
 * - GET /api/geolocation/nearby-camps - Find blood camps near user
 * - GET /api/geolocation/analytics - Get geospatial statistics
 * - GET /api/geolocation/map-data - Get data for map visualization
 */

const express = require('express');
const router = express.Router();
const geoController = require('../controllers/geolocationController');

/**
 * @route   GET /api/geolocation/nearby-hospitals
 * @desc    Get nearby hospitals with optional emergency filter
 * @query   latitude, longitude, radius (km), emergencyOnly (boolean), limit
 * @access  Public
 */
router.get('/nearby-hospitals', geoController.getNearbyHospitals);

/**
 * @route   GET /api/geolocation/nearby-camps
 * @desc    Get nearby blood donation camps
 * @query   latitude, longitude, radius (km), upcomingOnly (boolean), limit
 * @access  Public
 */
router.get('/nearby-camps', geoController.getNearbyCamps);

/**
 * @route   GET /api/geolocation/analytics
 * @desc    Get comprehensive geolocation analytics
 * @query   latitude, longitude, radius (km)
 * @access  Public
 */
router.get('/analytics', geoController.getGeoAnalytics);

/**
 * @route   GET /api/geolocation/map-data
 * @desc    Get all markers data for map visualization
 * @query   latitude, longitude, radius (km)
 * @access  Public
 */
router.get('/map-data', geoController.getMapData);

module.exports = router;
