import React, { useState } from 'react';
import { emergencyRelease } from '../../services/bloodInventoryApi';
import './EmergencyReleaseModal.css';

const EmergencyReleaseModal = ({ onSuccess, onClose }) => {
  const [formData, setFormData] = useState({
    bloodGroup: '',
    quantity: 1,
    patientId: '',
    reason: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' ? parseInt(value) : value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.bloodGroup) {
      setError('Blood group is required');
      return;
    }
    if (formData.quantity < 1 || formData.quantity > 10) {
      setError('Quantity must be between 1 and 10');
      return;
    }
    if (!formData.patientId.trim()) {
      setError('Patient ID is required');
      return;
    }
    if (!formData.reason.trim()) {
      setError('Emergency reason is required');
      return;
    }

    setLoading(true);
    try {
      const result = await emergencyRelease(
        formData.bloodGroup,
        formData.quantity,
        formData.patientId,
        formData.reason
      );
      
      alert(`✅ Emergency Release Successful!\nReleased ${result.releasedUnits.length} unit(s)`);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Emergency release failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="emergency-release-modal">
      {/* Warning Banner */}
      <div className="emergency-warning">
        <span className="warning-icon">🚨</span>
        <div className="warning-content">
          <h4>EMERGENCY MODE</h4>
          <p>This will bypass normal restrictions and release blood units immediately</p>
        </div>
      </div>

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="emergency-form">
        {/* Blood Group */}
        <div className="form-group">
          <label>Blood Group *</label>
          <select
            name="bloodGroup"
            value={formData.bloodGroup}
            onChange={handleChange}
            required
          >
            <option value="">Select Blood Group</option>
            {bloodGroups.map(group => (
              <option key={group} value={group}>{group}</option>
            ))}
          </select>
        </div>

        {/* Quantity */}
        <div className="form-group">
          <label>Quantity (Units) *</label>
          <input
            type="number"
            name="quantity"
            value={formData.quantity}
            onChange={handleChange}
            min="1"
            max="10"
            required
          />
          <small>Maximum 10 units per emergency release</small>
        </div>

        {/* Patient ID */}
        <div className="form-group">
          <label>Patient ID *</label>
          <input
            type="text"
            name="patientId"
            value={formData.patientId}
            onChange={handleChange}
            placeholder="e.g., PAT-2026-00123"
            required
          />
        </div>

        {/* Emergency Reason */}
        <div className="form-group">
          <label>Emergency Reason *</label>
          <textarea
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            placeholder="Describe the emergency situation..."
            rows="3"
            required
          />
          <small>This will be logged in the audit trail</small>
        </div>

        {/* Action Buttons */}
        <div className="form-actions">
          <button
            type="button"
            className="btn-cancel"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-emergency"
            disabled={loading}
          >
            {loading ? '⏳ Releasing...' : '🚨 Release Now'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmergencyReleaseModal;
