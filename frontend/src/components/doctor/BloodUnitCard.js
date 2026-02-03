import React from 'react';
import './BloodUnitCard.css';

/**
 * Blood Unit Validation Card
 * Displays blood unit details for medical validation
 */
const BloodUnitCard = ({ unit, onValidate }) => {
  const getDaysUntilExpiry = (expiryDate) => {
    const days = Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const getExpiryColor = (days) => {
    if (days <= 3) return '#dc3545';
    if (days <= 7) return '#fd7e14';
    return '#28a745';
  };

  const daysLeft = getDaysUntilExpiry(unit.expiryDate);

  return (
    <div className="blood-unit-card">
      <div className="unit-header">
        <div className="unit-id">
          <span className="id-label">Unit ID:</span>
          <span className="id-value">{unit.bloodUnitId}</span>
        </div>
        <div 
          className="blood-group-badge"
          style={{ background: getBloodGroupColor(unit.bloodGroup) }}
        >
          {unit.bloodGroup}
        </div>
      </div>

      <div className="unit-details">
        <div className="detail-row">
          <span className="detail-label">Storage Type:</span>
          <span className="detail-value">{unit.storageType}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Volume:</span>
          <span className="detail-value">{unit.volume} ml</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Collection Date:</span>
          <span className="detail-value">
            {new Date(unit.collectionDate).toLocaleDateString()}
          </span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Expiry:</span>
          <span 
            className="detail-value expiry-highlight"
            style={{ color: getExpiryColor(daysLeft) }}
          >
            {daysLeft} days left
          </span>
        </div>
        {unit.hospitalId?.hospitalName && (
          <div className="detail-row">
            <span className="detail-label">Hospital:</span>
            <span className="detail-value">{unit.hospitalId.hospitalName}</span>
          </div>
        )}
      </div>

      {unit.donorInfo && (
        <div className="donor-section">
          <h4>Donor Information (Anonymized)</h4>
          <div className="donor-details">
            <p>Blood Group: {unit.donorInfo.donorBloodGroup}</p>
          </div>
        </div>
      )}

      <div className="validation-actions">
        <button 
          className="validate-btn approve"
          onClick={() => onValidate(unit._id, 'approved')}
        >
          ✓ Approve
        </button>
        <button 
          className="validate-btn hold"
          onClick={() => onValidate(unit._id, 'hold_for_recheck')}
        >
          ⏸ Hold for Recheck
        </button>
        <button 
          className="validate-btn reject"
          onClick={() => onValidate(unit._id, 'rejected')}
        >
          ✗ Reject
        </button>
      </div>
    </div>
  );
};

const getBloodGroupColor = (group) => {
  const colors = {
    'A+': '#e74c3c', 'A-': '#c0392b',
    'B+': '#3498db', 'B-': '#2980b9',
    'AB+': '#9b59b6', 'AB-': '#8e44ad',
    'O+': '#27ae60', 'O-': '#229954'
  };
  return colors[group] || '#95a5a6';
};

export default BloodUnitCard;
