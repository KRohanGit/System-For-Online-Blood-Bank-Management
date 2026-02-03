import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getScenarioById, rerunSimulation, updateRecommendation } from '../../services/emergencyIntelligenceApi';
import HospitalRiskCard from '../../components/emergency/HospitalRiskCard';
import CityPreparednessIndex from '../../components/emergency/CityPreparednessIndex';
import PropagationTimeline from '../../components/emergency/PropagationTimeline';
import RecommendationsList from '../../components/emergency/RecommendationsList';
import BloodGroupMeter from '../../components/emergency/BloodGroupMeter';
import './ScenarioDetails.css';

const ScenarioDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [scenario, setScenario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showWhatIf, setShowWhatIf] = useState(false);

  useEffect(() => {
    loadScenario();
  }, [id]);

  const loadScenario = async () => {
    try {
      setLoading(true);
      const response = await getScenarioById(id);
      if (response.success) {
        setScenario(response.data);
      }
    } catch (err) {
      console.error('Load scenario error:', err);
      setError(err.response?.data?.message || 'Failed to load scenario');
    } finally {
      setLoading(false);
    }
  };

  const handleRerun = async (modifications) => {
    try {
      const response = await rerunSimulation(id, modifications);
      if (response.success) {
        setScenario(response.data);
        setShowWhatIf(false);
        alert('Simulation re-run successfully!');
      }
    } catch (err) {
      console.error('Rerun error:', err);
      alert('Failed to re-run simulation');
    }
  };

  const handleApproveRecommendation = async (index) => {
    try {
      await updateRecommendation(id, index, { approved: true });
      await loadScenario();
      alert('Recommendation approved');
    } catch (err) {
      console.error('Approve error:', err);
      alert('Failed to approve recommendation');
    }
  };

  const handleRejectRecommendation = async (index) => {
    try {
      await updateRecommendation(id, index, { approved: false });
      await loadScenario();
      alert('Recommendation rejected');
    } catch (err) {
      console.error('Reject error:', err);
      alert('Failed to reject recommendation');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Loading scenario...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>{error}</p>
        <button onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );
  }

  if (!scenario) {
    return <div className="error-container">Scenario not found</div>;
  }

  const { 
    incidentType, 
    incidentLocation, 
    estimatedCasualties,
    incidentTime,
    projectedBloodDemand,
    hospitalImpacts,
    propagationTimeline,
    recommendations,
    cityPreparednessIndex,
    isSimulation
  } = scenario;

  return (
    <div className="scenario-details-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← Back to Dashboard
        </button>
        <div className="header-content">
          <h1>Emergency Scenario Analysis</h1>
          {isSimulation && (
            <span className="simulation-badge">🔬 SIMULATION MODE</span>
          )}
        </div>
      </div>

      {/* Incident Overview */}
      <div className="section incident-overview">
        <h2>Incident Overview</h2>
        <div className="overview-grid">
          <div className="overview-card">
            <span className="card-label">Type</span>
            <span className="card-value">{incidentType.replace(/_/g, ' ')}</span>
          </div>
          <div className="overview-card">
            <span className="card-label">Location</span>
            <span className="card-value">{incidentLocation.areaName}, {incidentLocation.city}</span>
          </div>
          <div className="overview-card">
            <span className="card-label">Casualties</span>
            <span className="card-value">{estimatedCasualties}</span>
          </div>
          <div className="overview-card">
            <span className="card-label">Time</span>
            <span className="card-value">{new Date(incidentTime).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Blood Demand Analysis */}
      <div className="section blood-demand">
        <h2>Projected Blood Demand</h2>
        <div className="demand-summary">
          <div className="demand-card">
            <span className="demand-label">Total Units Required</span>
            <span className="demand-value">{projectedBloodDemand?.totalUnits || 0}</span>
          </div>
          <div className="demand-card score">
            <span className="demand-label">Emergency Score</span>
            <span className="demand-value">{projectedBloodDemand?.emergencyDemandScore || 0}/100</span>
          </div>
          <div className="demand-card pressure">
            <span className="demand-label">Rare Blood Pressure</span>
            <span className="demand-value">{projectedBloodDemand?.rareBloodPressureIndex || 0}/100</span>
          </div>
        </div>

        {projectedBloodDemand?.byBloodGroup && (
          <div className="blood-groups-section">
            <h3>Demand by Blood Group</h3>
            <div className="blood-meters-grid">
              {Object.entries(projectedBloodDemand.byBloodGroup).map(([group, units]) => (
                <BloodGroupMeter
                  key={group}
                  bloodGroup={group}
                  available={0}
                  demand={units}
                  compact={false}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* City Preparedness */}
      {cityPreparednessIndex && (
        <div className="section">
          <CityPreparednessIndex preparedness={cityPreparednessIndex} />
        </div>
      )}

      {/* Crisis Propagation */}
      {propagationTimeline && (
        <div className="section">
          <PropagationTimeline timeline={propagationTimeline} />
        </div>
      )}

      {/* Hospital Impacts */}
      {hospitalImpacts && hospitalImpacts.length > 0 && (
        <div className="section">
          <h2>Hospital Impact Analysis</h2>
          <div className="hospitals-grid">
            {hospitalImpacts.map((hospital, index) => (
              <HospitalRiskCard
                key={index}
                hospital={hospital}
                onClick={() => {}}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <div className="section">
          <RecommendationsList
            recommendations={recommendations}
            onApprove={handleApproveRecommendation}
            onReject={handleRejectRecommendation}
            canModify={true}
          />
        </div>
      )}

      {/* What-If Simulator */}
      <div className="section">
        <button 
          className="whatif-btn"
          onClick={() => setShowWhatIf(!showWhatIf)}
        >
          {showWhatIf ? '✕ Close' : '🔄'} What-If Simulator
        </button>

        {showWhatIf && (
          <WhatIfSimulator
            currentCasualties={estimatedCasualties}
            onRerun={handleRerun}
          />
        )}
      </div>
    </div>
  );
};

const WhatIfSimulator = ({ currentCasualties, onRerun }) => {
  const [casualties, setCasualties] = useState(currentCasualties);
  const [severity, setSeverity] = useState({
    criticalPercentage: 30,
    moderatePercentage: 40,
    minorPercentage: 30
  });

  const handleRerun = () => {
    const total = severity.criticalPercentage + severity.moderatePercentage + severity.minorPercentage;
    if (total !== 100) {
      alert('Severity percentages must add up to 100%');
      return;
    }

    onRerun({
      estimatedCasualties: casualties,
      severityDistribution: severity
    });
  };

  return (
    <div className="whatif-simulator">
      <h3>Adjust Parameters</h3>
      <div className="simulator-controls">
        <div className="control-group">
          <label>Casualties</label>
          <input
            type="number"
            value={casualties}
            onChange={(e) => setCasualties(parseInt(e.target.value))}
            min="1"
          />
        </div>

        <div className="severity-sliders">
          <div className="slider-item">
            <label>Critical: {severity.criticalPercentage}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={severity.criticalPercentage}
              onChange={(e) => setSeverity({...severity, criticalPercentage: parseInt(e.target.value)})}
            />
          </div>
          <div className="slider-item">
            <label>Moderate: {severity.moderatePercentage}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={severity.moderatePercentage}
              onChange={(e) => setSeverity({...severity, moderatePercentage: parseInt(e.target.value)})}
            />
          </div>
          <div className="slider-item">
            <label>Minor: {severity.minorPercentage}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={severity.minorPercentage}
              onChange={(e) => setSeverity({...severity, minorPercentage: parseInt(e.target.value)})}
            />
          </div>
        </div>

        <button className="rerun-btn" onClick={handleRerun}>
          🔄 Re-run Simulation
        </button>
      </div>
    </div>
  );
};

export default ScenarioDetails;
