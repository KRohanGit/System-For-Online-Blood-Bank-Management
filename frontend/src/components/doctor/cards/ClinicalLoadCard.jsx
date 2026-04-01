

import React, { useState, useEffect } from 'react';
import doctorClinicalAPI from '../../../services/doctorClinicalAPI';
import './ClinicalLoadCard.css';

const ClinicalLoadCard = () => {
  const [metrics, setMetrics] = useState(null);
  const [loadAnalysis, setLoadAnalysis] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const calculateClinicalLoadScore = (liveMetrics) => {
    let score = 0;
    const reasons = [];

    if (liveMetrics.emergencyConsults1Hour >= 5) {
      score += 40;
      reasons.push('High emergency consult volume');
    } else if (liveMetrics.emergencyConsults1Hour >= 3) {
      score += 25;
    } else if (liveMetrics.emergencyConsults1Hour >= 1) {
      score += 10;
    }

    if (liveMetrics.validationsToday >= 15) {
      score += 30;
      reasons.push('High daily validation count');
    } else if (liveMetrics.validationsToday >= 8) {
      score += 20;
    } else if (liveMetrics.validationsToday >= 4) {
      score += 10;
    }

    if (liveMetrics.continuousOnCallHours >= 8) {
      score += 30;
      reasons.push('Extended on-call duration');
    } else if (liveMetrics.continuousOnCallHours >= 6) {
      score += 20;
    } else if (liveMetrics.continuousOnCallHours >= 4) {
      score += 10;
    }

    if (score >= 60) {
      return {
        score: Math.min(score, 100),
        status: 'HIGH',
        recommendation: 'Critical load. Route new emergencies and take a short break if possible.',
        reasons
      };
    }
    if (score >= 35) {
      return {
        score: Math.min(score, 100),
        status: 'MODERATE',
        recommendation: 'Moderate load. Monitor workload and prepare for potential handover.',
        reasons
      };
    }
    return {
      score: Math.min(score, 100),
      status: 'LOW',
      recommendation: 'Load is within safe capacity.',
      reasons
    };
  };

  useEffect(() => {
    loadMetrics();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(loadMetrics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadMetrics = async () => {
    try {
      const response = await doctorClinicalAPI.getDoctorOverview();
      if (!response?.success) return;

      const pending = response.data?.pending || {};
      const availability = response.data?.availability || {};

      const currentMetrics = {
        emergencyConsults1Hour: Number(pending.consults || 0),
        validationsToday: Number(pending.validations || 0),
        continuousOnCallHours: availability.status === 'on_call' ? Number(availability.activeConsults || 0) + 1 : 0,
        lastBreakTime: availability.status === 'on_call' ? 'N/A (on call)' : 'Available',
        upcomingShiftEnd: 'N/A',
        lastUpdated: new Date().toISOString()
      };

      const analysis = calculateClinicalLoadScore(currentMetrics);
      setMetrics(currentMetrics);
      setLoadAnalysis(analysis);
    } catch (error) {
      console.error('Failed to load clinical load metrics:', error);
    }
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
