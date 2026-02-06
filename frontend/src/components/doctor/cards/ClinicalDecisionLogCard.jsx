

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
          <h3>Clinical Decision Log</h3>
          <span className="decision-count">{recentDecisions.length} Recent</span>
        </div>

        {recentDecisions.length === 0 ? (
          <div className="no-decisions">
            <p>No decisions recorded</p>
          </div>
        ) : (
          <>
            <div className="decisions-list">
              {recentDecisions.map((decision) => (
                <div key={decision._id} className="decision-item">
                  <div className="decision-header">
                    <span className="action-badge">{decision.actionType}</span>
                    <span className="case-type-tag">{decision.caseType}</span>
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
                      <strong>Justification:</strong>
                      <p className="justification-text">{decision.justification}</p>
                    </div>


                  </div>
                </div>
              ))}
            </div>

            <button className="view-full-log-btn" onClick={handleViewFullLog}>
              View Full Log
            </button>
          </>
        )}


      </div>

      {/* Full Log Modal */}
      {showFullLog && fullLogData && (
        <div className="modal-overlay" onClick={handleCloseFullLog}>
          <div className="modal-content decision-log-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Clinical Decision Log</h2>
              <button className="close-btn" onClick={handleCloseFullLog}>×</button>
            </div>

            <div className="modal-body">
              <div className="full-log-list">
                {fullLogData.decisions.map((decision) => (
                  <div key={decision._id} className="full-log-item">
                    <div className="log-item-header">
                      <span className="action-badge">{decision.actionType}</span>
                      <span className="case-type-tag">{decision.caseType}</span>
                      <span className="decision-time">{new Date(decision.timestamp).toLocaleString()}</span>
                    </div>

                    <div className="log-item-body">
                      <div className="case-info">
                        <strong>Case ID:</strong> {decision.caseId}
                        {decision.patientInitials && (
                          <span> | <strong>Patient:</strong> {decision.patientInitials}</span>
                        )}
                      </div>

                      <div className="justification-full">
                        <strong>Justification:</strong>
                        <p>{decision.justification}</p>
                      </div>



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
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ClinicalDecisionLogCard;
