import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EmergencyScenarioHeader from '../../components/emergency/EmergencyScenarioHeader';
import IncidentForm from '../../components/emergency/IncidentForm';
import { createEmergencyScenario } from '../../services/emergencyIntelligenceApi';
import Toast from '../../components/common/Toast';
import './CreateScenario.css';

const CreateScenario = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const handleSubmit = async (scenarioData) => {
    try {
      setLoading(true);
      setError(null);

      console.log('Submitting scenario data:', scenarioData);
      const response = await createEmergencyScenario(scenarioData);

      if (response.success) {
        showToast('Emergency scenario created successfully!', 'success');
        setTimeout(() => {
          navigate(`/emergency-intelligence/scenario/${response.data._id}`);
        }, 1500);
      }
    } catch (err) {
      console.error('Create scenario error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create scenario';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-scenario-page">
      <EmergencyScenarioHeader 
        onBack={() => navigate(-1)}
        title="Create Emergency Scenario"
        subtitle="Simulate crisis impact on city blood supply system"
      />

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      <IncidentForm onSubmit={handleSubmit} loading={loading} />

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default CreateScenario;
