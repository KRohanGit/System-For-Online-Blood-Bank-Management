import React, { useState, useEffect } from 'react';
import BloodUnitCard from '../../components/doctor/BloodUnitCard';
import doctorClinicalAPI from '../../services/doctorClinicalAPI';
import './BloodUnitValidationPage.css';

/**
 * Blood Unit Medical Validation Page
 * Doctor reviews and validates screened blood units
 */
const BloodUnitValidationPage = () => {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [validationForm, setValidationForm] = useState({
    validationStatus: '',
    medicalNotes: '',
    rejectionReason: '',
    recheckParameters: [],
    labResultsReviewed: {
      hemoglobin: false,
      bloodGrouping: false,
      infectionScreening: false,
      visualInspection: false
    }
  });

  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    try {
      setLoading(true);
      const response = await doctorClinicalAPI.getBloodUnitsForValidation();
      if (response.success) {
        setUnits(response.data.units || []);
      }
    } catch (error) {
      console.error('Error fetching units:', error);
      alert('Failed to load blood units');
    } finally {
      setLoading(false);
    }
  };

  const handleValidationClick = (unitId, status) => {
    const unit = units.find(u => u._id === unitId);
    setSelectedUnit(unit);
    setValidationForm({
      ...validationForm,
      validationStatus: status
    });
    setShowModal(true);
  };

  const handleSubmitValidation = async () => {
    if (!validationForm.medicalNotes.trim()) {
      alert('Medical notes are required');
      return;
    }

    if (validationForm.validationStatus === 'rejected' && !validationForm.rejectionReason.trim()) {
      alert('Rejection reason is required');
      return;
    }

    try {
      setValidating(selectedUnit._id);
      const response = await doctorClinicalAPI.validateBloodUnit(selectedUnit._id, validationForm);
      
      if (response.success) {
        alert('Blood unit validation completed successfully');
        setShowModal(false);
        fetchUnits(); // Refresh list
        resetForm();
      }
    } catch (error) {
      console.error('Validation error:', error);
      alert(error.response?.data?.message || 'Failed to validate blood unit');
    } finally {
      setValidating(null);
    }
  };

  const resetForm = () => {
    setValidationForm({
      validationStatus: '',
      medicalNotes: '',
      rejectionReason: '',
      recheckParameters: [],
      labResultsReviewed: {
        hemoglobin: false,
        bloodGrouping: false,
        infectionScreening: false,
        visualInspection: false
      }
    });
    setSelectedUnit(null);
  };

  const toggleRecheckParameter = (param) => {
    const params = [...validationForm.recheckParameters];
    const index = params.indexOf(param);
    if (index > -1) {
      params.splice(index, 1);
    } else {
      params.push(param);
    }
    setValidationForm({ ...validationForm, recheckParameters: params });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Loading blood units...</div>
      </div>
    );
  }

  return (
    <div className="blood-unit-validation-page">
      <div className="page-header">
        <h1>🩸 Blood Unit Medical Validation</h1>
        <p className="page-description">
          Review screened blood units and provide medical validation
        </p>
      </div>

      <div className="validation-stats">
        <div className="stat-card">
          <span className="stat-value">{units.length}</span>
          <span className="stat-label">Units Pending</span>
        </div>
      </div>

      <div className="units-list">
        {units.length === 0 ? (
          <div className="no-units">
            <p>✓ No blood units pending validation at this time</p>
          </div>
        ) : (
          units.map(unit => (
            <BloodUnitCard
              key={unit._id}
              unit={unit}
              onValidate={handleValidationClick}
            />
          ))
        )}
      </div>

      {showModal && selectedUnit && (
        <div className="validation-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="validation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Validate Blood Unit</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>

            <div className="modal-body">
              <div className="unit-summary">
                <strong>Unit ID:</strong> {selectedUnit.bloodUnitId}<br />
                <strong>Blood Group:</strong> {selectedUnit.bloodGroup}<br />
                <strong>Status:</strong> {validationForm.validationStatus}
              </div>

              <div className="form-group">
                <label>Lab Results Reviewed *</label>
                <div className="checkbox-group">
                  {Object.keys(validationForm.labResultsReviewed).map(key => (
                    <label key={key} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={validationForm.labResultsReviewed[key]}
                        onChange={(e) => setValidationForm({
                          ...validationForm,
                          labResultsReviewed: {
                            ...validationForm.labResultsReviewed,
                            [key]: e.target.checked
                          }
                        })}
                      />
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Medical Notes *</label>
                <textarea
                  value={validationForm.medicalNotes}
                  onChange={(e) => setValidationForm({ ...validationForm, medicalNotes: e.target.value })}
                  placeholder="Enter your medical observations and validation notes"
                  rows={4}
                  required
                />
              </div>

              {validationForm.validationStatus === 'hold_for_recheck' && (
                <div className="form-group">
                  <label>Parameters Requiring Recheck</label>
                  <div className="checkbox-group">
                    {['Hemoglobin', 'Blood Grouping', 'Infection Screening', 'Visual Inspection'].map(param => (
                      <label key={param} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={validationForm.recheckParameters.includes(param)}
                          onChange={() => toggleRecheckParameter(param)}
                        />
                        {param}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {validationForm.validationStatus === 'rejected' && (
                <div className="form-group">
                  <label>Rejection Reason *</label>
                  <textarea
                    value={validationForm.rejectionReason}
                    onChange={(e) => setValidationForm({ ...validationForm, rejectionReason: e.target.value })}
                    placeholder="Specify the reason for rejecting this blood unit"
                    rows={3}
                    required
                  />
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button 
                className="btn-cancel" 
                onClick={() => setShowModal(false)}
                disabled={validating}
              >
                Cancel
              </button>
              <button 
                className="btn-submit" 
                onClick={handleSubmitValidation}
                disabled={validating}
              >
                {validating ? 'Submitting...' : 'Submit Validation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BloodUnitValidationPage;
