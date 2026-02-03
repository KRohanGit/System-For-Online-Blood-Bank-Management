import React from 'react';
import './BloodUnitCard.css';

const BloodUnitCard = ({ unit, onValidate }) => {
  const getTestStatus = (tests) => {
    if (!tests) return 'pending';
    const allPassed = Object.values(tests).every(t => t === 'negative' || t === 'pass');
    return allPassed ? 'safe' : 'unsafe';
  };

  return (
    <div className={`blood-unit-card ${getTestStatus(unit.labTests)}`}>
      <div className="card-header">
        <h4>Unit #{unit.unitNumber || unit._id.slice(-6)}</h4>
        <span className={`status-badge ${unit.validationStatus}`}>
          {unit.validationStatus}
        </span>
      </div>

      <div className="card-body">
        <div className="info-row">
          <span className="label">Blood Group:</span>
          <span className="value blood-group">{unit.bloodGroup}</span>
        </div>
        <div className="info-row">
          <span className="label">Volume:</span>
          <span className="value">{unit.volume} mL</span>
        </div>
        <div className="info-row">
          <span className="label">Collection Date:</span>
          <span className="value">{new Date(unit.collectionDate).toLocaleDateString()}</span>
        </div>
        <div className="info-row">
          <span className="label">Expiry Date:</span>
          <span className="value">{new Date(unit.expiryDate).toLocaleDateString()}</span>
        </div>
        
        {unit.labTests && (
          <div className="lab-tests">
            <h5>Lab Test Results:</h5>
            <div className="tests-grid">
              <div className={`test-item ${unit.labTests.hiv}`}>
                HIV: {unit.labTests.hiv}
              </div>
              <div className={`test-item ${unit.labTests.hepatitisB}`}>
                Hep B: {unit.labTests.hepatitisB}
              </div>
              <div className={`test-item ${unit.labTests.hepatitisC}`}>
                Hep C: {unit.labTests.hepatitisC}
              </div>
              <div className={`test-item ${unit.labTests.syphilis}`}>
                Syphilis: {unit.labTests.syphilis}
              </div>
              <div className={`test-item ${unit.labTests.malaria}`}>
                Malaria: {unit.labTests.malaria}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card-footer">
        <button onClick={onValidate} className="validate-btn">
          Validate Unit
        </button>
      </div>
    </div>
  );
};

export default BloodUnitCard;
