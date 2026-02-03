import React, { useState } from 'react';
import { calculateUrgencyIndex } from './UrgencyIndexCalculator';
import './UrgencyIndexCard.css';

/**
 * Reusable Blood Demand Urgency Index Card
 * Displays urgency score with expandable breakdown
 */
const UrgencyIndexCard = ({ request, compact = false }) => {
  const [showBreakdown, setShowBreakdown] = useState(false);
  
  const urgencyData = calculateUrgencyIndex(request);
  const { score, label, color, breakdown } = urgencyData;

  if (compact) {
    return (
      <div className="urgency-badge-compact" style={{ backgroundColor: color }}>
        <span className="urgency-icon">{label === 'CRITICAL' ? '🚨' : label === 'HIGH' ? '⚠️' : label === 'MEDIUM' ? '⚡' : '✓'}</span>
        <span className="urgency-label">{label}</span>
        <span className="urgency-score">{score}</span>
      </div>
    );
  }

  return (
    <div className="urgency-index-card">
      <div className="urgency-header">
        <div className="urgency-main">
          <div 
            className="urgency-badge" 
            style={{ backgroundColor: color }}
            onClick={() => setShowBreakdown(!showBreakdown)}
          >
            <div className="badge-content">
              <span className="badge-icon">
                {label === 'CRITICAL' ? '🚨' : label === 'HIGH' ? '⚠️' : label === 'MEDIUM' ? '⚡' : '✓'}
              </span>
              <div className="badge-text">
                <span className="badge-label">{label}</span>
                <span className="badge-subtitle">Urgency Level</span>
              </div>
            </div>
            <div className="badge-score">
              <span className="score-value">{score}</span>
              <span className="score-max">/100</span>
            </div>
          </div>
          
          <button 
            className="breakdown-toggle"
            onClick={() => setShowBreakdown(!showBreakdown)}
          >
            {showBreakdown ? '▼ Hide Details' : '▶ Why this score?'}
          </button>
        </div>

        <div className="request-details">
          <div className="detail-item">
            <span className="detail-icon">🩸</span>
            <span className="detail-text">{request.bloodGroup}</span>
          </div>
          <div className="detail-item">
            <span className="detail-icon">💉</span>
            <span className="detail-text">{request.unitsRequired} units</span>
          </div>
          {request.expiryHours && (
            <div className="detail-item">
              <span className="detail-icon">⏰</span>
              <span className="detail-text">{Math.round(request.expiryHours)}h remaining</span>
            </div>
          )}
        </div>
      </div>

      {showBreakdown && (
        <div className="urgency-breakdown">
          <h4>Urgency Score Breakdown</h4>
          <div className="breakdown-list">
            {breakdown.map((item, index) => (
              <div key={index} className="breakdown-item">
                <div className="breakdown-header">
                  <span className="breakdown-factor">{item.factor}</span>
                  <span className="breakdown-score">
                    {item.score}/{item.maxScore}
                  </span>
                </div>
                <div className="breakdown-bar">
                  <div 
                    className="breakdown-fill"
                    style={{ 
                      width: `${(item.score / item.maxScore) * 100}%`,
                      backgroundColor: color
                    }}
                  />
                </div>
                <p className="breakdown-reason">{item.reason}</p>
              </div>
            ))}
          </div>
          
          <div className="breakdown-footer">
            <p className="breakdown-note">
              <strong>Note:</strong> This score is calculated using rule-based logic considering blood group rarity, 
              quantity needed, expiry timing, and nearby hospital availability. Higher scores indicate more urgent requests.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default UrgencyIndexCard;
