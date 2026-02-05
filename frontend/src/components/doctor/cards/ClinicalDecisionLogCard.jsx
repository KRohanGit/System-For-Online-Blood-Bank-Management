/**
 * ClinicalDecisionLogCard Component
 * 
 * Displays doctor's clinical decision history for legal and ethical accountability
 * Features:
 * - Recent decision entries (last 5)
 * - Action type badges (APPROVED/REJECTED/DOWNGRADED/CANCELLED)
 * - Justification preview with expand option
 * - Timestamp and linked case IDs
 * - "View Full Log" modal for complete history
 */

import React, { useState, useEffect } from 'react';
import { 
  getRecentDecisions, 
  getFullDecisionLog,
  formatDecisionTime 
} from '../../../services/doctorClinicalData';
import './ClinicalDecisionLogCard.css';

const ClinicalDecisionLogCard = () => {
  const [recentDecisions, setRecentDecisions] = useState([]);
  const [showFullLog, setShowFullLog] = useState(false);
  const [fullLogData, setFullLogData] = useState(null);
  const [expandedDecision, setExpandedDecision] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentDecisions();
  }, []);

  const loadRecentDecisions = () => {
    setLoading(true);
    const decisions = getRecentDecisions(5);
    setRecentDecisions(decisions);
    setLoading(false);
  };

  const handleViewFullLog = () => {
    const fullLog = getFullDecisionLog(1, 20);
    setFullLogData(fullLog);
    setShowFullLog(true);
  };

  const handleCloseFullLog = () => {
    setShowFullLog(false);
    setFullLogData(null);
  };

  const toggleExpand = (decisionId) => {
    setExpandedDecision(expandedDecision === decisionId ? null : decisionId);
  };

  const getActionBadgeClass = (actionType) => {
    const classes = {
      'APPROVED': 'badge-approved',
      'REJECTED': 'badge-rejected',
      'DOWNGRADED': 'badge-downgraded',
      'CANCELLED': 'badge-cancelled'
    };
    return classes[actionType] || 'badge-default';
  };

  const getActionIcon = (actionType) => {
    const icons = {
      'APPROVED': '✅',
      'REJECTED': '❌',
      'DOWNGRADED': '⬇️',
      'CANCELLED': '🚫'
    };
    return icons[actionType] || '📝';
  };

  if (loading) {
    return (
      <div className="clinical-decision-log-card loading">
        <div className="spinner-small"></div>
        <p>Loading decision log...</p>
      </div>
    );
  }

  return (
    <>
      <div className="clinical-decision-log-card">
        <div className="card-header">
          <div className="header-left">
            <h3>⚖️ Clinical Decision Log</h3>
            <p className="card-subtitle">Legal & ethical accountability record</p>
          </div>
          <div className="header-badge">
            <span className="decision-count">{recentDecisions.length}</span>
            <span className="badge-label">Recent</span>
          </div>
        </div>

        {recentDecisions.length === 0 ? (
          <div className="no-decisions">
            <div className="no-decisions-icon">📋</div>
            <p>No clinical decisions recorded yet</p>
            <small>Decisions will appear here as you validate blood units, handle consults, etc.</small>
          </div>
        ) : (
          <>
            <div className="decisions-list">
              {recentDecisions.map((decision) => (
                <div key={decision._id} className="decision-item">
                  <div className="decision-header">
                    <div className="decision-header-left">
                      <span className={`action-badge ${getActionBadgeClass(decision.actionType)}`}>
                        {getActionIcon(decision.actionType)} {decision.actionType}
                      </span>
                      <span className="case-type-tag">{decision.caseType}</span>
                    </div>
                    <span className="decision-time">{formatDecisionTime(decision.timestamp)}</span>
                  </div>

                  <div className="decision-details">
                    <div className="case-info">
                      <strong>Case ID:</strong> {decision.caseId}
                      {decision.patientInitials && (
                        <span className="patient-initials"> | Patient: {decision.patientInitials}</span>
                      )}
                    </div>

                    <div className="justification-section">
                      <strong>Clinical Justification:</strong>
                      <p className={`justification-text ${expandedDecision === decision._id ? 'expanded' : 'collapsed'}`}>
                        {decision.justification}
                      </p>
                      {decision.justification.length > 120 && (
                        <button 
                          className="expand-btn"
                          onClick={() => toggleExpand(decision._id)}
                        >
                          {expandedDecision === decision._id ? 'Show less' : 'Read more...'}
                        </button>
                      )}
                    </div>

                    {decision.linkedRecords && decision.linkedRecords.length > 0 && (
                      <div className="linked-records">
                        <small>🔗 Linked Records: {decision.linkedRecords.join(', ')}</small>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button className="view-full-log-btn" onClick={handleViewFullLog}>
              📊 View Full Decision Log
            </button>
          </>
        )}

        <div className="card-info-note">
          <small>
            🔒 <strong>Security Note:</strong> This log is stored securely and accessible to you, 
            hospital administrators, and authorized legal personnel. All entries are immutable and timestamped.
          </small>
        </div>
      </div>

      {/* Full Log Modal */}
      {showFullLog && fullLogData && (
        <div className="modal-overlay" onClick={handleCloseFullLog}>
          <div className="modal-content decision-log-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>📊 Complete Clinical Decision Log</h2>
                <p className="modal-subtitle">
                  {fullLogData.total} total decisions | Page {fullLogData.page} of {fullLogData.totalPages}
                </p>
              </div>
              <button className="close-btn" onClick={handleCloseFullLog}>×</button>
            </div>

            <div className="modal-body">
              <div className="full-log-list">
                {fullLogData.decisions.map((decision) => (
                  <div key={decision._id} className="full-log-item">
                    <div className="log-item-header">
                      <div className="log-header-left">
                        <span className={`action-badge ${getActionBadgeClass(decision.actionType)}`}>
                          {getActionIcon(decision.actionType)} {decision.actionType}
                        </span>
                        <span className="case-type-tag">{decision.caseType}</span>
                      </div>
                      <div className="log-header-right">
                        <span className="decision-time">{formatDecisionTime(decision.timestamp)}</span>
                        <span className="full-timestamp">
                          {new Date(decision.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="log-item-body">
                      <div className="case-info">
                        <strong>Case ID:</strong> {decision.caseId}
                        {decision.patientInitials && (
                          <span> | <strong>Patient:</strong> {decision.patientInitials}</span>
                        )}
                      </div>

                      <div className="justification-full">
                        <strong>Clinical Justification:</strong>
                        <p>{decision.justification}</p>
                      </div>

                      {decision.linkedRecords && decision.linkedRecords.length > 0 && (
                        <div className="linked-records-full">
                          <strong>Linked Records:</strong> {decision.linkedRecords.join(', ')}
                        </div>
                      )}

                      <div className="decision-metadata">
                        <span>Doctor ID: {decision.doctorId}</span>
                        <span>Decision ID: {decision._id}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={handleCloseFullLog}>Close</button>
              <button className="btn-primary" disabled>
                📥 Export as PDF (Coming Soon)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ClinicalDecisionLogCard;
