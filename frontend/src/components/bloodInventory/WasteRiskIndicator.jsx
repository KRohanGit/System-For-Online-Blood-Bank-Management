import React from 'react';
import './WasteRiskIndicator.css';

/**
 * Waste Risk Indicator for Blood Units
 * Shows risk level and suggested actions
 */

const calculateWasteRisk = (unit) => {
  const now = new Date();
  const expiry = new Date(unit.expiryDate);
  const hoursLeft = (expiry - now) / (1000 * 60 * 60);
  
  let riskLevel, riskPercentage, color, icon, action;

  if (hoursLeft < 24) {
    riskLevel = 'CRITICAL';
    riskPercentage = 95;
    color = '#dc2626';
    icon = '🚨';
    action = 'URGENT: Issue immediately or transfer to nearby hospital';
  } else if (hoursLeft < 48) {
    riskLevel = 'HIGH';
    riskPercentage = 75;
    color = '#ea580c';
    icon = '⚠️';
    action = 'High priority: Schedule for immediate use or transfer';
  } else if (hoursLeft < 72) {
    riskLevel = 'MEDIUM';
    riskPercentage = 50;
    color = '#f59e0b';
    icon = '⏰';
    action = 'Prioritize for upcoming procedures';
  } else if (hoursLeft < 120) {
    riskLevel = 'LOW';
    riskPercentage = 25;
    color = '#fbbf24';
    icon = '📋';
    action = 'Monitor closely and plan usage';
  } else {
    riskLevel = 'MINIMAL';
    riskPercentage = 10;
    color = '#10b981';
    icon = '✓';
    action = 'Normal inventory management';
  }

  return {
    riskLevel,
    riskPercentage,
    color,
    icon,
    action,
    hoursLeft: Math.round(hoursLeft),
    daysLeft: Math.floor(hoursLeft / 24)
  };
};

/**
 * Suggest nearby hospitals based on location and blood type
 */
const getSuggestedHospitals = (unit, nearbyHospitals = []) => {
  return Array.isArray(nearbyHospitals) ? nearbyHospitals : [];
};

const WasteRiskIndicator = ({ unit, showSuggestions = true, compact = false, nearbyHospitals = [] }) => {
  const riskData = calculateWasteRisk(unit);
  const suggestedHospitals = showSuggestions ? getSuggestedHospitals(unit, nearbyHospitals) : [];

  if (compact) {
    return (
      <div className="waste-risk-compact" style={{ borderLeftColor: riskData.color }}>
        <span className="risk-icon">{riskData.icon}</span>
        <span className="risk-label">{riskData.riskLevel}</span>
        <span className="risk-percentage" style={{ color: riskData.color }}>
          {riskData.riskPercentage}%
        </span>
      </div>
    );
  }

  return (
    <div className="waste-risk-indicator">
      <div className="risk-header">
        <div className="risk-badge" style={{ backgroundColor: riskData.color }}>
          <span className="badge-icon">{riskData.icon}</span>
          <div className="badge-content">
            <span className="badge-title">Waste Risk</span>
            <span className="badge-level">{riskData.riskLevel}</span>
          </div>
          <span className="badge-percentage">{riskData.riskPercentage}%</span>
        </div>
      </div>

      <div className="risk-timeline">
        <div className="timeline-item">
          <span className="timeline-icon">⏰</span>
          <div className="timeline-content">
            <strong>Time Remaining:</strong>
            <span className="timeline-value">
              {riskData.daysLeft > 0 
                ? `${riskData.daysLeft} days ${riskData.hoursLeft % 24} hours`
                : `${riskData.hoursLeft} hours`}
            </span>
          </div>
        </div>

        <div className="timeline-item">
          <span className="timeline-icon">📅</span>
          <div className="timeline-content">
            <strong>Expiry Date:</strong>
            <span className="timeline-value">
              {new Date(unit.expiryDate).toLocaleDateString()} 
              {' '}
              {new Date(unit.expiryDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        <div className="timeline-item">
          <span className="timeline-icon">🩸</span>
          <div className="timeline-content">
            <strong>Blood Unit:</strong>
            <span className="timeline-value">{unit.bloodGroup} - {unit.bloodUnitId || unit.unitId}</span>
          </div>
        </div>
      </div>

      <div className="risk-action">
        <h4>Recommended Action</h4>
        <p className="action-text">{riskData.action}</p>
      </div>

      {showSuggestions && riskData.riskPercentage >= 50 && suggestedHospitals.length > 0 && (
        <div className="suggested-transfers">
          <h4>Suggested Transfer Locations</h4>
          <p className="transfer-note">
            Consider transferring to nearby hospitals to prevent waste:
          </p>
          <div className="hospitals-list">
            {suggestedHospitals.map((hospital) => (
              <div key={hospital.id} className="hospital-item">
                <div className="hospital-info">
                  <span className="hospital-icon">🏥</span>
                  <div className="hospital-details">
                    <strong>{hospital.name}</strong>
                    <span className="hospital-distance">{hospital.distance}</span>
                  </div>
                </div>
                <a 
                  href={`tel:${hospital.contact}`}
                  className="hospital-contact"
                >
                  📞 {hospital.contact}
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {showSuggestions && riskData.riskPercentage >= 50 && suggestedHospitals.length === 0 && (
        <div className="suggested-transfers">
          <h4>Suggested Transfer Locations</h4>
          <p className="transfer-note">No nearby hospitals are currently available from live data.</p>
        </div>
      )}

      <div className="risk-progress">
        <div className="progress-label">
          <span>Waste Risk Level</span>
          <span>{riskData.riskPercentage}%</span>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ 
              width: `${riskData.riskPercentage}%`,
              backgroundColor: riskData.color 
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default WasteRiskIndicator;
export { calculateWasteRisk, getSuggestedHospitals };
