import React from 'react';
import './DonorCard.css';

const DonorCard = ({ donor, onScreen }) => {
  const getEligibilityColor = () => {
    if (!donor.vitals) return 'pending';
    const { bloodPressure, hemoglobin, weight } = donor.vitals;
    if (hemoglobin < 12.5 || weight < 50) return 'warning';
    return 'normal';
  };

  return (
    <div className={`donor-card ${getEligibilityColor()}`}>
      <div className="card-header">
        <h4>{donor.fullName}</h4>
        <span className={`status-badge ${donor.screeningStatus}`}>
          {donor.screeningStatus}
        </span>
      </div>

      <div className="card-body">
        <div className="info-row">
          <span className="label">Blood Group:</span>
          <span className="value blood-group">{donor.bloodGroup}</span>
        </div>
        <div className="info-row">
          <span className="label">Age:</span>
          <span className="value">{donor.age} years</span>
        </div>
        {donor.vitals && (
          <>
            <div className="info-row">
              <span className="label">BP:</span>
              <span className="value">{donor.vitals.bloodPressure}</span>
            </div>
            <div className="info-row">
              <span className="label">Hemoglobin:</span>
              <span className="value">{donor.vitals.hemoglobin} g/dL</span>
            </div>
            <div className="info-row">
              <span className="label">Weight:</span>
              <span className="value">{donor.vitals.weight} kg</span>
            </div>
          </>
        )}
        <div className="info-row">
          <span className="label">Last Donation:</span>
          <span className="value">
            {donor.lastDonation ? new Date(donor.lastDonation).toLocaleDateString() : 'First time'}
          </span>
        </div>
      </div>

      <div className="card-footer">
        <button onClick={onScreen} className="screen-btn">
          Screen Donor
        </button>
      </div>
    </div>
  );
};

export default DonorCard;
