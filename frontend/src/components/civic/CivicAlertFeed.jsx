import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getCurrentLocation } from '../../services/geolocationApi';
import './CivicAlertFeed.css';

const CivicAlertFeed = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [radius, setRadius] = useState(20);
  const [selectedAlert, setSelectedAlert] = useState(null);

  useEffect(() => {
    // Try to get user's actual location
    detectUserLocation();
  }, []);

  useEffect(() => {
    if (userLocation) {
      fetchAlerts();
    }
  }, [userLocation, radius]);

  /**
   * Detect user's current geolocation
   */
  const detectUserLocation = async () => {
    setLocationLoading(true);
    setLocationError(null);
    
    try {
      const location = await getCurrentLocation();
      setUserLocation({
        lat: location.latitude,
        lng: location.longitude
      });
    } catch (error) {
      console.error('Location detection error:', error);
      setLocationError(error.message);
      // Fallback to Vizag coordinates
      setUserLocation({ lat: 17.6868, lng: 83.2185 });
    } finally {
      setLocationLoading(false);
    }
  };

  /**
   * Manually refresh location
   */
  const refreshLocation = () => {
    detectUserLocation();
  };

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `/api/public/alerts?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=${radius * 1000}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAlerts(response.data.data || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAlertTypeIcon = (type) => {
    const icons = {
      SHORTAGE: '🚨',
      EXPIRY: '⏰',
      CAMP: '🏕️',
      COMMUNITY_NOTICE: '📢'
    };
    return icons[type] || '📋';
  };

  const getAlertTypeColor = (type) => {
    const colors = {
      SHORTAGE: '#e74c3c',
      EXPIRY: '#f39c12',
      CAMP: '#2ecc71',
      COMMUNITY_NOTICE: '#3498db'
    };
    return colors[type] || '#95a5a6';
  };

  const getUrgencyClass = (score) => {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  };

  const formatTimestamp = (date) => {
    const now = new Date();
    const alertDate = new Date(date);
    const diffMs = now - alertDate;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  /**
   * Open detail modal with dummy hospital information
   */
  const handleViewDetails = (alert) => {
    // Enrich alert with dummy contact details
    const enrichedAlert = {
      ...alert,
      hospitalAddress: `${Math.floor(Math.random() * 500) + 1}, Medical Road, ${['Hyderabad', 'Vizag', 'Vijayawada', 'Guntur'][Math.floor(Math.random() * 4)]}, Telangana`,
      hospitalPhone: `+91-${Math.floor(Math.random() * 90000) + 10000}-${Math.floor(Math.random() * 90000) + 10000}`,
      emergencyContact: `+91-${Math.floor(Math.random() * 9000000000) + 1000000000}`,
      bloodBankIncharge: ['Dr. K. Rohan', 'Dr. L. Gaveshna', 'Dr. G. Giri', 'Dr. S. Dinesh'][Math.floor(Math.random() * 4)],
      operatingHours: '24/7 Emergency Services',
      bloodBankAvailable: true
    };
    setSelectedAlert(enrichedAlert);
  };

  if (loading) {
    return (
      <div className="civic-alert-loading">
        <div className="spinner"></div>
        <p>Loading alerts...</p>
      </div>
    );
  }

  return (
    <div className="civic-alert-feed">
      <div className="feed-header">
        <div className="header-title">
          <h2>🚨 Civic Blood Alert Feed</h2>
          <p>Stay informed about nearby blood needs</p>
        </div>
        
        <div className="location-controls">
          <div className="location-status">
            {locationLoading ? (
              <span className="location-loading">📍 Detecting location...</span>
            ) : locationError ? (
              <span className="location-error" title={locationError}>
                ⚠️ Using default location
              </span>
            ) : userLocation ? (
              <span className="location-success">
                ✅ Location: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
              </span>
            ) : null}
          </div>
          
          <button 
            className="refresh-location-btn" 
            onClick={refreshLocation}
            disabled={locationLoading}
            title="Refresh your location"
          >
            🔄 {locationLoading ? 'Detecting...' : 'Refresh Location'}
          </button>
        </div>
      </div>

      <div className="filter-controls">
        <div className="radius-selector">
          <label>Search Radius:</label>
          <select value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
            <option value={5}>5 km - Nearby</option>
            <option value={10}>10 km - Local</option>
            <option value={20}>20 km - City</option>
            <option value={50}>50 km - Regional</option>
            <option value={100}>100 km - Extended</option>
          </select>
        </div>
        
        <div className="alert-count">
          {alerts.length > 0 && (
            <span>{alerts.length} alert{alerts.length !== 1 ? 's' : ''} found within {radius} km</span>
          )}
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="no-alerts">
          <div className="no-alerts-icon">✨</div>
          <h3>No Active Alerts</h3>
          <p>Great news! No urgent blood requests in your area.</p>
        </div>
      ) : (
        <div className="alerts-grid">
          {alerts.map((alert) => (
            <div
              key={alert._id}
              className={`alert-card ${getUrgencyClass(alert.urgencyScore)}`}
            >
              <div className="alert-header">
                <div className="alert-type-badge" style={{ backgroundColor: getAlertTypeColor(alert.alertType) }}>
                  <span className="badge-icon">{getAlertTypeIcon(alert.alertType)}</span>
                  <span className="badge-text">{alert.alertType.replace('_', ' ')}</span>
                </div>
                <span className="alert-timestamp">{formatTimestamp(alert.createdAt)}</span>
              </div>

              <div className="alert-body">
                <h3 className="hospital-name">{alert.hospitalName || 'Unknown Hospital'}</h3>
                
                {alert.bloodGroup && (
                  <div className="blood-requirement">
                    <span className="blood-group">{alert.bloodGroup}</span>
                    {alert.unitsRequired && (
                      <span className="units-required">{alert.unitsRequired} units needed</span>
                    )}
                  </div>
                )}

                <p className="alert-description">{alert.description}</p>

                <div className="alert-meta">
                  <div className="meta-item">
                    <span className="meta-icon">📍</span>
                    <span className="meta-text">{alert.distance ? `${alert.distance} km away` : 'Location unavailable'}</span>
                  </div>
                  {alert.expiryWarningHours && (
                    <div className="meta-item">
                      <span className="meta-icon">⏱️</span>
                      <span className="meta-text">{alert.expiryWarningHours}h to expiry</span>
                    </div>
                  )}
                </div>

                <div className="urgency-indicator">
                  <div className="urgency-label">Urgency</div>
                  <div className="urgency-bar">
                    <div
                      className="urgency-fill"
                      style={{ width: `${alert.urgencyScore}%` }}
                    ></div>
                  </div>
                  <div className="urgency-score">{alert.urgencyScore}%</div>
                </div>
              </div>

              <div className="alert-actions">
                <button className="btn-primary" onClick={() => handleViewDetails(alert)}>View Details</button>
                <button className="btn-secondary" title="Feature coming soon">Register Interest</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedAlert && (
        <div className="modal-overlay" onClick={() => setSelectedAlert(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{selectedAlert.hospitalName || 'Hospital'}</h2>
                <div className="modal-blood-requirement">
                  <span className="blood-group-large">{selectedAlert.bloodGroup}</span>
                  {selectedAlert.unitsRequired && (
                    <span className="units-badge">{selectedAlert.unitsRequired} units needed</span>
                  )}
                </div>
              </div>
              <button className="close-btn" onClick={() => setSelectedAlert(null)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="alert-detail-section">
                <h3>🚨 Alert Information</h3>
                <p className="alert-description-full">{selectedAlert.description}</p>
                <div className="alert-stats">
                  <div className="stat-item">
                    <span className="stat-label">Alert Type:</span>
                    <span className="stat-value">{selectedAlert.alertType?.replace('_', ' ')}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Urgency Level:</span>
                    <span className="stat-value urgency-value">{selectedAlert.urgencyScore}%</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Distance:</span>
                    <span className="stat-value">{selectedAlert.distance ? `${selectedAlert.distance} km` : 'N/A'}</span>
                  </div>
                  {selectedAlert.expiryWarningHours && (
                    <div className="stat-item">
                      <span className="stat-label">Time Remaining:</span>
                      <span className="stat-value critical">{selectedAlert.expiryWarningHours} hours</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="alert-detail-section">
                <h3>🏥 Hospital Contact Details</h3>
                <div className="contact-grid">
                  <div className="contact-item">
                    <span className="contact-icon">📍</span>
                    <div className="contact-info">
                      <strong>Address</strong>
                      <p>{selectedAlert.hospitalAddress}</p>
                    </div>
                  </div>
                  <div className="contact-item">
                    <span className="contact-icon">📞</span>
                    <div className="contact-info">
                      <strong>Phone</strong>
                      <p>{selectedAlert.hospitalPhone}</p>
                    </div>
                  </div>
                  <div className="contact-item">
                    <span className="contact-icon">🚨</span>
                    <div className="contact-info">
                      <strong>Emergency Contact</strong>
                      <p>{selectedAlert.emergencyContact}</p>
                    </div>
                  </div>
                  <div className="contact-item">
                    <span className="contact-icon">👨‍⚕️</span>
                    <div className="contact-info">
                      <strong>Blood Bank Incharge</strong>
                      <p>{selectedAlert.bloodBankIncharge}</p>
                    </div>
                  </div>
                  <div className="contact-item">
                    <span className="contact-icon">🕐</span>
                    <div className="contact-info">
                      <strong>Operating Hours</strong>
                      <p>{selectedAlert.operatingHours}</p>
                    </div>
                  </div>
                  {selectedAlert.bloodBankAvailable && (
                    <div className="contact-item">
                      <span className="contact-icon">✓</span>
                      <div className="contact-info">
                        <strong className="blood-bank-available">Blood Bank Available</strong>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-actions">
                <button className="btn-primary-large" onClick={() => setSelectedAlert(null)}>
                  Close
                </button>
                <button className="btn-secondary-large" title="Feature coming soon" disabled>
                  Register Interest
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CivicAlertFeed;
