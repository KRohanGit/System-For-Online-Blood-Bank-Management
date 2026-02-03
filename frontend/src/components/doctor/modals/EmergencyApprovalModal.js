import React, { useState } from 'react';
import './EmergencyApprovalModal.css';

const EmergencyApprovalModal = ({ emergency, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    fastTrackApproval: '',
    priorityLevel: 'critical',
    medicalJustification: '',
    compatibilityNotes: '',
    specialInstructions: '',
    estimatedDeliveryTime: '',
    contactConfirmation: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      emergencyId: emergency._id,
      ...formData
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container emergency">
        <div className="modal-header emergency-header">
          <h3>🚨 Emergency Fast-Track Approval</h3>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>

        <div className="modal-body">
          <div className="emergency-summary">
            <h4>Emergency Request Details</h4>
            <p><strong>Patient:</strong> {emergency.patientName}</p>
            <p><strong>Blood Group:</strong> <span className="blood-group urgent">{emergency.bloodGroup}</span></p>
            <p><strong>Units Required:</strong> <span className="urgent">{emergency.unitsRequired} units</span></p>
            <p><strong>Emergency Type:</strong> {emergency.emergencyType}</p>
            <p><strong>Clinical Reason:</strong> {emergency.clinicalReason}</p>
            <p><strong>Hospital:</strong> {emergency.hospitalName}</p>
            <p><strong>Contact:</strong> {emergency.contactNumber}</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Fast-Track Decision *</label>
              <select name="fastTrackApproval" value={formData.fastTrackApproval} onChange={handleChange} required>
                <option value="">Select Decision</option>
                <option value="approved">Approve Fast-Track</option>
                <option value="standard_process">Route to Standard Process</option>
                <option value="denied">Deny Request</option>
              </select>
            </div>

            {formData.fastTrackApproval === 'approved' && (
              <>
                <div className="form-group">
                  <label>Priority Level *</label>
                  <select name="priorityLevel" value={formData.priorityLevel} onChange={handleChange} required>
                    <option value="critical">Critical (Immediate)</option>
                    <option value="urgent">Urgent (&lt; 1 hour)</option>
                    <option value="high">High (&lt; 2 hours)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Estimated Delivery Time</label>
                  <input
                    type="text"
                    name="estimatedDeliveryTime"
                    value={formData.estimatedDeliveryTime}
                    onChange={handleChange}
                    placeholder="e.g., 30 minutes, 1 hour"
                  />
                </div>

                <div className="form-group">
                  <label>Special Instructions</label>
                  <textarea
                    name="specialInstructions"
                    value={formData.specialInstructions}
                    onChange={handleChange}
                    rows="3"
                    placeholder="Special handling, transport instructions, recipient preparations..."
                  ></textarea>
                </div>
              </>
            )}

            <div className="form-group">
              <label>Medical Justification *</label>
              <textarea
                name="medicalJustification"
                value={formData.medicalJustification}
                onChange={handleChange}
                rows="4"
                required
                placeholder="Medical justification for fast-track approval or denial..."
              ></textarea>
            </div>

            <div className="form-group">
              <label>Compatibility Notes</label>
              <textarea
                name="compatibilityNotes"
                value={formData.compatibilityNotes}
                onChange={handleChange}
                rows="3"
                placeholder="Blood group compatibility and cross-matching notes..."
              ></textarea>
            </div>

            <div className="form-group">
              <label>Contact Confirmation</label>
              <textarea
                name="contactConfirmation"
                value={formData.contactConfirmation}
                onChange={handleChange}
                rows="2"
                placeholder="Confirmed contact person and number at receiving hospital..."
              ></textarea>
            </div>

            <div className="form-actions">
              <button type="button" onClick={onClose} className="btn-cancel">Cancel</button>
              <button type="submit" className="btn-submit emergency-btn">
                Submit Emergency Decision
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EmergencyApprovalModal;
