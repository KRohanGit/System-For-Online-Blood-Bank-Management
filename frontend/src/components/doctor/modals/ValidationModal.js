import React, { useState } from 'react';
import './ValidationModal.css';

const ValidationModal = ({ request, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    decision: '',
    medicalNotes: '',
    compatibilityCheck: '',
    alternativeRecommendations: '',
    urgency: request.isEmergency ? 'emergency' : 'routine'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      requestId: request._id,
      ...formData
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h3>Medical Validation - Request #{request._id.slice(-6)}</h3>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>

        <div className="modal-body">
          <div className="request-summary">
            <h4>Request Details</h4>
            <p><strong>Patient:</strong> {request.patientName}</p>
            <p><strong>Blood Group:</strong> <span className="blood-group">{request.bloodGroup}</span></p>
            <p><strong>Units:</strong> {request.unitsRequired}</p>
            <p><strong>Reason:</strong> {request.clinicalReason}</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Decision *</label>
              <select name="decision" value={formData.decision} onChange={handleChange} required>
                <option value="">Select Decision</option>
                <option value="approved">Approve</option>
                <option value="rejected">Reject</option>
                <option value="pending_more_info">Request More Information</option>
              </select>
            </div>

            <div className="form-group">
              <label>Medical Notes *</label>
              <textarea
                name="medicalNotes"
                value={formData.medicalNotes}
                onChange={handleChange}
                rows="4"
                required
                placeholder="Enter your clinical assessment..."
              ></textarea>
            </div>

            <div className="form-group">
              <label>Compatibility Check</label>
              <textarea
                name="compatibilityCheck"
                value={formData.compatibilityCheck}
                onChange={handleChange}
                rows="3"
                placeholder="Blood group compatibility notes..."
              ></textarea>
            </div>

            <div className="form-group">
              <label>Alternative Recommendations</label>
              <textarea
                name="alternativeRecommendations"
                value={formData.alternativeRecommendations}
                onChange={handleChange}
                rows="3"
                placeholder="Alternative blood products or options..."
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

export default ValidationModal;
