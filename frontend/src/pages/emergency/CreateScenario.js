import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import IncidentForm from '../../components/emergency/IncidentForm';
import { createEmergencyScenario } from '../../services/emergencyIntelligenceApi';
import './CreateScenario.css';

const CreateScenario = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (scenarioData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await createEmergencyScenario(scenarioData);

      if (response.success) {
        alert('Emergency scenario created successfully!');
        navigate(`/emergency-intelligence/scenario/${response.data._id}`);
      }
    } catch (err) {
      console.error('Create scenario error:', err);
      setError(err.response?.data?.message || 'Failed to create scenario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-scenario-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <div>
          <h1>Create Emergency Scenario</h1>
          <p className="page-subtitle">
            Simulate crisis impact on city blood supply system
          </p>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          ⚠️ {error}
        </div>
      )}

      <IncidentForm onSubmit={handleSubmit} loading={loading} />
    </div>
  );
};

export default CreateScenario;
