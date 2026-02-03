import React, { useState, useEffect } from 'react';
import { getCampsForOversight, validateCamp } from '../../services/doctorApi';
import CampCard from './cards/CampCard';
import CampValidationModal from './modals/CampValidationModal';
import '../../styles/CampOversight.css';

const CampOversight = () => {
  const [camps, setCamps] = useState([]);
  const [selectedCamp, setSelectedCamp] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCamps();
  }, []);

  const loadCamps = async () => {
    try {
      setLoading(true);
      const data = await getCampsForOversight();
      setCamps(data);
    } catch (error) {
      console.error('Load camps error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleValidation = async (campId, validation) => {
    try {
      await validateCamp(campId, validation);
      setShowModal(false);
      setSelectedCamp(null);
      loadCamps();
    } catch (error) {
      console.error('Validation error:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading camps...</div>;
  }

  return (
    <div className="camp-oversight">
      <div className="section-header">
        <h2>Medical Oversight of Blood Donation Camps</h2>
        <div className="actions">
          <button onClick={loadCamps} className="refresh-btn">
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="camps-grid">
        {camps.map(camp => (
          <CampCard
            key={camp._id}
            camp={camp}
            onValidate={() => {
              setSelectedCamp(camp);
              setShowModal(true);
            }}
          />
        ))}
      </div>

      {camps.length === 0 && (
        <div className="no-data">No camps pending medical oversight</div>
      )}

      {showModal && selectedCamp && (
        <CampValidationModal
          camp={selectedCamp}
          onClose={() => setShowModal(false)}
          onSubmit={handleValidation}
        />
      )}
    </div>
  );
};

export default CampOversight;
