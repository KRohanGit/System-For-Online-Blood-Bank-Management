import React, { useState } from 'react';
import './NewEmergencyRequestModal.css';

const NewEmergencyRequestModal = ({ isOpen, onClose, onSubmit, nearbyHospitals }) => {
  const [formData, setFormData] = useState({
    receivingHospital: '',
    bloodGroup: '',
    componentType: 'RBC',
    unitsRequired: '',
    urgencyLevel: 'CRITICAL',
    patientCriticality: '',
    requiredWithin: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.receivingHospital) newErrors.receivingHospital = 'Please select a hospital';
    if (!formData.bloodGroup) newErrors.bloodGroup = 'Blood group is required';
    if (!formData.unitsRequired || formData.unitsRequired <= 0) newErrors.unitsRequired = 'Valid units required';
    if (!formData.patientCriticality) newErrors.patientCriticality = 'Patient criticality is required';
    if (!formData.requiredWithin) newErrors.requiredWithin = 'Time requirement is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
      setFormData({
        receivingHospital: '',
        bloodGroup: '',
        componentType: 'RBC',
        unitsRequired: '',
        urgencyLevel: 'CRITICAL',
        patientCriticality: '',
        requiredWithin: '',
        notes: ''
      });
      setErrors({});
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create Emergency Blood Request</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="emergency-form">
          <div className="form-group">
            <label>Partner Hospital *</label>
            <select
              name="receivingHospital"
              value={formData.receivingHospital}
              onChange={handleChange}
              className={errors.receivingHospital ? 'error' : ''}
            >
              <option value="">Select Hospital</option>
              {nearbyHospitals.map(hospital => (
                <option key={hospital._id} value={hospital._id}>
                  {hospital.name} ({hospital.distance} km)
                </option>
              ))}
            </select>
            {errors.receivingHospital && <span className="error-msg">{errors.receivingHospital}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Blood Group *</label>
              <select
                name="bloodGroup"
                value={formData.bloodGroup}
                onChange={handleChange}
                className={errors.bloodGroup ? 'error' : ''}
              >
                <option value="">Select</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
              {errors.bloodGroup && <span className="error-msg">{errors.bloodGroup}</span>}
            </div>

            <div className="form-group">
              <label>Component Type *</label>
              <select
                name="componentType"
                value={formData.componentType}
                onChange={handleChange}
              >
                <option value="RBC">Red Blood Cells (RBC)</option>
                <option value="Plasma">Plasma</option>
                <option value="Platelets">Platelets</option>
                <option value="Whole Blood">Whole Blood</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Units Required *</label>
              <input
                type="number"
                name="unitsRequired"
                value={formData.unitsRequired}
                onChange={handleChange}
                placeholder="Enter units"
                min="1"
                className={errors.unitsRequired ? 'error' : ''}
              />
              {errors.unitsRequired && <span className="error-msg">{errors.unitsRequired}</span>}
            </div>

            <div className="form-group">
              <label>Urgency Level *</label>
              <select
                name="urgencyLevel"
                value={formData.urgencyLevel}
                onChange={handleChange}
              >
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Patient Criticality *</label>
            <input
              type="text"
              name="patientCriticality"
              value={formData.patientCriticality}
              onChange={handleChange}
              placeholder="e.g., Post-surgery, Trauma, Chronic condition"
              className={errors.patientCriticality ? 'error' : ''}
            />
            {errors.patientCriticality && <span className="error-msg">{errors.patientCriticality}</span>}
          </div>

          <div className="form-group">
            <label>Required Within *</label>
            <input
              type="text"
              name="requiredWithin"
              value={formData.requiredWithin}
              onChange={handleChange}
              placeholder="e.g., 2 hours, 30 minutes, Immediately"
              className={errors.requiredWithin ? 'error' : ''}
            />
            {errors.requiredWithin && <span className="error-msg">{errors.requiredWithin}</span>}
          </div>

          <div className="form-group">
            <label>Additional Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Any additional information for the receiving hospital..."
              rows="3"
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-submit">
              Create Emergency Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewEmergencyRequestModal;
