/**
 * MyResponsesTab Component
 * 
 * Displays user's emergency response history
 * Shows status, timestamps, and hospital confirmation status
 */

import React from 'react';
import './MyResponsesTab.css';

const MyResponsesTab = ({ responses }) => {
  /**
   * Get status badge configuration
   */
  const getStatusConfig = (responseStatus, status) => {
    if (responseStatus === 'RESPONDED') {
      return {
        color: '#3498db',
        icon: '✅',
        text: 'Responded',
        subtitle: 'Awaiting Hospital Confirmation'
      };
    } else if (responseStatus === 'NOT_AVAILABLE') {
      return {
        color: '#95a5a6',
        icon: '❌',
        text: 'Not Available',
        subtitle: 'Response Recorded'
      };
    } else if (responseStatus === 'REMIND_LATER') {
      return {
        color: '#f39c12',
        icon: '⏰',
        text: 'Reminder Set',
        subtitle: 'Will notify you'
      };
    }
    return {
      color: '#7f8c8d',
      icon: '📋',
      text: 'Unknown',
      subtitle: ''
    };
  };

  /**
   * Format date and time
   */
  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    // If less than 1 hour, show minutes ago
    if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    }

    // If less than 24 hours, show hours ago
    if (diffMins < 1440) {
      const hours = Math.floor(diffMins / 60);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    }

    // Otherwise show date and time
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Empty state
  if (!responses || responses.length === 0) {
    return (
      <div className="my-responses-tab">
        <div className="no-responses-state">
          <div className="no-responses-icon">📭</div>
          <h3>No Responses Yet</h3>
          <p>You haven't responded to any emergency events yet.</p>
          <p className="hint-text">When you respond to an emergency, it will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-responses-tab">
      <div className="responses-header">
        <h3>My Emergency Responses</h3>
        <span className="responses-count">{responses.length} response{responses.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="responses-list">
        {responses.map((response) => {
          const statusConfig = getStatusConfig(response.responseStatus, response.status);
          const eventDetails = response.eventDetails;

          return (
            <div key={response.responseId} className="response-item">
              {/* Status Badge */}
              <div 
                className="response-status-badge"
                style={{ backgroundColor: statusConfig.color }}
              >
                <span className="status-icon">{statusConfig.icon}</span>
                <div className="status-text">
                  <strong>{statusConfig.text}</strong>
                  <small>{statusConfig.subtitle}</small>
                </div>
              </div>

              {/* Response Content */}
              <div className="response-content">
                {/* Hospital Name */}
                <h4 className="response-hospital">
                  🏥 {response.hospitalName || eventDetails?.hospitalName || 'Unknown Hospital'}
                </h4>

                {/* Blood Group and Units */}
                <div className="response-details">
                  <div className="detail-item">
                    <span className="detail-label">Blood Group:</span>
                    <span className="blood-group-badge-small">
                      {response.bloodGroup || eventDetails?.bloodGroupRequired}
                    </span>
                  </div>

                  {eventDetails?.unitsRequired && (
                    <div className="detail-item">
                      <span className="detail-label">Units Needed:</span>
                      <span className="detail-value">{eventDetails.unitsRequired} units</span>
                    </div>
                  )}

                  {eventDetails?.urgencyLevel && (
                    <div className="detail-item">
                      <span className="detail-label">Urgency:</span>
                      <span 
                        className="urgency-tag"
                        style={{
                          color: eventDetails.urgencyLevel === 'CRITICAL' ? '#e74c3c' : '#f39c12'
                        }}
                      >
                        {eventDetails.urgencyLevel}
                      </span>
                    </div>
                  )}
                </div>

                {/* Event Description */}
                {eventDetails?.description && (
                  <p className="response-event-description">
                    {eventDetails.description}
                  </p>
                )}

                {/* Timestamp */}
                <div className="response-timestamp">
                  <span className="timestamp-icon">🕐</span>
                  <span className="timestamp-text">
                    Responded {formatDateTime(response.responseTime)}
                  </span>
                </div>

                {/* Confirmation Status */}
                {response.responseStatus === 'RESPONDED' && (
                  <div className="confirmation-status">
                    <div className="status-indicator pending">
                      <span className="indicator-dot"></span>
                      <span>Awaiting Hospital Confirmation</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MyResponsesTab;
