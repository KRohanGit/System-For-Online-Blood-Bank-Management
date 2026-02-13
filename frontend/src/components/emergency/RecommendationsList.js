import React from 'react';
import './RecommendationsList.css';

const RecommendationsList = ({ recommendations, onApprove, onReject, canModify = true }) => {
  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="recommendations-list empty">
        <p>No recommendations generated yet</p>
      </div>
    );
  }

  return (
    <div className="recommendations-list">
      <h3>Preemptive Action Recommendations</h3>
      <p className="recommendations-note">
        These are advisory recommendations only. Admin approval required before execution.
      </p>

      <div className="recommendations-grid">
        {recommendations.map((rec, index) => (
          <RecommendationCard
            key={index}
            recommendation={rec}
            index={index}
            onApprove={() => onApprove(index)}
            onReject={() => onReject(index)}
            canModify={canModify}
          />
        ))}
      </div>
    </div>
  );
};

const RecommendationCard = ({ recommendation, index, onApprove, onReject, canModify }) => {
  const {
    type,
    priority,
    description,
    targetBloodGroups,
    estimatedImpact,
    approved,
    executed
  } = recommendation;

  const getTypeIcon = (type) => {
    switch (type) {
      case 'LOCK_EMERGENCY_UNITS': return '🔒';
      case 'INTER_HOSPITAL_TRANSFER': return '🚚';
      case 'ACTIVATE_DONOR_ALERTS': return '📢';
      case 'POSTPONE_ELECTIVE_PROCEDURES': return '⏸️';
      default: return '📋';
    }
  };

  const getTypeLabel = (type) => {
    return type.split('_').map(word => 
      word.charAt(0) + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const getPriorityClass = (priority) => {
    return priority?.toLowerCase() || 'medium';
  };

  const getStatusBadge = () => {
    if (executed) return <span className="status-badge executed">✓ Executed</span>;
    if (approved) return <span className="status-badge approved">✓ Approved</span>;
    return <span className="status-badge pending">⏳ Pending Review</span>;
  };

  return (
    <div className={`recommendation-card priority-${getPriorityClass(priority)}`}>
      <div className="card-header">
        <div className="rec-title">
          <span className="rec-icon">{getTypeIcon(type)}</span>
          <h4>{getTypeLabel(type)}</h4>
        </div>
        <span className={`priority-badge priority-${getPriorityClass(priority)}`}>
          {priority}
        </span>
      </div>

      <p className="rec-description">{description}</p>

      {targetBloodGroups && targetBloodGroups.length > 0 && (
        <div className="rec-targets">
          <span className="targets-label">Target Blood Groups:</span>
          <div className="blood-groups-list">
            {targetBloodGroups.map(group => (
              <span key={group} className="blood-group-tag">{group}</span>
            ))}
          </div>
        </div>
      )}

      {estimatedImpact && (
        <div className="rec-impact">
          <span className="impact-icon">💡</span>
          <span className="impact-text">{estimatedImpact}</span>
        </div>
      )}

      <div className="rec-footer">
        {getStatusBadge()}
        
        {canModify && !approved && !executed && (
          <div className="rec-actions">
            <button 
              className="action-btn approve-btn"
              onClick={onApprove}
            >
              ✓ Approve
            </button>
            <button 
              className="action-btn reject-btn"
              onClick={onReject}
            >
              ✗ Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecommendationsList;
