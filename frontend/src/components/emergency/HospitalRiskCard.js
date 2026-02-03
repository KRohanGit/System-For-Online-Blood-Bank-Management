import React from 'react';
import RiskLevelBadge from './RiskLevelBadge';
import BloodGroupMeter from './BloodGroupMeter';
import './HospitalRiskCard.css';

const HospitalRiskCard = ({ hospital, onClick, compact = false }) => {
  const {
    hospitalName,
    distance,
    impactLevel,
    availableUnits,
    projectedDemand,
    timeToShortage,
    bloodGroupRisks,
    overallRiskLevel
  } = hospital;

  const getImpactIcon = () => {
    switch (impactLevel) {
      case 'primary': return '🎯';
      case 'secondary': return '⚡';
      case 'tertiary': return '📍';
      default: return '🏥';
    }
  };

  const totalAvailable = Object.values(availableUnits || {}).reduce((sum, val) => sum + val, 0);
  const totalDemand = Object.values(projectedDemand || {}).reduce((sum, val) => sum + val, 0);

  return (
    <div 
      className={`hospital-risk-card ${compact ? 'compact' : ''} risk-${overallRiskLevel?.toLowerCase()}`}
      onClick={onClick}
    >
      <div className="card-header">
        <div className="hospital-title">
          <span className="impact-icon">{getImpactIcon()}</span>
          <h4>{hospitalName}</h4>
        </div>
        <RiskLevelBadge level={overallRiskLevel} size={compact ? 'small' : 'medium'} />
      </div>

      <div className="card-info">
        <div className="info-row">
          <span className="info-label">Distance:</span>
          <span className="info-value">{distance} km</span>
        </div>
        <div className="info-row">
          <span className="info-label">Impact:</span>
          <span className="info-value impact-level">{impactLevel}</span>
        </div>
        {timeToShortage !== null && timeToShortage !== undefined && (
          <div className="info-row warning">
            <span className="info-label">⏱️ Time to shortage:</span>
            <span className="info-value">{timeToShortage.toFixed(1)}h</span>
          </div>
        )}
      </div>

      {!compact && (
        <>
          <div className="inventory-summary">
            <div className="summary-item">
              <span className="summary-label">Available</span>
              <span className="summary-value">{totalAvailable}</span>
            </div>
            <div className="summary-divider">→</div>
            <div className="summary-item">
              <span className="summary-label">Demand</span>
              <span className="summary-value">{totalDemand}</span>
            </div>
            <div className="summary-divider">→</div>
            <div className="summary-item">
              <span className="summary-label">Deficit</span>
              <span className="summary-value deficit">{Math.max(0, totalDemand - totalAvailable)}</span>
            </div>
          </div>

          {bloodGroupRisks && (
            <div className="blood-groups">
              <h5>Blood Group Status</h5>
              {Object.entries(bloodGroupRisks).slice(0, 4).map(([group, risk]) => (
                <BloodGroupMeter
                  key={group}
                  bloodGroup={group}
                  available={risk.available}
                  demand={risk.demand}
                  compact={true}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default HospitalRiskCard;
