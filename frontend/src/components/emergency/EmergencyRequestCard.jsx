import React from 'react';
import './EmergencyRequestCard.css';

const EmergencyRequestCard = ({ request, onAccept, onReject, isOutgoing }) => {
  const getUrgencyClass = (urgency) => {
    switch(urgency?.toLowerCase()) {
      case 'critical': return 'urgency-critical';
      case 'high': return 'urgency-high';
      case 'medium': return 'urgency-medium';
      default: return 'urgency-medium';
    }
  };

  const getStatusClass = (status) => {
    switch(status?.toLowerCase()) {
      case 'accepted': return 'status-accepted';
      case 'dispatched': return 'status-dispatched';
      case 'completed': return 'status-completed';
      case 'rejected': return 'status-rejected';
      default: return 'status-pending';
    }
  };

  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className={`emergency-request-card ${getUrgencyClass(request.urgencyLevel)}`}>
      <div className="card-header">
        <div className="hospital-info">
          <h3>{isOutgoing ? request.receivingHospital?.name : request.requestingHospital?.name}</h3>
          <span className="distance">{request.distance || 'N/A'} km</span>
        </div>
        <div className="urgency-badge">
          <span className={getUrgencyClass(request.urgencyLevel)}>
            {request.urgencyLevel || 'MEDIUM'}
          </span>
        </div>
      </div>

      <div className="card-body">
        <div className="blood-info">
          <div className="blood-group">
            <span className="label">Blood Group</span>
            <span className="value">{request.bloodGroup}</span>
          </div>
          <div className="component">
            <span className="label">Component</span>
            <span className="value">{request.componentType}</span>
          </div>
          <div className="units">
            <span className="label">Units Required</span>
            <span className="value">{request.unitsRequired}</span>
          </div>
        </div>

        {request.patientCriticality && (
          <div className="criticality">
            Patient Criticality: <strong>{request.patientCriticality}</strong>
          </div>
        )}

        {request.requiredWithin && (
          <div className="required-within">
            Required Within: <strong>{request.requiredWithin}</strong>
          </div>
        )}

        {request.notes && (
          <div className="notes">
            <span className="notes-label">Notes:</span>
            <p>{request.notes}</p>
          </div>
        )}
      </div>

      <div className="card-footer">
        <div className="footer-info">
          <span className={`status ${getStatusClass(request.status)}`}>
            {request.status || 'PENDING'}
          </span>
          <span className="time-ago">{formatTimeAgo(request.createdAt)}</span>
        </div>

        {!isOutgoing && request.status === 'PENDING' && (
          <div className="action-buttons">
            <button 
              className="btn-accept"
              onClick={() => onAccept(request._id)}
            >
              Accept
            </button>
            <button 
              className="btn-reject"
              onClick={() => onReject(request._id)}
            >
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmergencyRequestCard;
