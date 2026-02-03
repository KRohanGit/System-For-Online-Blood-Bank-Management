import React, { useState } from 'react';
import './CampValidationModal.css';

const CampValidationModal = ({ camp, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    medicalValidation: '',
    medicalStaffAssessment: '',
    emergencySupportReview: '',
    safetyEquipmentCheck: '',
    venueAssessment: '',
    recommendedModifications: '',
    medicalNotes: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      campId: camp._id,
      ...formData
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h3>Medical Camp Validation - {camp.name}</h3>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>

        <div className="modal-body">
          <div className="camp-summary">
            <h4>Camp Details</h4>
            <p><strong>Date:</strong> {new Date(camp.date).toLocaleDateString()}</p>
            <p><strong>Location:</strong> {camp.location}</p>
            <p><strong>Expected Donors:</strong> {camp.expectedDonors}</p>
            <p><strong>Medical Staff:</strong> {camp.medicalStaff}</p>
            <p><strong>Organizer:</strong> {camp.organizer}</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Medical Validation Decision *</label>
              <select name="medicalValidation" value={formData.medicalValidation} onChange={handleChange} required>
                <option value="">Select Decision</option>
                <option value="approved">Approve Camp</option>
                <option value="conditional">Conditional Approval</option>
                <option value="rejected">Reject Camp</option>
              </select>
            </div>

            <div className="form-group">
              <label>Medical Staff Assessment *</label>
              <textarea
                name="medicalStaffAssessment"
                value={formData.medicalStaffAssessment}
                onChange={handleChange}
                rows="3"
                required
                placeholder="Assessment of medical staff qualifications and adequacy..."
              ></textarea>
            </div>

            <div className="form-group">
              <label>Emergency Support Review *</label>
              <textarea
                name="emergencySupportReview"
                value={formData.emergencySupportReview}
                onChange={handleChange}
                rows="3"
                required
                placeholder="Availability of emergency equipment, ambulance, hospital proximity..."
              ></textarea>
            </div>

            <div className="form-group">
              <label>Safety Equipment Check *</label>
              <textarea
                name="safetyEquipmentCheck"
                value={formData.safetyEquipmentCheck}
                onChange={handleChange}
                rows="3"
                required
                placeholder="Sterilization equipment, blood collection kits, safety supplies..."
              ></textarea>
            </div>

            <div className="form-group">
              <label>Venue Assessment</label>
              <textarea
                name="venueAssessment"
                value={formData.venueAssessment}
                onChange={handleChange}
                rows="3"
                placeholder="Space adequacy, hygiene, privacy, accessibility..."
              ></textarea>
            </div>

            {formData.medicalValidation === 'conditional' && (
              <div className="form-group">
                <label>Recommended Modifications *</label>
                <textarea
                  name="recommendedModifications"
                  value={formData.recommendedModifications}
                  onChange={handleChange}
                  rows="3"
                  required
                  placeholder="List required improvements for approval..."
                ></textarea>
              </div>
            )}

            <div className="form-group">
              <label>Medical Notes *</label>
              <textarea
                name="medicalNotes"
                value={formData.medicalNotes}
                onChange={handleChange}
                rows="4"
                required
                placeholder="Comprehensive medical validation notes and recommendations..."
              ></textarea>
            </div>

            <div className="form-actions">
              <button type="button" onClick={onClose} className="btn-cancel">Cancel</button>
              <button type="submit" className="btn-submit">Submit Validation</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CampValidationModal;
