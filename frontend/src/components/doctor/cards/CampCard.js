import React from 'react';
import './CampCard.css';

const CampCard = ({ camp, onValidate }) => {
  const checkMedicalReadiness = () => {
    const checks = {
      medicalStaff: camp.medicalStaff >= 2,
      emergencySupport: camp.emergencySupport,
      safetyEquipment: camp.safetyEquipment
    };
    return checks;
  };

  const readiness = checkMedicalReadiness();
  const allReady = Object.values(readiness).every(v => v);

  return (
    <div className={`camp-card ${allReady ? 'ready' : 'pending'}`}>
      <div className="card-header">
        <h4>{camp.name}</h4>
        <span className={`status-badge ${camp.medicalValidation}`}>
          {camp.medicalValidation || 'Pending Review'}
        </span>
      </div>

      <div className="card-body">
        <div className="info-row">
          <span className="label">Date:</span>
          <span className="value">{new Date(camp.date).toLocaleDateString()}</span>
        </div>
        <div className="info-row">
          <span className="label">Location:</span>
          <span className="value">{camp.location}</span>
        </div>
        <div className="info-row">
          <span className="label">Expected Donors:</span>
          <span className="value">{camp.expectedDonors}</span>
        </div>

        <div className="readiness-check">
          <h5>Medical Readiness:</h5>
          <div className="check-item">
            <span className={`check-icon ${readiness.medicalStaff ? 'pass' : 'fail'}`}>
              {readiness.medicalStaff ? '✓' : '✗'}
            </span>
            <span>Medical Staff: {camp.medicalStaff} (min 2)</span>
          </div>
          <div className="check-item">
            <span className={`check-icon ${readiness.emergencySupport ? 'pass' : 'fail'}`}>
              {readiness.emergencySupport ? '✓' : '✗'}
            </span>
            <span>Emergency Support</span>
          </div>
          <div className="check-item">
            <span className={`check-icon ${readiness.safetyEquipment ? 'pass' : 'fail'}`}>
              {readiness.safetyEquipment ? '✓' : '✗'}
            </span>
            <span>Safety Equipment</span>
          </div>
        </div>

        {camp.organizer && (
          <div className="info-row">
            <span className="label">Organizer:</span>
            <span className="value">{camp.organizer}</span>
          </div>
        )}
      </div>

      <div className="card-footer">
        <button onClick={onValidate} className="validate-btn">
          Review Camp
        </button>
      </div>
    </div>
  );
};

export default CampCard;
