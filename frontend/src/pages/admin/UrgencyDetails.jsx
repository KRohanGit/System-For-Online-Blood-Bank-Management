import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../../styles/admin.css';

const UrgencyDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { request, urgencyData } = location.state || {};

  if (!request || !urgencyData) {
    return (
      <div className="urgency-details-container">
        <div className="error-message">
          <h2>No Request Data Available</h2>
          <button onClick={() => navigate('/admin/dashboard')} className="btn-primary">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const { score, label, color, breakdown } = urgencyData;

  // Calculate proximity and availability details
  const totalNearbyUnits = request.nearbyStock?.reduce((sum, stock) => sum + stock.units, 0) || 0;
  const deficit = request.unitsRequired - totalNearbyUnits;
  const fulfillmentPercentage = Math.min((totalNearbyUnits / request.unitsRequired) * 100, 100);
  const averageDistance = request.nearbyStock?.length > 0 
    ? `${request.nearbyStock.length} hospitals within 20km` 
    : 'No nearby sources';

  return (
    <div className="urgency-details-container">
      <div className="details-header">
        <button onClick={() => navigate(-1)} className="btn-back">
          ← Back
        </button>
        <h1>Blood Request Urgency Analysis</h1>
      </div>

      <div className="details-content">
        {/* Overall Urgency Card */}
        <div className="detail-card urgency-summary-card" style={{ borderLeft: `4px solid ${color}` }}>
          <div className="urgency-summary">
            <div className="summary-badge" style={{ backgroundColor: color }}>
              <span className="summary-score">{score}</span>
              <span className="summary-label">{label}</span>
            </div>
            <div className="summary-info">
              <h2>Blood Group: {request.bloodGroup}</h2>
              <p>Required: {request.unitsRequired} units</p>
              <p>Time Remaining: {Math.round(request.expiryHours)} hours</p>
            </div>
          </div>
        </div>

        {/* Detailed Analysis Sections */}
        <div className="analysis-grid">
          {/* 1. Blood Group Rarity Analysis */}
          <div className="detail-card analysis-card">
            <div className="card-icon" style={{ backgroundColor: '#e74c3c' }}>
              <span style={{ fontSize: '24px' }}>🩸</span>
            </div>
            <h3>Blood Group Rarity</h3>
            <div className="analysis-content">
              <div className="stat-row">
                <span className="stat-label">Blood Group:</span>
                <span className="stat-value">{request.bloodGroup}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Rarity Level:</span>
                <span className="stat-value">
                  {['O-', 'AB-', 'B-'].includes(request.bloodGroup) ? 'Very Rare' : 'Common'}
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Population with this type:</span>
                <span className="stat-value">
                  {request.bloodGroup === 'O-' ? '~6-7%' : 
                   request.bloodGroup === 'AB-' ? '~1%' : '~8-10%'}
                </span>
              </div>
              <p className="analysis-note">
                {request.bloodGroup === 'O-' 
                  ? 'O- is the universal donor but extremely rare, making it highly sought after for emergencies.'
                  : request.bloodGroup === 'AB-' 
                  ? 'AB- is the rarest blood type, found in only 1% of the population, making procurement very challenging.'
                  : 'This blood group has moderate availability in blood banks.'}
              </p>
            </div>
          </div>

          {/* 2. Quantity & Demand Analysis */}
          <div className="detail-card analysis-card">
            <div className="card-icon" style={{ backgroundColor: '#3498db' }}>
              <span style={{ fontSize: '24px' }}>💉</span>
            </div>
            <h3>Quantity & Demand</h3>
            <div className="analysis-content">
              <div className="stat-row">
                <span className="stat-label">Units Required:</span>
                <span className="stat-value">{request.unitsRequired} units</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Available Nearby:</span>
                <span className="stat-value">{totalNearbyUnits} units</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Deficit:</span>
                <span className="stat-value" style={{ color: deficit > 0 ? '#e74c3c' : '#27ae60' }}>
                  {deficit > 0 ? `${deficit} units short` : 'Sufficient'}
                </span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ 
                    width: `${fulfillmentPercentage}%`,
                    backgroundColor: fulfillmentPercentage >= 100 ? '#27ae60' : '#e74c3c'
                  }}
                />
              </div>
              <p className="analysis-note">
                {deficit > 0 
                  ? `Critical shortage: Only ${Math.round(fulfillmentPercentage)}% of required blood is available nearby. Additional sources must be contacted urgently.`
                  : 'Sufficient blood available from nearby sources to fulfill this request.'}
              </p>
            </div>
          </div>

          {/* 3. Time Criticality */}
          <div className="detail-card analysis-card">
            <div className="card-icon" style={{ backgroundColor: '#f39c12' }}>
              <span style={{ fontSize: '24px' }}>⏰</span>
            </div>
            <h3>Time Criticality</h3>
            <div className="analysis-content">
              <div className="stat-row">
                <span className="stat-label">Time Remaining:</span>
                <span className="stat-value">{Math.round(request.expiryHours)} hours</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Urgency Level:</span>
                <span className="stat-value">
                  {request.expiryHours < 24 ? 'CRITICAL' : 
                   request.expiryHours < 48 ? 'HIGH' : 'MODERATE'}
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Recommended Action:</span>
                <span className="stat-value">
                  {request.expiryHours < 24 ? 'Immediate' : 
                   request.expiryHours < 48 ? 'Within 12 hours' : 'Within 24 hours'}
                </span>
              </div>
              <p className="analysis-note">
                {request.expiryHours < 24 
                  ? 'This is an emergency situation. Blood must be arranged within the next few hours to prevent critical delays.'
                  : request.expiryHours < 48
                  ? 'Time-sensitive request. Blood should be arranged within 12 hours to ensure timely availability.'
                  : 'Moderate time window. Blood can be arranged through standard procurement channels.'}
              </p>
            </div>
          </div>

          {/* 4. Proximity & Availability */}
          <div className="detail-card analysis-card">
            <div className="card-icon" style={{ backgroundColor: '#9b59b6' }}>
              <span style={{ fontSize: '24px' }}>📍</span>
            </div>
            <h3>Proximity & Availability</h3>
            <div className="analysis-content">
              <div className="stat-row">
                <span className="stat-label">Nearby Sources:</span>
                <span className="stat-value">{request.nearbyStock?.length || 0} hospitals</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Coverage Area:</span>
                <span className="stat-value">{averageDistance}</span>
              </div>
              <div className="nearby-hospitals">
                <h4>Available Sources:</h4>
                {request.nearbyStock?.map((stock, index) => (
                  <div key={index} className="hospital-item">
                    <span className="hospital-name">{stock.hospital}</span>
                    <span className="hospital-units">{stock.units} units</span>
                  </div>
                ))}
              </div>
              <p className="analysis-note">
                {request.nearbyStock?.length > 2 
                  ? 'Good distribution of sources. Multiple hospitals can contribute to fulfill this request.'
                  : request.nearbyStock?.length > 0
                  ? 'Limited sources available. Consider expanding search radius or contacting regional blood banks.'
                  : 'No nearby sources found. Immediate coordination with regional/national blood banks required.'}
              </p>
            </div>
          </div>

          {/* 5. Overall Risk Assessment */}
          <div className="detail-card analysis-card full-width">
            <div className="card-icon" style={{ backgroundColor: color }}>
              <span style={{ fontSize: '24px' }}>⚠️</span>
            </div>
            <h3>Overall Risk Assessment</h3>
            <div className="analysis-content">
              <div className="risk-factors">
                <h4>Contributing Factors:</h4>
                {breakdown.map((item, index) => (
                  <div key={index} className="risk-factor-item">
                    <div className="factor-header">
                      <span className="factor-name">{item.factor}</span>
                      <span className="factor-score">{item.score}/{item.maxScore}</span>
                    </div>
                    <div className="factor-bar">
                      <div 
                        className="factor-fill"
                        style={{ 
                          width: `${(item.score / item.maxScore) * 100}%`,
                          backgroundColor: color
                        }}
                      />
                    </div>
                    <p className="factor-reason">{item.reason}</p>
                  </div>
                ))}
              </div>
              <div className="recommendation-box">
                <h4>Recommended Actions:</h4>
                <ul>
                  {score >= 80 && (
                    <>
                      <li>Activate emergency blood procurement protocol</li>
                      <li>Contact all nearby blood banks immediately</li>
                      <li>Initiate emergency donor mobilization</li>
                      <li>Consider helicopter/rapid transport if needed</li>
                    </>
                  )}
                  {score >= 60 && score < 80 && (
                    <>
                      <li>Contact nearby hospitals with available stock</li>
                      <li>Prepare emergency donor list for mobilization</li>
                      <li>Monitor situation closely for any deterioration</li>
                      <li>Arrange standby transport for blood transfer</li>
                    </>
                  )}
                  {score < 60 && (
                    <>
                      <li>Coordinate with identified hospitals for stock transfer</li>
                      <li>Follow standard blood procurement procedures</li>
                      <li>Maintain regular monitoring of stock levels</li>
                      <li>Keep backup sources identified and ready</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UrgencyDetails;
