import React from 'react';
import './BloodUnitCard.css';

const BloodUnitCard = ({ unit }) => {
  const getStatusColor = (status) => {
    const colors = {
      'collected': '#4CAF50',
      'processing': '#2196F3',
      'tested': '#FF9800',
      'available': '#8BC34A',
      'transfused': '#9C27B0',
      'discarded': '#F44336',
      'expired': '#757575'
    };
    return colors[status] || '#999';
  };

  const getAgeStatus = (collectionDate) => {
    const now = new Date();
    const collected = new Date(collectionDate);
    const days = Math.floor((now - collected) / (1000 * 60 * 60 * 24));
    
    if (days <= 5) return { text: `${days} days old`, color: '#4CAF50' };
    if (days <= 30) return { text: `${days} days old`, color: '#FF9800' };
    return { text: `${days} days old`, color: '#F44336' };
  };

  const ageStatus = getAgeStatus(unit.collectionDate);

  return (
    <div className="blood-unit-card">
      <div className="card-header">
        <div className="blood-group-display">{unit.bloodGroup}</div>
        <div className="unit-id">
          <small>Unit ID</small>
          <code>{unit.unitId}</code>
        </div>
      </div>

      <div className="card-body">
        <div className="status-bar">
          <div 
            className="status-indicator" 
            style={{ backgroundColor: getStatusColor(unit.status) }}
          >
            {unit.status.toUpperCase()}
          </div>
          <div className="age-indicator" style={{ color: ageStatus.color }}>
            {ageStatus.text}
          </div>
        </div>

        <div className="info-grid">
          <div className="info-item">
            <label>Component</label>
            <span>{unit.component}</span>
          </div>
          <div className="info-item">
            <label>Volume</label>
            <span>{unit.volume} mL</span>
          </div>
          <div className="info-item">
            <label>Collection Date</label>
            <span>{new Date(unit.collectionDate).toLocaleDateString()}</span>
          </div>
          <div className="info-item">
            <label>Location</label>
            <span>{unit.currentLocation || 'Processing'}</span>
          </div>
        </div>

        {unit.blockchainTx && (
          <div className="blockchain-info">
            <label>🔗 Blockchain Verified</label>
            <code className="tx-hash">{unit.blockchainTx}</code>
          </div>
        )}

        {unit.testResults && (
          <div className="test-results">
            <h4>Test Results</h4>
            <div className="test-badges">
              {Object.entries(unit.testResults).map(([test, result]) => (
                <span 
                  key={test} 
                  className={`test-badge ${result ? 'negative' : 'positive'}`}
                  title={`${test}: ${result ? 'Positive (Discard)' : 'Negative (Safe)'}`}
                >
                  {test} {result ? '⚠️' : '✓'}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="card-footer">
        <div className="qr-code">
          <small>Scan for verification</small>
          {/* QR code would be rendered here */}
        </div>
      </div>
    </div>
  );
};

export default BloodUnitCard;
