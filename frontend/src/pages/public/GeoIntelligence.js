import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  getCurrentLocation,
  getNearbyHospitals,
  getNearbyCamps,
  getGeoAnalytics,
  getMapData,
  formatDistance,
  DEFAULT_LOCATIONS
} from '../../services/geolocationApi';
import { connectSocket, disconnectSocket, onEvent } from '../../services/socketService';
import './GeoIntelligence.css';

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom marker icons
const createIcon = (color, emoji) => L.divIcon({
  className: 'custom-marker',
  html: `<div style="background-color: ${color}; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); font-size: 20px;">${emoji}</div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40]
});

const icons = {
  user: createIcon('#4A90E2', '📍'),
  emergencyHospital: createIcon('#E74C3C', '🏥'),
  hospital: createIcon('#3498DB', '🏥'),
  camp: createIcon('#2ECC71', '🏕️')
};

// Component to recenter map
function MapController({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

const GeoIntelligence = () => {
  const navigate = useNavigate();
  const [showQuickAgreeModal, setShowQuickAgreeModal] = useState(false);
  const [selectedHospitalForAgreement, setSelectedHospitalForAgreement] = useState(null);

  const getNormalizedRole = () => {
    const token = localStorage.getItem('token');
    const roleFromStorage = localStorage.getItem('role');

    let roleFromToken = '';
    if (token) {
      try {
        const tokenBody = token.split('.')[1] || '';
        const normalizedBase64 = tokenBody.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(normalizedBase64));
        roleFromToken = payload?.role || '';
      } catch {
        roleFromToken = '';
      }
    }

    let user = {};
    try {
      user = JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      user = {};
    }

    return String(
      roleFromToken || user.role || user.userRole || roleFromStorage || ''
    ).toLowerCase().trim();
  };

  const isHospitalAdmin = () => {
    const role = getNormalizedRole();
    return [
      'hospital_admin',
      'hospital_administrator',
      'hospital',
      'admin',
      'super_admin'
    ].includes(role);
  };
  
  // Location state
  const [userLocation, setUserLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState([17.7231, 83.3012]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);
  
  // Data state
  const [hospitals, setHospitals] = useState([]);
  const [camps, setCamps] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // UI state
  const [activeTab, setActiveTab] = useState('overview');
  const [searchRadius, setSearchRadius] = useState(15);
  const [showEmergencyOnly, setShowEmergencyOnly] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState(null);

  /**
   * Get user's current location
   */
  const detectLocation = async () => {
    setLocationLoading(true);
    setLocationError(null);
    
    try {
      const location = await getCurrentLocation();
      setUserLocation(location);
      setMapCenter([location.latitude, location.longitude]);
      await fetchGeoData(location.latitude, location.longitude);
    } catch (error) {
      console.error('Location detection error:', error);
      setLocationError(error.message);
    } finally {
      setLocationLoading(false);
    }
  };

  /**
   * Use predefined test location
   */
  const useTestLocation = (location) => {
    setUserLocation(location);
    setMapCenter([location.latitude, location.longitude]);
    fetchGeoData(location.latitude, location.longitude);
  };

  /**
   * Fetch all geolocation data
   */
  const fetchGeoData = async (lat, lng) => {
    setLoading(true);
    try {
      const [hospitalsData, campsData, analyticsData] = await Promise.all([
        getNearbyHospitals(lat, lng, searchRadius, showEmergencyOnly),
        getNearbyCamps(lat, lng, searchRadius),
        getGeoAnalytics(lat, lng, searchRadius)
      ]);

      setHospitals(hospitalsData.data.hospitals || []);
      setCamps(campsData.data.camps || []);
      setAnalytics(analyticsData.data || null);
    } catch (error) {
      console.error('Error fetching geo data:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Quick agree handler - open modal with hospital details
   */
  const handleQuickAgree = (hospital) => {
    if (!isHospitalAdmin()) {
      console.warn('Quick agree blocked due to role:', getNormalizedRole());
      alert('Only hospital admins can agree to coordination');
      return;
    }
    setSelectedHospitalForAgreement(hospital);
    setShowQuickAgreeModal(true);
  };

  /**
   * Initial load with default location
   */
  useEffect(() => {
    const defaultLocation = DEFAULT_LOCATIONS.visakhapatnam;
    setUserLocation(defaultLocation);
    fetchGeoData(defaultLocation.latitude, defaultLocation.longitude);
  }, []);

  /**
   * Refresh data when filters change
   */
  useEffect(() => {
    if (userLocation) {
      fetchGeoData(userLocation.latitude, userLocation.longitude);
      // Update map center to force re-render
      setMapCenter([userLocation.latitude, userLocation.longitude]);
    }
  }, [searchRadius, showEmergencyOnly]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const socketUserId = user.id || user._id || `geo-guest-${Date.now()}`;
    const socketRole = String(user.role || localStorage.getItem('role') || 'public_user').toLowerCase();

    connectSocket(socketUserId, socketRole);

    const refreshGeoData = () => {
      if (userLocation?.latitude && userLocation?.longitude) {
        fetchGeoData(userLocation.latitude, userLocation.longitude);
      }
    };

    const offHospitalCreated = onEvent('hospital.created', refreshGeoData);
    const offHospitalOnline = onEvent('hospital.online', refreshGeoData);
    const offHospitalOffline = onEvent('hospital.offline', refreshGeoData);

    return () => {
      offHospitalCreated();
      offHospitalOnline();
      offHospitalOffline();
      disconnectSocket();
    };
  }, [userLocation, searchRadius, showEmergencyOnly]);

  return (
    <div className="geo-intelligence-container">
      {/* Header */}
      <div className="geo-header">
        <h1>🌍 Geolocation Intelligence Dashboard</h1>
        <p>Discover nearby hospitals, blood camps, and emergency support using advanced geospatial analysis</p>
      </div>

      {/* Location Controls */}
      <div className="location-controls">
        <div className="location-status">
          {userLocation ? (
            <div className="location-info">
              <span className="status-indicator active">📍 Location Active</span>
              <span className="location-chip">
                {userLocation.name || 'Using current area'}
              </span>
            </div>
          ) : (
            <span className="status-indicator inactive">📍 No Location Set</span>
          )}
        </div>

        <div className="location-actions">
          <button 
            className="btn-primary"
            onClick={detectLocation}
            disabled={locationLoading}
          >
            {locationLoading ? '🔄 Detecting...' : '📍 Detect My Location'}
          </button>

          <div className="test-locations">
            <span>Try Location:</span>
            {Object.entries(DEFAULT_LOCATIONS).slice(0, 3).map(([key, loc]) => (
              <button
                key={key}
                className="btn-test-location"
                onClick={() => {
                  setUserLocation({
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                    name: loc.name
                  });
                  setMapCenter([loc.latitude, loc.longitude]);
                  fetchGeoData(loc.latitude, loc.longitude);
                }}
              >
                {loc.name}
              </button>
            ))}
          </div>
        </div>

        {locationError && (
          <div className="alert alert-error">
            ⚠️ {locationError}
            <button onClick={detectLocation}>Try Again</button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="geo-filters">
        <div className="filter-group">
          <label>Search Radius: {searchRadius} km</label>
          <input
            type="range"
            min="5"
            max="100"
            value={searchRadius}
            onChange={(e) => setSearchRadius(Number(e.target.value))}
            className="radius-slider"
          />
        </div>

        <div className="filter-group">
          <label>
            <input
              type="checkbox"
              checked={showEmergencyOnly}
              onChange={(e) => setShowEmergencyOnly(e.target.checked)}
            />
            Show Emergency Hospitals Only
          </label>
        </div>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="analytics-grid">
          <div className="analytics-card">
            <div className="card-icon">🏥</div>
            <div className="card-content">
              <h3>{analytics.statistics.totalHospitals}</h3>
              <p>Total Hospitals</p>
              <span className="card-badge">{analytics.insights.hospitalDensity} Density</span>
            </div>
          </div>

          <div className="analytics-card emergency">
            <div className="card-icon">🚑</div>
            <div className="card-content">
              <h3>{analytics.statistics.emergencyHospitals}</h3>
              <p>Emergency Support</p>
              <span className="card-badge">{analytics.insights.emergencyCoverage}</span>
            </div>
          </div>

          <div className="analytics-card camps">
            <div className="card-icon">🏕️</div>
            <div className="card-content">
              <h3>{analytics.statistics.upcomingCamps}</h3>
              <p>Upcoming Camps</p>
              <span className="card-badge">{analytics.insights.campActivity}</span>
            </div>
          </div>

          <div className="analytics-card score">
            <div className="card-icon">📊</div>
            <div className="card-content">
              <h3>{analytics.statistics.coverageScore}%</h3>
              <p>Coverage Score</p>
              <span className="card-badge">
                {analytics.statistics.coverageScore > 70 ? 'Excellent' : 
                 analytics.statistics.coverageScore > 40 ? 'Good' : 'Fair'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Tabs */}
      <div className="geo-tabs">
        <button
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          🗺️ Map Overview
        </button>
        <button
          className={`tab-button ${activeTab === 'hospitals' ? 'active' : ''}`}
          onClick={() => setActiveTab('hospitals')}
        >
          🏥 Hospitals ({hospitals.length})
        </button>
        <button
          className={`tab-button ${activeTab === 'camps' ? 'active' : ''}`}
          onClick={() => setActiveTab('camps')}
        >
          🏕️ Blood Camps ({camps.length})
        </button>
        <button
          className={`tab-button ${activeTab === 'insights' ? 'active' : ''}`}
          onClick={() => setActiveTab('insights')}
        >
          📈 Insights
        </button>
      </div>

      <div className="geo-content">
        {/* Map Tab */}
        {activeTab === 'overview' && (
          <div className="map-container">
            <MapContainer
              center={mapCenter}
              zoom={12}
              style={{ height: '600px', width: '100%', borderRadius: '12px' }}
            >
              <MapController center={mapCenter} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* User location marker */}
              {userLocation && (
                <>
                  <Marker 
                    position={[userLocation.latitude, userLocation.longitude]}
                    icon={icons.user}
                  >
                    <Popup>
                      <strong>📍 Your Location</strong>
                      <br />
                      {userLocation.name || 'Current Position'}
                    </Popup>
                  </Marker>
                  
                  {/* Search radius circle */}
                  <Circle
                    key={`circle-${searchRadius}`}
                    center={[userLocation.latitude, userLocation.longitude]}
                    radius={searchRadius * 1000}
                    pathOptions={{ 
                      color: '#4A90E2', 
                      fillColor: '#4A90E2',
                      fillOpacity: 0.15,
                      weight: 2
                    }}
                  />
                </>
              )}

              {/* Hospital markers */}
              {hospitals.map((hospital) => (
                <Marker
                  key={hospital.id}
                  position={[hospital.location.latitude, hospital.location.longitude]}
                  icon={hospital.emergencySupport ? icons.emergencyHospital : icons.hospital}
                >
                  <Popup>
                    <div className="marker-popup" style={{ minWidth: '280px' }}>
                      <div style={{ marginBottom: '12px' }}>
                        <strong style={{ fontSize: '14px' }}>
                          {hospital.emergencySupport ? '🚑' : '🏥'} {hospital.name}
                        </strong>
                      </div>

                      {/* Hospital Details */}
                      <div style={{ fontSize: '12px', marginBottom: '10px', color: '#555' }}>
                        <p style={{ margin: '2px 0' }}>{hospital.address}</p>
                        <p style={{ margin: '2px 0' }}>{hospital.city}, {hospital.state}</p>
                        <p style={{ margin: '4px 0' }}>
                          <strong>📍 Distance:</strong> {formatDistance(hospital.distance)}
                        </p>
                        <p style={{ margin: '4px 0' }}>
                          <strong>📞 Phone:</strong> {hospital.phone}
                        </p>
                        <p style={{ margin: '4px 0' }}>
                          <strong>Status:</strong> {hospital.emergencySupport ? 'Available for emergency support' : 'General support'}
                        </p>
                      </div>

                      {/* Emergency Badge */}
                      {hospital.emergencySupport && (
                        <div style={{ 
                          backgroundColor: '#fee2e2', 
                          color: '#991b1b',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          marginBottom: '8px',
                          textAlign: 'center'
                        }}>
                          🚑 Emergency Support Available
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                        <button
                          className="btn-agree"
                          onClick={() => handleQuickAgree(hospital)}
                          style={{
                            flex: 1,
                            padding: '8px 10px',
                            backgroundColor: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                            transition: 'background-color 0.2s'
                          }}
                          title="Quickly agree to provide blood to this hospital"
                        >
                          Quick Accept
                        </button>
                        <button
                          className="btn-view-details"
                          onClick={() => {
                            // Route protection enforces access; do not block on client-side role mismatch.
                            navigate(`/admin/emergency?hospitalId=${hospital.id}`);
                          }}
                          style={{
                            flex: 1,
                            padding: '8px 10px',
                            backgroundColor: '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                            transition: 'background-color 0.2s'
                          }}
                          title="Open emergency desk"
                        >
                          Open Desk
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Camp markers */}
              {camps.map((camp) => (
                <Marker
                  key={camp.id}
                  position={[camp.location.latitude, camp.location.longitude]}
                  icon={icons.camp}
                >
                  <Popup>
                    <div className="marker-popup">
                      <strong>🏕️ {camp.name}</strong>
                      <p>{camp.venue.name}</p>
                      <p>{camp.venue.city}, {camp.venue.state}</p>
                      <p><strong>Distance:</strong> {formatDistance(camp.distance)}</p>
                      <p><strong>Date:</strong> {new Date(camp.date).toLocaleDateString()}</p>
                      <p><strong>Slots Available:</strong> {camp.availability.available}/{camp.availability.total}</p>
                      <p><strong>Organizer:</strong> {camp.organizer}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>

            <div className="map-legend">
              <h4>Legend:</h4>
              <div className="legend-item">
                <span style={{color: '#4A90E2', fontSize: '20px'}}>📍</span>
                <span>Your Location</span>
              </div>
              <div className="legend-item">
                <span style={{color: '#E74C3C', fontSize: '20px'}}>🏥</span>
                <span>Emergency Hospital</span>
              </div>
              <div className="legend-item">
                <span style={{color: '#3498DB', fontSize: '20px'}}>🏥</span>
                <span>Regular Hospital</span>
              </div>
              <div className="legend-item">
                <span style={{color: '#2ECC71', fontSize: '20px'}}>🏕️</span>
                <span>Blood Donation Camp</span>
              </div>
            </div>
          </div>
        )}

        {/* Hospitals List Tab */}
        {activeTab === 'hospitals' && (
          <div className="list-container">
            {loading ? (
              <div className="loading-spinner">Loading hospitals...</div>
            ) : hospitals.length === 0 ? (
              <div className="empty-state">
                <p>No hospitals found within {searchRadius}km radius</p>
                <button onClick={() => setSearchRadius(searchRadius + 20)}>
                  Increase Search Radius
                </button>
              </div>
            ) : (
              <div className="resource-list">
                {hospitals.map((hospital, index) => (
                  <div key={hospital.id} className="resource-card hospital-card">
                    <div className="card-header">
                      <div className="card-rank">#{index + 1}</div>
                      <div className="card-title">
                        <h3>{hospital.emergencySupport ? '🚑' : '🏥'} {hospital.name}</h3>
                        {hospital.emergencySupport && (
                          <span className="badge emergency-badge">Emergency Support</span>
                        )}
                      </div>
                    </div>
                    <div className="card-body">
                      <p><strong>📍 Location:</strong> {hospital.address}, {hospital.city}</p>
                      <p><strong>📞 Phone:</strong> {hospital.phone}</p>
                      <p><strong>📧 Email:</strong> {hospital.email}</p>
                      <p><strong>🚗 Distance:</strong> {formatDistance(hospital.distance)}</p>
                      <p><strong>⏱️ Est. Travel Time:</strong> ~{Math.round(hospital.distance * 2)} mins</p>
                    </div>
                    <div className="card-actions">
                      <button className="btn-secondary" onClick={() => setSelectedMarker(hospital)}>View Details</button>
                      <button className="btn-primary" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${hospital.location.latitude},${hospital.location.longitude}`, '_blank')}>Get Directions</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Camps List Tab */}
        {activeTab === 'camps' && (
          <div className="list-container">
            {loading ? (
              <div className="loading-spinner">Loading blood camps...</div>
            ) : camps.length === 0 ? (
              <div className="empty-state">
                <p>No upcoming blood camps found within {searchRadius}km radius</p>
                <button onClick={() => setSearchRadius(searchRadius + 20)}>
                  Increase Search Radius
                </button>
              </div>
            ) : (
              <div className="resource-list">
                {camps.map((camp, index) => (
                  <div key={camp.id} className="resource-card camp-card">
                    <div className="card-header">
                      <div className="card-rank">#{index + 1}</div>
                      <div className="card-title">
                        <h3>🏕️ {camp.name}</h3>
                        <span className={`badge ${camp.availability.available > 50 ? 'success' : 'warning'}`}>
                          {camp.availability.available} slots available
                        </span>
                      </div>
                    </div>
                    <div className="card-body">
                      <p><strong>📍 Venue:</strong> {camp.venue.name}, {camp.venue.city}</p>
                      <p><strong>📅 Date:</strong> {new Date(camp.date).toLocaleDateString('en-US', { 
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                      })}</p>
                      <p><strong>👥 Organizer:</strong> {camp.organizer}</p>
                      <p><strong>🚗 Distance:</strong> {formatDistance(camp.distance)}</p>
                      <p><strong>📊 Capacity:</strong> {camp.availability.booked}/{camp.availability.total} booked</p>
                    </div>
                    <div className="card-actions">
                      <button className="btn-secondary" onClick={() => setSelectedMarker(camp)}>View Details</button>
                      <button className="btn-primary" onClick={() => {
                        const token = localStorage.getItem('token');
                        if (!token) { alert('Please login to book a slot'); return; }
                        window.location.href = `/blood-camps/${camp.id || camp._id}`;
                      }}>Book Slot</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Insights Tab */}
        {activeTab === 'insights' && analytics && (
          <div className="insights-container">
            <div className="insight-section">
              <h2>📊 Coverage Analysis</h2>
              <div className="insight-grid">
                <div className="insight-box">
                  <h4>Hospital Coverage</h4>
                  <p className="insight-value">{analytics.insights.hospitalDensity}</p>
                  <p className="insight-description">
                    {analytics.statistics.totalHospitals} hospitals within {searchRadius}km radius
                  </p>
                </div>
                <div className="insight-box">
                  <h4>Emergency Readiness</h4>
                  <p className="insight-value">{analytics.insights.emergencyCoverage}</p>
                  <p className="insight-description">
                    {analytics.statistics.emergencyHospitals} emergency-capable facilities
                  </p>
                </div>
                <div className="insight-box">
                  <h4>Community Activity</h4>
                  <p className="insight-value">{analytics.insights.campActivity}</p>
                  <p className="insight-description">
                    {analytics.statistics.upcomingCamps} upcoming blood donation camps
                  </p>
                </div>
              </div>
            </div>

            {analytics.nearestEmergency && (
              <div className="insight-section highlight">
                <h2>🚑 Nearest Emergency Hospital</h2>
                <div className="emergency-info">
                  <h3>{analytics.nearestEmergency.name}</h3>
                  <p><strong>Distance:</strong> {formatDistance(analytics.nearestEmergency.distance)}</p>
                  <p><strong>Estimated Time:</strong> ~{Math.round(analytics.nearestEmergency.distance * 2)} minutes</p>
                </div>
              </div>
            )}

            {analytics.upcomingCampDetails && analytics.upcomingCampDetails.length > 0 && (
              <div className="insight-section">
                <h2>🏕️ Upcoming Blood Donation Opportunities</h2>
                <div className="camp-timeline">
                  {analytics.upcomingCampDetails.map((camp, index) => (
                    <div key={index} className="timeline-item">
                      <div className="timeline-marker">{index + 1}</div>
                      <div className="timeline-content">
                        <h4>{camp.name}</h4>
                        <p><strong>Date:</strong> {new Date(camp.date).toLocaleDateString()}</p>
                        <p><strong>Location:</strong> {camp.venue} ({formatDistance(camp.distance)})</p>
                        <p><strong>Slots:</strong> {camp.slotsAvailable} available</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="insight-section">
              <h2>💡 Recommendations</h2>
              <div className="recommendation-box">
                <p>{analytics.insights.recommendation}</p>
              </div>
            </div>

            <div className="insight-section">
              <h2>🎯 Use Cases & Benefits</h2>
              <div className="use-cases-grid">
                <div className="use-case-card">
                  <h4>🚨 Emergency Response</h4>
                  <p>Quickly locate nearest emergency hospitals with blood availability for critical situations</p>
                </div>
                <div className="use-case-card">
                  <h4>🩸 Blood Donation</h4>
                  <p>Find convenient nearby blood camps and schedule donations to save lives</p>
                </div>
                <div className="use-case-card">
                  <h4>🏥 Hospital Discovery</h4>
                  <p>Discover all blood banks and hospitals in your area for routine needs</p>
                </div>
                <div className="use-case-card">
                  <h4>📊 Coverage Planning</h4>
                  <p>Analyze blood bank coverage to identify underserved areas and plan new facilities</p>
                </div>
                <div className="use-case-card">
                  <h4>🗺️ Route Optimization</h4>
                  <p>Calculate distances and travel times for efficient blood transport logistics</p>
                </div>
                <div className="use-case-card">
                  <h4>🌐 Community Engagement</h4>
                  <p>Connect with nearby donation camps and participate in local blood donation drives</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Agree Modal */}
      {showQuickAgreeModal && selectedHospitalForAgreement && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            animation: 'slideUp 0.3s ease-out'
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '16px', color: '#111' }}>
              Confirm Quick Accept
            </h2>

            <div style={{
              backgroundColor: '#f3f4f6',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <p style={{ margin: '8px 0', fontSize: '14px' }}>
                <strong>Hospital:</strong> {selectedHospitalForAgreement.name}
              </p>
              <p style={{ margin: '8px 0', fontSize: '14px' }}>
                <strong>Distance:</strong> {formatDistance(selectedHospitalForAgreement.distance)}
              </p>
              <p style={{ margin: '8px 0', fontSize: '14px' }}>
                <strong>Location:</strong> {selectedHospitalForAgreement.city}, {selectedHospitalForAgreement.state}
              </p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                📞 Contact Information:
              </label>
              <p style={{ margin: '4px 0', fontSize: '13px' }}>
                <strong>Phone:</strong> {selectedHospitalForAgreement.phone}
              </p>
              <p style={{ margin: '4px 0', fontSize: '13px' }}>
                <strong>Email:</strong> {selectedHospitalForAgreement.email}
              </p>
            </div>

            <div style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #86efac',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#166534' }}>
                By clicking "Confirm", you share emergency support readiness for this hospital.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setShowQuickAgreeModal(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#e5e7eb',
                  color: '#111',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  navigate(`/admin/emergency?hospitalId=${selectedHospitalForAgreement.id}`);
                  setShowQuickAgreeModal(false);
                  setSelectedHospitalForAgreement(null);
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px'
                }}
              >
                Confirm
              </button>
            </div>
          </div>

          <style>{`
            @keyframes slideUp {
              from {
                opacity: 0;
                transform: translateY(20px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default GeoIntelligence;
