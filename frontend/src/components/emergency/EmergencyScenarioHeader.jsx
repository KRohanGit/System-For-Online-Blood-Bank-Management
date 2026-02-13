import React from 'react';

const EmergencyScenarioHeader = ({ onBack, title, subtitle }) => {
  return (
    <div className="page-header">
      <button className="back-btn" onClick={onBack}>
        ← Back
      </button>
      <div>
        <h1>{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>
    </div>
  );
};

export default EmergencyScenarioHeader;
