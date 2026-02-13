import React, { useState } from 'react';
import './SendMessageModal.css';

const SendMessageModal = ({ isOpen, onClose, onSubmit, nearbyHospitals, emergencyRequests }) => {
  const [formData, setFormData] = useState({
    recipientHospital: '',
    messageType: 'URGENT_REQUEST',
    relatedRequest: '',
    subject: '',
    message: ''
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
    if (!formData.recipientHospital) newErrors.recipientHospital = 'Please select a hospital';
    if (!formData.subject.trim()) newErrors.subject = 'Subject is required';
    if (!formData.message.trim()) newErrors.message = 'Message is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
      setFormData({
        recipientHospital: '',
        messageType: 'URGENT_REQUEST',
        relatedRequest: '',
        subject: '',
        message: ''
      });
      setErrors({});
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Send Message to Partner Hospital</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="message-form">
          <div className="form-group">
            <label>Recipient Hospital *</label>
            <select
              name="recipientHospital"
              value={formData.recipientHospital}
              onChange={handleChange}
              className={errors.recipientHospital ? 'error' : ''}
            >
              <option value="">Select Hospital</option>
              {nearbyHospitals.map(hospital => (
                <option key={hospital._id} value={hospital._id}>
                  {hospital.name} ({hospital.distance} km)
                </option>
              ))}
            </select>
            {errors.recipientHospital && <span className="error-msg">{errors.recipientHospital}</span>}
          </div>

          <div className="form-group">
            <label>Message Type *</label>
            <select
              name="messageType"
              value={formData.messageType}
              onChange={handleChange}
            >
              <option value="URGENT_REQUEST">Urgent Request</option>
              <option value="AVAILABILITY_CHECK">Availability Check</option>
              <option value="TRANSPORT_COORDINATION">Transport Coordination</option>
              <option value="ETA_UPDATE">ETA Update</option>
              <option value="GENERAL">General Communication</option>
            </select>
          </div>

          {emergencyRequests.length > 0 && (
            <div className="form-group">
              <label>Related Emergency Request (Optional)</label>
              <select
                name="relatedRequest"
                value={formData.relatedRequest}
                onChange={handleChange}
              >
                <option value="">None</option>
                {emergencyRequests.map(request => (
                  <option key={request._id} value={request._id}>
                    {request.bloodGroup} {request.componentType} - {request.unitsRequired} units
                  </option>
                ))}
              </select>
              <small className="help-text">Link this message to an emergency request for audit trail</small>
            </div>
          )}

          <div className="form-group">
            <label>Subject *</label>
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder="Enter message subject"
              className={errors.subject ? 'error' : ''}
            />
            {errors.subject && <span className="error-msg">{errors.subject}</span>}
          </div>

          <div className="form-group">
            <label>Message *</label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder="Type your message here..."
              rows="5"
              className={errors.message ? 'error' : ''}
            />
            {errors.message && <span className="error-msg">{errors.message}</span>}
          </div>

          <div className="message-info">
            All messages are logged for audit purposes and include sender hospital, timestamp, and recipient details.
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-submit">
              Send Message
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SendMessageModal;
