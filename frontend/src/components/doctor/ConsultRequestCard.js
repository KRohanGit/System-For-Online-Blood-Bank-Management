import React from 'react';
import './ConsultRequestCard.css';

/**
 * Emergency Consult Request Card
 * Displays consult details with accept/decline actions
 */
const ConsultRequestCard = ({ consult, onRespond }) => {
  const getUrgencyColor = (urgency) => {
    const colors = {
      critical: '#dc3545',
      urgent: '#fd7e14',
      routine: '#28a745'
    };
    return colors[urgency] || '#ffc107';
  };

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="consult-request-card">
      <div className="consult-header">
        <div className="consult-id">
          <span className="id-label">Consult ID:</span>
          <span className="id-value">{consult.consultId}</span>
        </div>
        <span 
          className="urgency-badge"
          style={{ backgroundColor: getUrgencyColor(consult.urgencyLevel) }}
        >
          {consult.urgencyLevel?.toUpperCase()}
        </span>
      </div>

      <div className="consult-info">
        <div className="info-row">
          <span className="info-label">Hospital:</span>
          <span className="info-value">{consult.requestingHospitalName}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Type:</span>
          <span className="info-value">
            {consult.consultType?.replace(/_/g, ' ').toUpperCase()}
          </span>
        </div>
        <div className="info-row">
          <span className="info-label">Requested:</span>
          <span className="info-value">{getTimeAgo(consult.createdAt)}</span>
        </div>
      </div>

      {consult.patientContext && (
        <div className="patient-context">
          <h4>Patient Context</h4>
          <div className="context-grid">
            {consult.patientContext.ageRange && (
              <div className="context-item">
                <span className="context-label">Age:</span>
                <span className="context-value">{consult.patientContext.ageRange}</span>
              </div>
            )}
            {consult.patientContext.bloodGroupRequired && (
              <div className="context-item">
                <span className="context-label">Blood Group:</span>
                <span className="context-value">{consult.patientContext.bloodGroupRequired}</span>
              </div>
            )}
            {consult.patientContext.estimatedUnitsNeeded && (
              <div className="context-item">
                <span className="context-label">Units Needed:</span>
                <span className="context-value">{consult.patientContext.estimatedUnitsNeeded}</span>
              </div>
            )}
          </div>
          {consult.patientContext.clinicalCondition && (
            <p className="clinical-condition">{consult.patientContext.clinicalCondition}</p>
          )}
        </div>
      )}

      <div className="medical-query">
        <h4>Medical Query</h4>
        <p>{consult.medicalQuery}</p>
      </div>

      <div className="consult-actions">
        <button 
          className="consult-btn accept"
          onClick={() => onRespond(consult._id, 'accept')}
        >
          ✓ Accept Consult
        </button>
        <button 
          className="consult-btn decline"
          onClick={() => onRespond(consult._id, 'decline')}
        >
          ✗ Decline
        </button>
      </div>
    </div>
  );
};

export default ConsultRequestCard;
