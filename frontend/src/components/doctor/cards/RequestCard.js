import React from 'react';
import './RequestCard.css';

const RequestCard = ({ request, onValidate }) => {
  return (
    <div className={`request-card ${request.isEmergency ? 'emergency' : ''}`}>
      {request.isEmergency && <div className="emergency-badge">🚨 EMERGENCY</div>}
      
      <div className="card-header">
        <h4>Request #{request.requestNumber || request._id.slice(-6)}</h4>
        <span className={`status-badge ${request.status}`}>
          {request.status}
        </span>
      </div>

      <div className="card-body">
        <div className="info-row">
          <span className="label">Blood Group:</span>
          <span className="value blood-group">{request.bloodGroup}</span>
        </div>
        <div className="info-row">
          <span className="label">Units Required:</span>
          <span className="value">{request.unitsRequired}</span>
        </div>
        <div className="info-row">
          <span className="label">Hospital:</span>
          <span className="value">{request.hospitalName}</span>
        </div>
        <div className="info-row">
          <span className="label">Patient:</span>
          <span className="value">{request.patientName}</span>
        </div>
        <div className="info-row">
          <span className="label">Reason:</span>
          <span className="value">{request.clinicalReason}</span>
        </div>
        <div className="info-row">
          <span className="label">Requested:</span>
          <span className="value">{new Date(request.createdAt).toLocaleString()}</span>
        </div>
      </div>

      <div className="card-footer">
        <button onClick={onValidate} className="validate-btn">
          Review & Validate
        </button>
      </div>
    </div>
  );
};

export default RequestCard;
