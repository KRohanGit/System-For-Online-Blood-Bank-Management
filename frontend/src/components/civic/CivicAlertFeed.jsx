import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './CivicAlertFeed.css';

const CivicAlertFeed = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [radius, setRadius] = useState(20);

  useEffect(() => {
    getUserLocation();
  }, []);

  useEffect(() => {
    if (userLocation) {
      fetchAlerts();
    }
  }, [userLocation, radius]);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => {
          setUserLocation({ lat: 17.6868, lng: 83.2185 });
        }
      );
    } else {
      setUserLocation({ lat: 17.6868, lng: 83.2185 });
    }
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
        <div className="radius-selector">
          <label>Search Radius:</label>
          <select value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
            <option value={10}>10 km</option>
            <option value={20}>20 km</option>
            <option value={50}>50 km</option>
            <option value={100}>100 km</option>
          </select>
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
                <button className="btn-primary">View Details</button>
                <button className="btn-secondary">Register Interest</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CivicAlertFeed;
