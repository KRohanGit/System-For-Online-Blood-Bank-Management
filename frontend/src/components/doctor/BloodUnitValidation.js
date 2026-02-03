import React, { useState, useEffect } from 'react';
import { getBloodUnitsForValidation, validateBloodUnit } from '../../services/doctorApi';
import BloodUnitCard from './cards/BloodUnitCard';
import UnitValidationModal from './modals/UnitValidationModal';
import '../../styles/BloodUnitValidation.css';

const BloodUnitValidation = () => {
  const [units, setUnits] = useState([]);
  const [filteredUnits, setFilteredUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUnits();
  }, []);

  const loadUnits = async () => {
    try {
      setLoading(true);
      const data = await getBloodUnitsForValidation();
      setUnits(data);
      setFilteredUnits(data);
    } catch (error) {
      console.error('Load units error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (filter) => {
    let filtered = [...units];
    
    if (filter.bloodGroup) {
      filtered = filtered.filter(u => u.bloodGroup === filter.bloodGroup);
    }
    
    if (filter.status) {
      filtered = filtered.filter(u => u.validationStatus === filter.status);
    }

    setFilteredUnits(filtered);
  };

  const handleValidation = async (unitId, validation) => {
    try {
      await validateBloodUnit(unitId, validation);
      setShowModal(false);
      setSelectedUnit(null);
      loadUnits();
    } catch (error) {
      console.error('Validation error:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading blood units...</div>;
  }

  return (
    <div className="blood-unit-validation">
      <div className="section-header">
        <h2>Blood Unit Safety Validation</h2>
        <div className="actions">
          <button onClick={loadUnits} className="refresh-btn">
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="units-grid">
        {filteredUnits.map(unit => (
          <BloodUnitCard
            key={unit._id}
            unit={unit}
            onValidate={() => {
              setSelectedUnit(unit);
              setShowModal(true);
            }}
          />
        ))}
      </div>

      {filteredUnits.length === 0 && (
        <div className="no-data">No blood units for validation</div>
      )}

      {showModal && selectedUnit && (
        <UnitValidationModal
          unit={selectedUnit}
          onClose={() => setShowModal(false)}
          onSubmit={handleValidation}
        />
      )}
    </div>
  );
};

export default BloodUnitValidation;
