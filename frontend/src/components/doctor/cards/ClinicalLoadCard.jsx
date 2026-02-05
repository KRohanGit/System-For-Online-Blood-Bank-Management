/**
 * ClinicalLoadCard Component
 * 
 * Displays doctor's current clinical workload and burnout prevention metrics
 * Features:
 * - Real-time load status (LOW/MODERATE/HIGH)
 * - Metric breakdown (emergency consults, validations, on-call hours)
 * - System recommendation based on load score
 * - Color-coded visual indicators
 */

import React, { useState, useEffect } from 'react';
import { 
  getClinicalLoadMetrics, 
  calculateClinicalLoadScore 
} from '../../../services/doctorClinicalData';
import './ClinicalLoadCard.css';

const ClinicalLoadCard = () => {
  const [metrics, setMetrics] = useState(null);
  const [loadAnalysis, setLoadAnalysis] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMetrics();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(loadMetrics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadMetrics = () => {
    const currentMetrics = getClinicalLoadMetrics();
    const analysis = calculateClinicalLoadScore(currentMetrics);
    
    setMetrics(currentMetrics);
    setLoadAnalysis(analysis);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadMetrics();
    setTimeout(() => setRefreshing(false), 500);
  };

  if (!metrics || !loadAnalysis) {
    return (
      <div className="clinical-load-card loading">
        <div className="spinner-small"></div>
        <p>Loading clinical load data...</p>
      </div>
    );
  }

  return (
    <div className="clinical-load-card">
      <div className="card-header">
        <div className="header-left">
          <h3>⚡ Clinical Load Status</h3>
          <p className="card-subtitle">Real-time workload monitoring</p>
        </div>
        <button 
          className={`refresh-btn ${refreshing ? 'spinning' : ''}`}
          onClick={handleRefresh}
          title="Refresh metrics"
        >
          🔄
        </button>
      </div>

      {/* Load Status Badge */}
      <div className="load-status-section">
        <div 
          className="load-status-badge"
          style={{ backgroundColor: loadAnalysis.color }}
        >
          <div className="status-label">Current Load</div>
          <div className="status-value">{loadAnalysis.status}</div>
          <div className="status-score">{loadAnalysis.score}%</div>
        </div>

        <div className="load-progress-bar">
          <div 
            className="load-progress-fill"
            style={{ 
              width: `${loadAnalysis.score}%`,
              backgroundColor: loadAnalysis.color 
            }}
          ></div>
        </div>
      </div>

      {/* Metrics Breakdown */}
      <div className="metrics-grid">
        <div className="metric-item">
          <div className="metric-icon">🚑</div>
          <div className="metric-content">
            <div className="metric-value">{metrics.emergencyConsults1Hour}</div>
            <div className="metric-label">Emergency Consults</div>
            <div className="metric-timeframe">Last 1 hour</div>
          </div>
        </div>

        <div className="metric-item">
          <div className="metric-icon">🩸</div>
          <div className="metric-content">
            <div className="metric-value">{metrics.validationsToday}</div>
            <div className="metric-label">Blood Validations</div>
            <div className="metric-timeframe">Today</div>
          </div>
        </div>

        <div className="metric-item">
          <div className="metric-icon">⏱️</div>
          <div className="metric-content">
            <div className="metric-value">{metrics.continuousOnCallHours.toFixed(1)}h</div>
            <div className="metric-label">On-Call Duration</div>
            <div className="metric-timeframe">Continuous</div>
          </div>
        </div>

        <div className="metric-item">
          <div className="metric-icon">☕</div>
          <div className="metric-content">
            <div className="metric-value">{metrics.lastBreakTime}</div>
            <div className="metric-label">Last Break</div>
            <div className="metric-timeframe">Time since rest</div>
          </div>
        </div>
      </div>

      {/* Load Factors */}
      {loadAnalysis.reasons && loadAnalysis.reasons.length > 0 && (
        <div className="load-factors">
          <div className="factors-title">📊 Contributing Factors</div>
          <ul className="factors-list">
            {loadAnalysis.reasons.map((reason, index) => (
              <li key={index}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      {/* System Recommendation */}
      <div 
        className="recommendation-box"
        style={{ borderLeftColor: loadAnalysis.color }}
      >
        <div className="recommendation-icon">💡</div>
        <div className="recommendation-text">
          <strong>System Recommendation:</strong>
          <p>{loadAnalysis.recommendation}</p>
        </div>
      </div>

      {/* Additional Info */}
      <div className="load-footer">
        <div className="footer-item">
          <span className="footer-label">Shift ends in:</span>
          <span className="footer-value">{metrics.upcomingShiftEnd}</span>
        </div>
        <div className="footer-item">
          <span className="footer-label">Last updated:</span>
          <span className="footer-value">
            {new Date(metrics.lastUpdated).toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Info Note */}
      <div className="card-info-note">
        <small>
          ℹ️ This metric helps hospitals route emergencies efficiently and prevents doctor burnout.
          Your load status is visible to hospital coordinators.
        </small>
      </div>
    </div>
  );
};

export default ClinicalLoadCard;
