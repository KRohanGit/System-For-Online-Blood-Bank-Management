import React from 'react';
import './BloodGroupMeter.css';

const BloodGroupMeter = ({ bloodGroup, available, demand, compact = false }) => {
  const calculatePercentage = () => {
    if (!demand || demand === 0) return 100;
    return Math.min(100, (available / demand) * 100);
  };

  const getStatus = () => {
    const percentage = calculatePercentage();
    if (percentage >= 80) return 'good';
    if (percentage >= 50) return 'warning';
    if (percentage >= 20) return 'critical';
    return 'severe';
  };

  const percentage = calculatePercentage();
  const status = getStatus();
  const deficit = Math.max(0, demand - available);

  return (
    <div className={`blood-meter ${compact ? 'compact' : ''}`}>
      <div className="meter-header">
        <span className="blood-group-label">{bloodGroup}</span>
        {!compact && (
          <span className="meter-values">
            {available}/{demand}
          </span>
        )}
      </div>
      <div className="meter-bar">
        <div 
          className={`meter-fill meter-${status}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {!compact && deficit > 0 && (
        <div className="meter-deficit">
          Deficit: {deficit} units
        </div>
      )}
    </div>
  );
};

export default BloodGroupMeter;
