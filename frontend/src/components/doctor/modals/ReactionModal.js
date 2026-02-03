import React, { useState } from 'react';
import './ReactionModal.css';

const ReactionModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    donorId: '',
    donorName: '',
    bloodUnitNumber: '',
    reactionType: '',
    severity: '',
    symptoms: '',
    vitalSigns: '',
    actionTaken: '',
    medicalIntervention: '',
    outcome: '',
    unitMarkedUnsafe: false,
    medicalNotes: ''
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container large">
        <div className="modal-header">
          <h3>Log Adverse Reaction</h3>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Donor ID *</label>
                <input
                  type="text"
                  name="donorId"
                  value={formData.donorId}
                  onChange={handleChange}
                  required
                  placeholder="Donor ID"
                />
              </div>
              <div className="form-group">
                <label>Donor Name *</label>
                <input
                  type="text"
                  name="donorName"
                  value={formData.donorName}
                  onChange={handleChange}
                  required
                  placeholder="Full name"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Blood Unit Number</label>
              <input
                type="text"
                name="bloodUnitNumber"
                value={formData.bloodUnitNumber}
                onChange={handleChange}
                placeholder="Unit number if applicable"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Reaction Type *</label>
                <select name="reactionType" value={formData.reactionType} onChange={handleChange} required>
                  <option value="">Select Type</option>
                  <option value="vasovagal">Vasovagal Reaction</option>
                  <option value="allergic">Allergic Reaction</option>
                  <option value="hematoma">Hematoma</option>
                  <option value="nerve_injury">Nerve Injury</option>
                  <option value="delayed_bleeding">Delayed Bleeding</option>
                  <option value="citrate_reaction">Citrate Reaction</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Severity *</label>
                <select name="severity" value={formData.severity} onChange={handleChange} required>
                  <option value="">Select Severity</option>
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Symptoms *</label>
              <textarea
                name="symptoms"
                value={formData.symptoms}
                onChange={handleChange}
                rows="3"
                required
                placeholder="Detailed description of symptoms..."
              ></textarea>
            </div>

            <div className="form-group">
              <label>Vital Signs</label>
              <textarea
                name="vitalSigns"
                value={formData.vitalSigns}
                onChange={handleChange}
                rows="2"
                placeholder="BP, pulse, temperature at time of reaction..."
              ></textarea>
            </div>

            <div className="form-group">
              <label>Action Taken *</label>
              <textarea
                name="actionTaken"
                value={formData.actionTaken}
                onChange={handleChange}
                rows="3"
                required
                placeholder="Immediate actions and interventions..."
              ></textarea>
            </div>

            <div className="form-group">
              <label>Medical Intervention</label>
              <textarea
                name="medicalIntervention"
                value={formData.medicalIntervention}
                onChange={handleChange}
                rows="3"
                placeholder="Medications, procedures, or treatments administered..."
              ></textarea>
            </div>

            <div className="form-group">
              <label>Outcome *</label>
              <select name="outcome" value={formData.outcome} onChange={handleChange} required>
                <option value="">Select Outcome</option>
                <option value="resolved">Resolved</option>
                <option value="monitoring">Under Monitoring</option>
                <option value="hospitalized">Hospitalized</option>
                <option value="referred">Referred to Specialist</option>
              </select>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="unitMarkedUnsafe"
                  checked={formData.unitMarkedUnsafe}
                  onChange={handleChange}
                />
                Mark blood unit as unsafe (if applicable)
              </label>
            </div>

            <div className="form-group">
              <label>Medical Notes *</label>
              <textarea
                name="medicalNotes"
                value={formData.medicalNotes}
                onChange={handleChange}
                rows="4"
                required
                placeholder="Comprehensive medical notes and follow-up recommendations..."
              ></textarea>
            </div>

            <div className="form-actions">
              <button type="button" onClick={onClose} className="btn-cancel">Cancel</button>
              <button type="submit" className="btn-submit">Log Reaction</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReactionModal;
