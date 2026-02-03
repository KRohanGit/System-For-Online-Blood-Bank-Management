import React from 'react';
import './EmergencyAlertBanner.css';

/**
 * Emergency Alerts Display
 * Color-coded urgent items requiring doctor attention
 */
const EmergencyAlertBanner = ({ alerts = [] }) => {
  if (!alerts || alerts.length === 0) {
    return null;
  }

  const getUrgencyColor = (urgency) => {
    const colors = {
      critical: '#dc3545',
      urgent: '#fd7e14',
      routine: '#28a745'
    };
    return colors[urgency] || '#ffc107';
  };

  const getUrgencyIcon = (urgency) => {
    const icons = {
      critical: '🚨',
      urgent: '⚠️',
      routine: 'ℹ️'
    };
    return icons[urgency] || '📋';
  };

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="emergency-alert-banner">
      <div className="banner-header">
        <h3>🔴 Emergency Alerts</h3>
        <span className="alert-count">{alerts.length}</span>
      </div>
      <div className="alerts-container">
        {alerts.map((alert, index) => (
          <div 
            key={index} 
            className="alert-item"
            style={{ borderLeftColor: getUrgencyColor(alert.urgencyLevel) }}
          >
            <div className="alert-icon">
              {getUrgencyIcon(alert.urgencyLevel)}
            </div>
            <div className="alert-content">
              <div className="alert-header-row">
                <span className="alert-type">{alert.consultType?.replace(/_/g, ' ').toUpperCase()}</span>
                <span 
                  className="alert-urgency"
                  style={{ backgroundColor: getUrgencyColor(alert.urgencyLevel) }}
                >
                  {alert.urgencyLevel}
                </span>
              </div>
              <p className="alert-query">{alert.medicalQuery}</p>
              <div className="alert-footer">
                <span className="alert-hospital">{alert.requestingHospitalName}</span>
                <span className="alert-time">{getTimeAgo(alert.createdAt)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EmergencyAlertBanner;
