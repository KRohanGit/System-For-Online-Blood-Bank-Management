import React from 'react';
import './EmergencyCard.css';

const EmergencyCard = ({ emergency, onFastTrack }) => {
  const getTimeElapsed = () => {
    const now = new Date();
    const created = new Date(emergency.createdAt);
    const diffMinutes = Math.floor((now - created) / 60000);
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours} hr ago`;
  };

  const getUrgencyColor = () => {
    const now = new Date();
    const created = new Date(emergency.createdAt);
    const diffMinutes = Math.floor((now - created) / 60000);
    if (diffMinutes > 120) return 'critical';
    if (diffMinutes > 60) return 'high';
    return 'medium';
  };

  return (
    <div className={`emergency-card ${getUrgencyColor()}`}>
      <div className="emergency-header">
        <div className="time-badge">{getTimeElapsed()}</div>
        <span className="emergency-icon">🚨</span>
      </div>

      <div className="card-body">
        <h4>{emergency.patientName}</h4>
        
        <div className="info-row">
          <span className="label">Blood Group:</span>
          <span className="value blood-group">{emergency.bloodGroup}</span>
        </div>
        <div className="info-row">
          <span className="label">Units Required:</span>
          <span className="value urgent">{emergency.unitsRequired} units</span>
        </div>
        <div className="info-row">
          <span className="label">Hospital:</span>
          <span className="value">{emergency.hospitalName}</span>
        </div>
        <div className="info-row">
          <span className="label">Emergency Type:</span>
          <span className="value">{emergency.emergencyType}</span>
        </div>
        <div className="info-row">
          <span className="label">Clinical Details:</span>
          <span className="value">{emergency.clinicalReason}</span>
        </div>
        <div className="info-row">
          <span className="label">Contact:</span>
          <span className="value">{emergency.contactNumber}</span>
        </div>
      </div>

      <div className="card-footer">
        <button onClick={onFastTrack} className="fast-track-btn">
          🚀 Fast-Track Approval
        </button>
      </div>
    </div>
  );
};

export default EmergencyCard;
