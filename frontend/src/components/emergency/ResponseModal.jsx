/**
 * ResponseModal Component
 * 
 * Modal dialog for confirming user's response to emergency blood events
 * Includes eligibility checks and multiple response options
 */

import React, { useState, useEffect } from 'react';
import { checkDonationEligibility } from '../../services/emergencyMockData';
import './ResponseModal.css';

const ResponseModal = ({ event, onClose, onConfirm }) => {
  const [eligibility, setEligibility] = useState(null);
  const [checkingEligibility, setCheckingEligibility] = useState(true);
  const [selectedResponse, setSelectedResponse] = useState(null);

  useEffect(() => {
    if (event) {
      checkEligibility();
    }
  }, [event]);

  /**
   * Check if user is eligible to donate
   */
  const checkEligibility = async () => {
    setCheckingEligibility(true);
    try {
      const result = await checkDonationEligibility(event.bloodGroupRequired);
      setEligibility(result.data);
    } catch (error) {
      console.error('Error checking eligibility:', error);
    } finally {
      setCheckingEligibility(false);
    }
  };

  /**
   * Handle response confirmation
   */
  const handleConfirm = () => {
    if (selectedResponse) {
      onConfirm(selectedResponse);
    }
  };

  /**
   * Handle backdrop click
   */
  const handleBackdropClick = (e) => {
    if (e.target.className === 'response-modal-backdrop') {
      onClose();
    }
  };

  if (!event) return null;

  return (
    <div className="response-modal-backdrop" onClick={handleBackdropClick}>
      <div className="response-modal">
        {/* Modal Header */}
        <div className="modal-header">
          <h2>🆘 Emergency Response</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        {/* Event Details */}
        <div className="modal-event-details">
          <h3>{event.hospitalName}</h3>
          <div className="event-quick-info">
            <span className="blood-group-badge">{event.bloodGroupRequired}</span>
            <span className="units-badge">{event.unitsRequired} units needed</span>
            <span className="urgency-badge-small" style={{
              backgroundColor: event.urgencyLevel === 'CRITICAL' ? '#e74c3c' : '#f39c12'
            }}>
              {event.urgencyLevel}
            </span>
          </div>
          {event.description && (
            <p className="event-description-modal">{event.description}</p>
          )}
        </div>

        {/* Eligibility Check */}
        {checkingEligibility ? (
          <div className="eligibility-checking">
            <div className="spinner-small"></div>
            <p>Checking your eligibility...</p>
          </div>
        ) : (
          <div className={`eligibility-result ${eligibility?.eligible ? 'eligible' : 'not-eligible'}`}>
            <div className="eligibility-header">
              <span className="eligibility-icon">
                {eligibility?.eligible ? '✅' : '⚠️'}
              </span>
              <h4>
                {eligibility?.eligible 
                  ? 'You are eligible to donate!' 
                  : 'Eligibility Status'}
              </h4>
            </div>
            <ul className="eligibility-reasons">
              {eligibility?.reasons.map((reason, index) => (
                <li key={index}>{reason}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Response Options */}
        <div className="response-options">
          <h4>Are you available to donate blood now?</h4>
          
          <div className="response-buttons-group">
            <button
              className={`response-option-btn available ${selectedResponse === 'RESPONDED' ? 'selected' : ''}`}
              onClick={() => setSelectedResponse('RESPONDED')}
              disabled={!eligibility?.eligible}
            >
              <span className="option-icon">✅</span>
              <div className="option-content">
                <strong>Yes, I'm Available</strong>
                <small>Hospital will contact you</small>
              </div>
            </button>

            <button
              className={`response-option-btn not-available ${selectedResponse === 'NOT_AVAILABLE' ? 'selected' : ''}`}
              onClick={() => setSelectedResponse('NOT_AVAILABLE')}
            >
              <span className="option-icon">❌</span>
              <div className="option-content">
                <strong>Not Available</strong>
                <small>Record response only</small>
              </div>
            </button>

            <button
              className={`response-option-btn remind-later ${selectedResponse === 'REMIND_LATER' ? 'selected' : ''}`}
              onClick={() => setSelectedResponse('REMIND_LATER')}
            >
              <span className="option-icon">⏰</span>
              <div className="option-content">
                <strong>Remind Me Later</strong>
                <small>Set reminder notification</small>
              </div>
            </button>
          </div>
        </div>

        {/* Warning for ineligible users */}
        {!eligibility?.eligible && (
          <div className="ineligibility-warning">
            <strong>⚠️ Not Eligible:</strong> You cannot respond as available due to eligibility constraints. 
            Please check the Readiness section for more details.
          </div>
        )}

        {/* Action Buttons */}
        <div className="modal-actions">
          <button 
            className="btn-cancel" 
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            className="btn-confirm" 
            onClick={handleConfirm}
            disabled={!selectedResponse}
          >
            {selectedResponse === 'RESPONDED' && 'Confirm Response'}
            {selectedResponse === 'NOT_AVAILABLE' && 'Mark as Unavailable'}
            {selectedResponse === 'REMIND_LATER' && 'Set Reminder'}
            {!selectedResponse && 'Select an Option'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResponseModal;
