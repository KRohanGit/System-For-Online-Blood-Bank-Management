import React from 'react';
import { useNavigate } from 'react-router-dom';
import { calculateUrgencyIndex } from './UrgencyIndexCalculator';
import './UrgencyIndexCard.css';

/**
 * Reusable Blood Demand Urgency Index Card
 * Displays urgency score with expandable breakdown
 */
const UrgencyIndexCard = ({ request, compact = false, showViewDetails = false }) => {
  const navigate = useNavigate();
  
  const urgencyData = calculateUrgencyIndex(request);
  const { score, label, color, breakdown } = urgencyData;

  return (
    <div className="urgency-index-card">
      <div className="urgency-header">
        <div className="request-details">
          <div className="detail-item">
            <span className="detail-icon">🩸</span>
            <span className="detail-text">{request.bloodGroup}</span>
          </div>
          <div className="detail-item">
            <span className="detail-icon">💉</span>
            <span className="detail-text">{request.unitsRequired} units</span>
          </div>
          {request.expiryHours && (
            <div className="detail-item">
              <span className="detail-icon">⏰</span>
              <span className="detail-text">{Math.round(request.expiryHours)}h remaining</span>
            </div>
          )}
        </div>
      </div>

      {showViewDetails && (
        <div className="urgency-actions">
          <button 
            className="btn-view-details"
            onClick={() => navigate('/admin/urgency-details', { 
              state: { request, urgencyData } 
            })}
          >
            View Detailed Analysis
          </button>
        </div>
      )}
    </div>
  );
};

export default UrgencyIndexCard;
