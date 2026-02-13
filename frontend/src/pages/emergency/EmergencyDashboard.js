import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllScenarios } from '../../services/emergencyIntelligenceApi';
import RiskLevelBadge from '../../components/emergency/RiskLevelBadge';
import './EmergencyDashboard.css';

const EmergencyDashboard = () => {
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, simulation, active

  useEffect(() => {
    loadScenarios();
  }, [filter]);

  const loadScenarios = async () => {
    try {
      setLoading(true);
      const params = {};
      
      if (filter === 'simulation') {
        params.isSimulation = 'true';
      } else if (filter === 'active') {
        params.status = 'active';
        params.isSimulation = 'false';
      }

      const response = await getAllScenarios(params);
      if (response.success) {
        setScenarios(response.data);
      }
    } catch (err) {
      console.error('Load scenarios error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="emergency-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Emergency Intelligence Center</h1>
          <p className="dashboard-subtitle">
            City-Level Blood Crisis Simulation & Preparedness System
          </p>
        </div>
        <button 
          className="create-scenario-btn"
          onClick={() => navigate('/emergency-intelligence/create')}
        >
          + Create New Scenario
        </button>
      </div>

      <div className="filter-bar">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All Scenarios
        </button>
        <button 
          className={`filter-btn ${filter === 'simulation' ? 'active' : ''}`}
          onClick={() => setFilter('simulation')}
        >
          Simulations
        </button>
        <button 
          className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
          onClick={() => setFilter('active')}
        >
          Active Emergencies
        </button>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner">Loading scenarios...</div>
        </div>
      ) : scenarios.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"></div>
          <h3>No scenarios found</h3>
          <p>Create your first emergency scenario to start analyzing crisis impact</p>
          <button 
            className="create-first-btn"
            onClick={() => navigate('/emergency-intelligence/create')}
          >
            Create Scenario
          </button>
        </div>
      ) : (
        <div className="scenarios-grid">
          {scenarios.map((scenario) => (
            <ScenarioCard
              key={scenario._id}
              scenario={scenario}
              onClick={() => navigate(`/emergency-intelligence/scenario/${scenario._id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const ScenarioCard = ({ scenario, onClick }) => {
  const {
    incidentType,
    incidentLocation,
    estimatedCasualties,
    incidentTime,
    projectedBloodDemand,
    hospitalImpacts,
    cityPreparednessIndex,
    isSimulation
  } = scenario;

  const criticalHospitals = hospitalImpacts?.filter(h => h.overallRiskLevel === 'CRITICAL').length || 0;
  const highRiskHospitals = hospitalImpacts?.filter(h => h.overallRiskLevel === 'HIGH').length || 0;

  return (
    <div className="scenario-card" onClick={onClick}>
      <div className="card-header">
        <div className="incident-type">
          {incidentType.replace(/_/g, ' ')}
        </div>
        {isSimulation && (
          <span className="sim-badge">SIM</span>
        )}
      </div>

      <div className="card-location">
        {incidentLocation.areaName}, {incidentLocation.city}
      </div>

      <div className="card-stats">
        <div className="stat-item">
          <span className="stat-label">Casualties</span>
          <span className="stat-value">{estimatedCasualties}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Blood Units Needed</span>
          <span className="stat-value">{projectedBloodDemand?.totalUnits || 0}</span>
        </div>
      </div>

      <div className="card-risk">
        <div className="risk-item">
          <span className="risk-label">City Preparedness:</span>
          <span className="risk-score">{cityPreparednessIndex?.score || 0}/100</span>
        </div>
      </div>

      <div className="card-hospitals">
        {criticalHospitals > 0 && (
          <span className="hospital-badge critical">
            {criticalHospitals} Critical
          </span>
        )}
        {highRiskHospitals > 0 && (
          <span className="hospital-badge high">
            {highRiskHospitals} High Risk
          </span>
        )}
      </div>

      <div className="card-footer">
        <span className="card-time">
          {new Date(incidentTime).toLocaleDateString()}
        </span>
        <span className="view-link">View Details →</span>
      </div>
    </div>
  );
};

export default EmergencyDashboard;
