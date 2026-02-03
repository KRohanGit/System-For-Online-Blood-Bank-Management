import React from 'react';
import './DoctorIdentityCard.css';

/**
 * Doctor Identity & Verification Display
 * Shows doctor credentials, status, and affiliations
 */
const DoctorIdentityCard = ({ profile, availability }) => {
  const getStatusColor = (status) => {
    const colors = {
      approved: '#28a745',
      pending: '#ffc107',
      rejected: '#dc3545',
      on_call: '#28a745',
      off_duty: '#6c757d',
      in_consult: '#fd7e14',
      emergency_only: '#dc3545'
    };
    return colors[status] || '#6c757d';
  };

  const getStatusText = (status) => {
    const labels = {
      on_call: 'On Call',
      off_duty: 'Off Duty',
      in_consult: 'In Consult',
      emergency_only: 'Emergency Only'
    };
    return labels[status] || status;
  };

  return (
    <div className="doctor-identity-card">
      <div className="identity-header">
        <div className="doctor-avatar">
          {profile?.name?.charAt(0) || 'D'}
        </div>
        <div className="doctor-details">
          <h2>{profile?.name || 'Doctor'}</h2>
          <p className="registration-number">
            Reg: {profile?.registrationNumber || 'N/A'}
          </p>
          <p className="specialization">{profile?.specialization || 'General Practice'}</p>
        </div>
        <div className="verification-badge">
          <span 
            className="verification-status"
            style={{ backgroundColor: getStatusColor('approved') }}
          >
            ✓ Verified
          </span>
        </div>
      </div>

      {availability && (
        <div className="availability-section">
          <div className="availability-indicator">
            <span 
              className="status-dot"
              style={{ backgroundColor: getStatusColor(availability.status) }}
            />
            <span className="status-text">
              {getStatusText(availability.status)}
            </span>
          </div>
          <div className="emergency-tier">
            <span className="tier-label">Emergency Tier:</span>
            <span className="tier-value">{availability.emergencyTier || 'Tier 2'}</span>
          </div>
          <div className="active-consults">
            <span className="consult-label">Active Consults:</span>
            <span className="consult-value">{availability.activeConsults || 0}</span>
          </div>
        </div>
      )}

      {profile?.affiliatedHospitals && profile.affiliatedHospitals.length > 0 && (
        <div className="affiliations-section">
          <h3>Hospital Affiliations</h3>
          <ul className="affiliations-list">
            {profile.affiliatedHospitals.map((hospital, index) => (
              <li key={index} className="affiliation-item">
                <span className="hospital-name">{hospital.hospitalName || hospital.name}</span>
                {hospital.isPrimary && <span className="primary-badge">Primary</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default DoctorIdentityCard;
