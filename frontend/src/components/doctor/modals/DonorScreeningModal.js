import React, { useState } from 'react';
import './DonorScreeningModal.css';

const DonorScreeningModal = ({ donor, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    eligibilityDecision: '',
    deferralReason: '',
    deferralPeriod: '',
    medicalNotes: '',
    vitalsReview: '',
    healthCheckComments: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      donorId: donor._id,
      ...formData
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h3>Donor Screening - {donor.fullName}</h3>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>

        <div className="modal-body">
          <div className="donor-summary">
            <h4>Donor Information</h4>
            <p><strong>Blood Group:</strong> <span className="blood-group">{donor.bloodGroup}</span></p>
            <p><strong>Age:</strong> {donor.age} years</p>
            {donor.vitals && (
              <>
                <p><strong>BP:</strong> {donor.vitals.bloodPressure}</p>
                <p><strong>Hemoglobin:</strong> {donor.vitals.hemoglobin} g/dL</p>
                <p><strong>Weight:</strong> {donor.vitals.weight} kg</p>
              </>
            )}
            <p><strong>Last Donation:</strong> {donor.lastDonation ? new Date(donor.lastDonation).toLocaleDateString() : 'First time'}</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Eligibility Decision *</label>
              <select name="eligibilityDecision" value={formData.eligibilityDecision} onChange={handleChange} required>
                <option value="">Select Decision</option>
                <option value="eligible">Eligible for Donation</option>
                <option value="deferred">Temporarily Deferred</option>
                <option value="permanently_deferred">Permanently Deferred</option>
              </select>
            </div>

            {(formData.eligibilityDecision === 'deferred' || formData.eligibilityDecision === 'permanently_deferred') && (
              <>
                <div className="form-group">
                  <label>Deferral Reason *</label>
                  <select name="deferralReason" value={formData.deferralReason} onChange={handleChange} required>
                    <option value="">Select Reason</option>
                    <option value="low_hemoglobin">Low Hemoglobin</option>
                    <option value="underweight">Underweight</option>
                    <option value="high_bp">High Blood Pressure</option>
                    <option value="recent_illness">Recent Illness</option>
                    <option value="medication">Medication Contraindication</option>
                    <option value="recent_tattoo">Recent Tattoo/Piercing</option>
                    <option value="travel_history">Travel to Endemic Area</option>
                    <option value="medical_condition">Chronic Medical Condition</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {formData.eligibilityDecision === 'deferred' && (
                  <div className="form-group">
                    <label>Deferral Period</label>
                    <input
                      type="text"
                      name="deferralPeriod"
                      value={formData.deferralPeriod}
                      onChange={handleChange}
                      placeholder="e.g., 3 months, 1 year"
                    />
                  </div>
                )}
              </>
            )}

            <div className="form-group">
              <label>Vitals Review</label>
              <textarea
                name="vitalsReview"
                value={formData.vitalsReview}
                onChange={handleChange}
                rows="3"
                placeholder="Assessment of vital signs..."
              ></textarea>
            </div>

            <div className="form-group">
              <label>Health Check Comments</label>
              <textarea
                name="healthCheckComments"
                value={formData.healthCheckComments}
                onChange={handleChange}
                rows="3"
                placeholder="General health assessment..."
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
                placeholder="Comprehensive medical notes for screening decision..."
              ></textarea>
            </div>

            <div className="form-actions">
              <button type="button" onClick={onClose} className="btn-cancel">Cancel</button>
              <button type="submit" className="btn-submit">Submit Screening</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DonorScreeningModal;
