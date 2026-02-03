import React from 'react';
import './PropagationTimeline.css';

const PropagationTimeline = ({ timeline }) => {
  const { immediate, shortTerm, critical } = timeline || {};

  const getPhaseData = (phase, label, timeframe) => ({
    phase,
    label,
    timeframe,
    data: phase
  });

  const phases = [
    getPhaseData(immediate, 'Immediate Impact', '0-2 hours'),
    getPhaseData(shortTerm, 'Short-term Crisis', '2-6 hours'),
    getPhaseData(critical, 'Critical Period', '6-12 hours')
  ];

  return (
    <div className="propagation-timeline">
      <h3>Crisis Propagation Timeline</h3>
      
      <div className="timeline-phases">
        {phases.map(({ phase, label, timeframe, data }, index) => (
          <TimelinePhase
            key={index}
            label={label}
            timeframe={timeframe}
            affectedCount={data?.affectedHospitals?.length || 0}
            shortageRisk={data?.shortageRisk || 'LOW'}
            summary={data?.summary || 'No impact expected'}
          />
        ))}
      </div>
    </div>
  );
};

const TimelinePhase = ({ label, timeframe, affectedCount, shortageRisk, summary }) => {
  const getRiskClass = (risk) => {
    switch (risk) {
      case 'CRITICAL': return 'critical';
      case 'HIGH': return 'high';
      case 'MEDIUM': return 'medium';
      case 'LOW': return 'low';
      default: return 'unknown';
    }
  };

  return (
    <div className={`timeline-phase risk-${getRiskClass(shortageRisk)}`}>
      <div className="phase-marker" />
      <div className="phase-content">
        <div className="phase-header">
          <h4>{label}</h4>
          <span className="phase-timeframe">{timeframe}</span>
        </div>
        <div className="phase-stats">
          <div className="stat">
            <span className="stat-icon">🏥</span>
            <span className="stat-value">{affectedCount}</span>
            <span className="stat-label">Hospitals</span>
          </div>
          <div className="stat">
            <span className="stat-icon">⚠️</span>
            <span className={`stat-value risk-${getRiskClass(shortageRisk)}`}>
              {shortageRisk}
            </span>
            <span className="stat-label">Risk Level</span>
          </div>
        </div>
        <p className="phase-summary">{summary}</p>
      </div>
    </div>
  );
};

export default PropagationTimeline;
