import React from 'react';
import './CampOversightCard.css';

/**
 * Blood Camp Oversight Card
 * Displays camp details with oversight actions
 */
const CampOversightCard = ({ camp, onOversight }) => {
  const getCampPhase = (startDate, endDate) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (now < start) return 'pre_camp';
    if (now >= start && now <= end) return 'during_camp';
    return 'post_camp';
  };

  const getPhaseColor = (phase) => {
    const colors = {
      pre_camp: '#3498db',
      during_camp: '#f39c12',
      post_camp: '#27ae60'
    };
    return colors[phase] || '#95a5a6';
  };

  const getPhaseLabel = (phase) => {
    const labels = {
      pre_camp: 'Pre-Camp',
      during_camp: 'Ongoing',
      post_camp: 'Post-Camp'
    };
    return labels[phase] || phase;
  };

  const phase = getCampPhase(camp.startDate || camp.schedule?.date, camp.endDate || camp.schedule?.endTime);
  const hasPreApproval = camp.medicalOversight?.preCampApproval;
  const hasPostApproval = camp.medicalOversight?.postCampApproval;

  return (
    <div className="camp-oversight-card">
      <div className="camp-header">
        <div className="camp-title">
          <h3>{camp.campName}</h3>
          <span 
            className="phase-badge"
            style={{ backgroundColor: getPhaseColor(phase) }}
          >
            {getPhaseLabel(phase)}
          </span>
        </div>
      </div>

      <div className="camp-details">
        <div className="detail-row">
          <span className="detail-label">Venue:</span>
          <span className="detail-value">{camp.venue?.name || 'N/A'}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Date:</span>
          <span className="detail-value">
            {new Date(camp.startDate || camp.schedule?.date).toLocaleDateString()}
          </span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Location:</span>
          <span className="detail-value">
            {camp.venue?.city}, {camp.venue?.state}
          </span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Expected Donors:</span>
          <span className="detail-value">{camp.expectedDonors || camp.capacity || 'N/A'}</span>
        </div>
      </div>

      <div className="oversight-status">
        <div className="status-item">
          <span className="status-label">Pre-Camp Approval:</span>
          <span className={`status-indicator ${hasPreApproval ? 'approved' : 'pending'}`}>
            {hasPreApproval ? '✓ Approved' : '⏳ Pending'}
          </span>
        </div>
        <div className="status-item">
          <span className="status-label">Post-Camp Approval:</span>
          <span className={`status-indicator ${hasPostApproval ? 'approved' : 'pending'}`}>
            {hasPostApproval ? '✓ Approved' : '⏳ Pending'}
          </span>
        </div>
      </div>

      <div className="camp-actions">
        {phase === 'pre_camp' && !hasPreApproval && (
          <button 
            className="oversight-btn pre-camp"
            onClick={() => onOversight(camp._id, 'pre_camp')}
          >
            📋 Pre-Camp Review
          </button>
        )}
        {phase === 'during_camp' && (
          <button 
            className="oversight-btn during-camp"
            onClick={() => onOversight(camp._id, 'during_camp')}
          >
            🔍 Camp Inspection
          </button>
        )}
        {phase === 'post_camp' && !hasPostApproval && (
          <button 
            className="oversight-btn post-camp"
            onClick={() => onOversight(camp._id, 'post_camp')}
          >
            ✓ Post-Camp Approval
          </button>
        )}
        <button 
          className="oversight-btn view-details"
          onClick={() => onOversight(camp._id, 'view')}
        >
          👁️ View Details
        </button>
      </div>
    </div>
  );
};

export default CampOversightCard;
