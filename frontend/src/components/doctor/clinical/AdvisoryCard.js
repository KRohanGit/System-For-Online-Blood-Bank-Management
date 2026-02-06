import React, { useState } from 'react';
import './AdvisoryCard.css';

const AdvisoryCard = ({ advisory, onAction, onSelect }) => {
  const [showProtocol, setShowProtocol] = useState(false);
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [justification, setJustification] = useState('');

  const getSeverityClass = (severity) => {
    return `severity-${severity}`;
  };

  const handleAccept = () => {
    onAction(advisory.advisoryId, 'accepted', 'Advisory recommendation accepted');
    alert('Advisory accepted');
  };

  const handleOverride = () => {
    if (!justification.trim()) {
      alert('Justification is mandatory for overriding');
      return;
    }
    onAction(advisory.advisoryId, 'overridden', justification);
    setShowOverrideForm(false);
    setJustification('');
    alert('Advisory overridden with justification');
  };

  return (
    <div className={`advisory-card ${getSeverityClass(advisory.severity)}`}>
      <div className="advisory-header">
        <div className="blood-group-badge">{advisory.bloodGroup}</div>
        <div className={`severity-badge ${getSeverityClass(advisory.severity)}`}>
          {advisory.severity.toUpperCase()}
        </div>
      </div>

      <div className="advisory-body">
        <div className="stock-info">
          <div className="stock-item">
            <span className="label">Current Stock:</span>
            <span className="value">{advisory.currentStock} units</span>
          </div>
          {advisory.expiringUnits > 0 && (
            <div className="stock-item expiring">
              <span className="label">Expiring Soon:</span>
              <span className="value">{advisory.expiringUnits} units</span>
            </div>
          )}
          {advisory.isRare && (
            <div className="rare-badge">⭐ Rare Blood Type</div>
          )}
        </div>

        <div className="recommendation">
          <strong>Recommendation:</strong>
          <p>{advisory.recommendation}</p>
        </div>

        <button
          className="protocol-toggle"
          onClick={() => setShowProtocol(!showProtocol)}
        >
          {showProtocol ? '▼' : '▶'} Protocol Reference
        </button>

        {showProtocol && (
          <div className="protocol-details">
            <strong>{advisory.protocolRule}</strong>
            <small className="protocol-timestamp">
              Triggered: {new Date(advisory.triggeredAt).toLocaleString()}
            </small>
          </div>
        )}
      </div>

      <div className="advisory-actions">
        {!showOverrideForm ? (
          <>
            <button className="btn-accept" onClick={handleAccept}>
              ✓ Accept
            </button>
            <button className="btn-override" onClick={() => setShowOverrideForm(true)}>
              Override
            </button>
          </>
        ) : (
          <div className="override-form">
            <textarea
              placeholder="Mandatory justification for override..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={3}
            />
            <div className="override-actions">
              <button className="btn-submit" onClick={handleOverride}>
                Submit Override
              </button>
              <button className="btn-cancel" onClick={() => {
                setShowOverrideForm(false);
                setJustification('');
              }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvisoryCard;
