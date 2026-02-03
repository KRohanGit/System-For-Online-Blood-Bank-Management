import React from 'react';
import './AvailabilityToggle.css';

/**
 * Doctor Availability Status Toggle
 * Allows doctor to update their availability status
 */
const AvailabilityToggle = ({ currentStatus, onStatusChange }) => {
  const statusOptions = [
    { value: 'on_call', label: 'On Call', icon: '🟢', color: '#28a745' },
    { value: 'off_duty', label: 'Off Duty', icon: '⚪', color: '#6c757d' },
    { value: 'in_consult', label: 'In Consult', icon: '🟠', color: '#fd7e14' },
    { value: 'emergency_only', label: 'Emergency Only', icon: '🔴', color: '#dc3545' }
  ];

  const getCurrentOption = () => {
    return statusOptions.find(opt => opt.value === currentStatus) || statusOptions[1];
  };

  return (
    <div className="availability-toggle">
      <div className="toggle-header">
        <span className="toggle-label">Availability Status</span>
        <span className="current-status">
          {getCurrentOption().icon} {getCurrentOption().label}
        </span>
      </div>
      
      <div className="status-options">
        {statusOptions.map(option => (
          <button
            key={option.value}
            className={`status-option ${currentStatus === option.value ? 'active' : ''}`}
            style={{
              borderColor: currentStatus === option.value ? option.color : '#e0e0e0',
              backgroundColor: currentStatus === option.value ? `${option.color}15` : 'white'
            }}
            onClick={() => onStatusChange(option.value)}
          >
            <span className="option-icon">{option.icon}</span>
            <span className="option-label">{option.label}</span>
          </button>
        ))}
      </div>

      <div className="status-info">
        <p className="info-text">
          {currentStatus === 'on_call' && '✓ You are visible to all hospitals for emergency consults'}
          {currentStatus === 'off_duty' && 'ℹ️ You will not receive new consult requests'}
          {currentStatus === 'in_consult' && '⚠️ Currently busy - only critical requests will be shown'}
          {currentStatus === 'emergency_only' && '🚨 Only critical emergency consults will be routed to you'}
        </p>
      </div>
    </div>
  );
};

export default AvailabilityToggle;
