import React, { useState } from 'react';
import './UnitValidationModal.css';

const UnitValidationModal = ({ unit, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    validationDecision: '',
    labTestReview: '',
    qualityAssessment: '',
    storageConditionReview: '',
    expiryReview: '',
    medicalNotes: '',
    markUnsafeReason: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      unitId: unit._id,
      ...formData
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h3>Blood Unit Validation - Unit #{unit.unitNumber || unit._id.slice(-6)}</h3>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>

        <div className="modal-body">
          <div className="unit-summary">
            <h4>Unit Details</h4>
            <p><strong>Blood Group:</strong> <span className="blood-group">{unit.bloodGroup}</span></p>
            <p><strong>Volume:</strong> {unit.volume} mL</p>
            <p><strong>Collection:</strong> {new Date(unit.collectionDate).toLocaleDateString()}</p>
            <p><strong>Expiry:</strong> {new Date(unit.expiryDate).toLocaleDateString()}</p>
            
            {unit.labTests && (
              <div className="lab-results">
                <h5>Lab Test Results:</h5>
                <ul>
                  <li>HIV: <span className={unit.labTests.hiv}>{unit.labTests.hiv}</span></li>
                  <li>Hep B: <span className={unit.labTests.hepatitisB}>{unit.labTests.hepatitisB}</span></li>
                  <li>Hep C: <span className={unit.labTests.hepatitisC}>{unit.labTests.hepatitisC}</span></li>
                  <li>Syphilis: <span className={unit.labTests.syphilis}>{unit.labTests.syphilis}</span></li>
                  <li>Malaria: <span className={unit.labTests.malaria}>{unit.labTests.malaria}</span></li>
                </ul>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Validation Decision *</label>
              <select name="validationDecision" value={formData.validationDecision} onChange={handleChange} required>
                <option value="">Select Decision</option>
                <option value="approved">Approve for Use</option>
                <option value="quarantine">Quarantine for Review</option>
                <option value="reject">Reject Unit</option>
              </select>
            </div>

            {formData.validationDecision === 'reject' && (
              <div className="form-group">
                <label>Reason for Rejection *</label>
                <select name="markUnsafeReason" value={formData.markUnsafeReason} onChange={handleChange} required>
                  <option value="">Select Reason</option>
                  <option value="positive_test">Positive Screening Test</option>
                  <option value="expired">Expired Unit</option>
                  <option value="contamination">Suspected Contamination</option>
                  <option value="storage_breach">Storage Temperature Breach</option>
                  <option value="hemolysis">Hemolysis Detected</option>
                  <option value="inadequate_volume">Inadequate Volume</option>
                  <option value="other">Other Medical Reason</option>
                </select>
              </div>
            )}

            <div className="form-group">
              <label>Lab Test Review *</label>
              <textarea
                name="labTestReview"
                value={formData.labTestReview}
                onChange={handleChange}
                rows="3"
                required
                placeholder="Assessment of lab test results..."
              ></textarea>
            </div>

            <div className="form-group">
              <label>Quality Assessment</label>
              <textarea
                name="qualityAssessment"
                value={formData.qualityAssessment}
                onChange={handleChange}
                rows="3"
                placeholder="Visual inspection and quality notes..."
              ></textarea>
            </div>

            <div className="form-group">
              <label>Storage Condition Review</label>
              <textarea
                name="storageConditionReview"
                value={formData.storageConditionReview}
                onChange={handleChange}
                rows="2"
                placeholder="Storage temperature and handling review..."
              ></textarea>
            </div>

            <div className="form-group">
              <label>Expiry Review</label>
              <textarea
                name="expiryReview"
                value={formData.expiryReview}
                onChange={handleChange}
                rows="2"
                placeholder="Remaining shelf life assessment..."
              ></textarea>
            </div>

            <div className="form-group">
              <label>Medical Notes *</label>
              <textarea
                name="medicalNotes"
                value={formData.medicalNotes}
                onChange={handleChange}
                rows="4"
                required
                placeholder="Comprehensive medical validation notes..."
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

export default UnitValidationModal;
