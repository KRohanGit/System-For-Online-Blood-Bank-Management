

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
        <h3>Clinical Load Status</h3>
        <button 
          className={`refresh-btn ${refreshing ? 'spinning' : ''}`}
          onClick={handleRefresh}
          title="Refresh"
        >
          Refresh
        </button>
      </div>

      <div className="load-status-section">
        <div className="load-status-badge">
          <div className="status-value">{loadAnalysis.status}</div>
          <div className="status-score">{loadAnalysis.score}%</div>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-item">
          <div className="metric-content">
            <div className="metric-value">{metrics.emergencyConsults1Hour}</div>
            <div className="metric-label">Emergency Consults (1h)</div>
          </div>
        </div>

        <div className="metric-item">
          <div className="metric-content">
            <div className="metric-value">{metrics.validationsToday}</div>
            <div className="metric-label">Blood Validations (Today)</div>
          </div>
        </div>

        <div className="metric-item">
          <div className="metric-content">
            <div className="metric-value">{metrics.continuousOnCallHours.toFixed(1)}h</div>
            <div className="metric-label">On-Call Duration</div>
          </div>
        </div>

        <div className="metric-item">
          <div className="metric-content">
            <div className="metric-value">{metrics.lastBreakTime}</div>
            <div className="metric-label">Last Break</div>
          </div>
        </div>
      </div>



      <div className="recommendation-box">
        <strong>Recommendation:</strong>
        <p>{loadAnalysis.recommendation}</p>
      </div>


    </div>
  );
};

export default ClinicalLoadCard;
