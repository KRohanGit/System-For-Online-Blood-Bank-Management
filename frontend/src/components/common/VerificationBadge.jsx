import React from 'react';
import './VerificationBadge.css';

/**
 * Verified Request Badge System
 * Shows verification status with trust indicators
 */

const BADGE_TYPES = {
  HOSPITAL_VERIFIED: {
    label: 'Hospital Verified',
    icon: '✓',
    color: '#10b981',
    bgColor: '#d1fae5',
    description: 'Verified by registered hospital admin'
  },
  CAMP_GENERATED: {
    label: 'Camp Generated',
    icon: '🎪',
    color: '#f59e0b',
    bgColor: '#fef3c7',
    description: 'Automatically generated from blood camp'
  },
  COMMUNITY_REVIEWED: {
    label: 'Community Reviewed',
    icon: '👥',
    color: '#3b82f6',
    bgColor: '#dbeafe',
    description: 'Reviewed and approved by admin'
  },
  UNVERIFIED: {
    label: 'Pending Review',
    icon: '⏳',
    color: '#6b7280',
    bgColor: '#f3f4f6',
    description: 'Awaiting admin verification'
  }
};

/**
 * Get badge type based on request source
 * @param {Object} request 
 * @returns {string} Badge type key
 */
export const getBadgeType = (request) => {
  // Hospital created and verified
  if (request.createdBy?.role === 'hospital_admin' || request.source === 'hospital') {
    return 'HOSPITAL_VERIFIED';
  }
  
  // Camp generated (has campId)
  if (request.campId || request.source === 'camp') {
    return 'CAMP_GENERATED';
  }
  
  // Community post that has been reviewed
  if (request.source === 'community' && request.adminReviewed) {
    return 'COMMUNITY_REVIEWED';
  }
  
  // Default: unverified
  return 'UNVERIFIED';
};

const VerificationBadge = ({ request, showDetails = false, onClick = null }) => {
  const badgeType = getBadgeType(request);
  const badge = BADGE_TYPES[badgeType];

  const [showModal, setShowModal] = React.useState(false);

  const handleClick = () => {
    if (onClick) {
      onClick(request);
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <div 
        className={`verification-badge ${badgeType.toLowerCase()}`}
        style={{ 
          backgroundColor: badge.bgColor,
          color: badge.color 
        }}
        onClick={handleClick}
      >
        <span className="badge-icon">{badge.icon}</span>
        <span className="badge-label">{badge.label}</span>
      </div>

      {showDetails && showModal && (
        <div className="verification-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="verification-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            
            <div className="modal-header">
              <span className="modal-icon" style={{ color: badge.color }}>{badge.icon}</span>
              <h3>{badge.label}</h3>
            </div>

            <div className="modal-body">
              <p className="modal-description">{badge.description}</p>

              <div className="verification-details">
                <h4>Verification Details</h4>
                
                <div className="detail-row">
                  <span className="detail-label">Source:</span>
                  <span className="detail-value">
                    {request.source || (request.createdBy?.role === 'hospital_admin' ? 'Hospital' : 'Community')}
                  </span>
                </div>

                {request.createdBy && (
                  <div className="detail-row">
                    <span className="detail-label">Created By:</span>
                    <span className="detail-value">{request.createdBy.name || request.createdBy.email}</span>
                  </div>
                )}

                {request.hospitalName && (
                  <div className="detail-row">
                    <span className="detail-label">Hospital:</span>
                    <span className="detail-value">{request.hospitalName}</span>
                  </div>
                )}

                {request.campId && (
                  <div className="detail-row">
                    <span className="detail-label">Camp ID:</span>
                    <span className="detail-value">{request.campId}</span>
                  </div>
                )}

                {request.reviewedBy && (
                  <div className="detail-row">
                    <span className="detail-label">Reviewed By:</span>
                    <span className="detail-value">{request.reviewedBy}</span>
                  </div>
                )}

                {request.reviewedAt && (
                  <div className="detail-row">
                    <span className="detail-label">Review Date:</span>
                    <span className="detail-value">
                      {new Date(request.reviewedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {request.createdAt && (
                  <div className="detail-row">
                    <span className="detail-label">Created:</span>
                    <span className="detail-value">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="trust-indicator">
                <div className="trust-header">
                  <span className="trust-icon">🛡️</span>
                  <h4>Trust Level</h4>
                </div>
                <div className="trust-bar">
                  <div 
                    className="trust-fill"
                    style={{ 
                      width: badgeType === 'HOSPITAL_VERIFIED' ? '100%' : 
                             badgeType === 'CAMP_GENERATED' ? '85%' :
                             badgeType === 'COMMUNITY_REVIEWED' ? '75%' : '30%',
                      backgroundColor: badge.color
                    }}
                  />
                </div>
                <p className="trust-note">
                  {badgeType === 'HOSPITAL_VERIFIED' && 'Highest trust level - directly from verified hospital'}
                  {badgeType === 'CAMP_GENERATED' && 'High trust - generated from official blood camp'}
                  {badgeType === 'COMMUNITY_REVIEWED' && 'Moderate trust - community post verified by admin'}
                  {badgeType === 'UNVERIFIED' && 'Low trust - pending admin verification'}
                </p>
              </div>

              {badgeType === 'UNVERIFIED' && (
                <div className="warning-box">
                  <span className="warning-icon">⚠️</span>
                  <p>
                    This request has not been verified yet. Please exercise caution and verify 
                    authenticity through official channels before proceeding.
                  </p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-close" onClick={() => setShowModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VerificationBadge;
