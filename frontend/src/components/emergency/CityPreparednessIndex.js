import React from 'react';
import './CityPreparednessIndex.css';

const CityPreparednessIndex = ({ preparedness }) => {
  const { score = 0, factors = {} } = preparedness || {};

  const getScoreColor = (score) => {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'moderate';
    return 'poor';
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Moderate';
    return 'Needs Improvement';
  };

  const scoreClass = getScoreColor(score);

  return (
    <div className="preparedness-index">
      <div className="preparedness-header">
        <h3>City Preparedness Index</h3>
        <div className={`overall-score score-${scoreClass}`}>
          <div className="score-value">{score}</div>
          <div className="score-label">{getScoreLabel(score)}</div>
        </div>
      </div>

      <div className="factors-grid">
        <FactorBar 
          label="Inventory Level"
          value={factors.inventoryLevel || 0}
          icon="📦"
        />
        <FactorBar 
          label="Hospital Capacity"
          value={factors.hospitalCapacity || 0}
          icon="🏥"
        />
        <FactorBar 
          label="Response Readiness"
          value={factors.responseReadiness || 0}
          icon="⚡"
        />
        <FactorBar 
          label="Donor Availability"
          value={factors.donorAvailability || 0}
          icon="🩸"
        />
      </div>
    </div>
  );
};

const FactorBar = ({ label, value, icon }) => {
  const getBarColor = (value) => {
    if (value >= 75) return '#4caf50';
    if (value >= 50) return '#ff9800';
    return '#f44336';
  };

  return (
    <div className="factor-bar">
      <div className="factor-header">
        <span className="factor-icon">{icon}</span>
        <span className="factor-label">{label}</span>
        <span className="factor-value">{value}%</span>
      </div>
      <div className="factor-progress">
        <div 
          className="factor-fill"
          style={{ 
            width: `${value}%`,
            background: getBarColor(value)
          }}
        />
      </div>
    </div>
  );
};

export default CityPreparednessIndex;
