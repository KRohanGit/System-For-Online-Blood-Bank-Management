/**
 * EmergencyEventCard Component
 * 
 * Displays a single emergency blood event with urgency indicators,
 * time remaining, and action buttons
 */

import React from 'react';
import './EmergencyEventCard.css';

const EmergencyEventCard = ({ event, onRespond }) => {
  /**
   * Get color based on urgency level
   */
  const getUrgencyColor = (level) => {
    const colors = {
      CRITICAL: '#e74c3c',
      HIGH: '#f39c12',
      MODERATE: '#f1c40f'
    };
    return colors[level] || '#95a5a6';
  };

  /**
   * Get icon based on urgency level
   */
  const getUrgencyIcon = (level) => {
    return '';
  };

  /**
   * Format time remaining in human-readable format
   */
  const formatTimeRemaining = (hours) => {
    if (hours < 1) {
      const minutes = Math.floor(hours * 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    if (hours < 24) {
      const roundedHours = Math.floor(hours);
      return `${roundedHours} hour${roundedHours !== 1 ? 's' : ''}`;
    }
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''}`;
  };

  /**
   * Get urgency badge text
   */
  const getUrgencyBadgeText = () => {
    const timeText = formatTimeRemaining(event.hoursRemaining);
    return `Urgent – Needed within ${timeText}`;
  };

  return (
    <div 
      className="emergency-event-card"
      style={{ borderLeftColor: getUrgencyColor(event.urgencyLevel) }}
    >
      {/* Urgency Badge */}
      <div 
        className="urgency-badge"
        style={{ backgroundColor: getUrgencyColor(event.urgencyLevel) }}
      >
        <span className="urgency-text">{event.urgencyLevel}</span>
      </div>

      {/* Time Window Badge */}
      <div className="time-window-badge">
        {getUrgencyBadgeText()}
      </div>

      {/* Hospital Information */}
      <div className="event-header">
        <h3 className="hospital-name">{event.hospitalName}</h3>
        {event.distance && (
          <div className="distance-badge">
            📍 {event.distance} km away
          </div>
        )}
      </div>

      {/* Blood Requirement */}
      <div className="blood-requirement">
        <div className="blood-group-display">
          <span className="blood-group-large">{event.bloodGroupRequired}</span>
        </div>
        <div className="units-info">
          <span className="units-needed">{event.unitsRequired} units needed</span>
        </div>
      </div>

      {/* Description */}
      {event.description && (
        <p className="event-description">{event.description}</p>
      )}

      {/* Metadata */}
      <div className="event-metadata">
        <div className="metadata-item">
          <span className="metadata-icon">⏱️</span>
          <span className="metadata-text">{formatTimeRemaining(event.hoursRemaining)} remaining</span>
        </div>
        <div className="metadata-item">
          <span className="metadata-icon">🕐</span>
          <span className="metadata-text">
            {new Date(event.createdAt).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
        </div>
      </div>

      {/* Action Button */}
      <button 
        className="respond-button"
        onClick={() => onRespond(event)}
      >
        🙋‍♂️ Respond to Emergency
      </button>
    </div>
  );
};

export default EmergencyEventCard;
