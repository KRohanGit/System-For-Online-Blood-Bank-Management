import React from 'react';
import './RiskLevelBadge.css';

const RiskLevelBadge = ({ level, size = 'medium' }) => {
  const getRiskColor = () => {
    switch (level) {
      case 'CRITICAL': return 'critical';
      case 'HIGH': return 'high';
      case 'MEDIUM': return 'medium';
      case 'LOW': return 'low';
      default: return 'unknown';
    }
  };

  return (
    <span className={`risk-badge risk-${getRiskColor()} risk-${size}`}>
      {level}
    </span>
  );
};

export default RiskLevelBadge;
