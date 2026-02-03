import React from 'react';
import { formatDate } from '../../services/bloodInventoryApi';

const FIFOSuggestionCard = ({ unit, rank, onIssue, onReserve }) => {
  const getDaysUntilExpiry = (expiryDate) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const days = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    return days;
  };

  const daysLeft = getDaysUntilExpiry(unit.expiryDate);

  return (
    <div className="fifo-card">
      <div className="fifo-rank">
        #{rank}
      </div>

      <div className="fifo-content">
        <div className="fifo-header">
          <span className="unit-id">{unit.unitId}</span>
          <span className={`blood-badge blood-${unit.bloodGroup.replace('+', 'pos').replace('-', 'neg')}`}>
            {unit.bloodGroup}
          </span>
        </div>

        <div className="fifo-details">
          <div className="detail-row">
            <span className="label">📅 Collection:</span>
            <span>{formatDate(unit.collectionDate)}</span>
          </div>
          <div className="detail-row">
            <span className="label">⏰ Expires:</span>
            <span className={daysLeft <= 3 ? 'text-danger' : ''}>
              {formatDate(unit.expiryDate)}
            </span>
          </div>
          <div className="detail-row">
            <span className="label">📍 Location:</span>
            <span>
              {unit.storageLocation.fridgeId}-R{unit.storageLocation.rackNumber}-S{unit.storageLocation.shelfPosition}
            </span>
          </div>
        </div>

        <div className="fifo-expiry-badge">
          {daysLeft <= 3 ? (
            <span className="badge-critical">⚠️ {daysLeft} day{daysLeft !== 1 ? 's' : ''} left</span>
          ) : (
            <span className="badge-normal">✅ {daysLeft} days left</span>
          )}
        </div>
      </div>

      <div className="fifo-actions">
        <button 
          className="btn-small btn-reserve"
          onClick={() => onReserve(unit._id)}
        >
          🔒 Reserve
        </button>
        <button 
          className="btn-small btn-issue"
          onClick={() => onIssue(unit._id)}
        >
          ✅ Issue
        </button>
      </div>
    </div>
  );
};

export default FIFOSuggestionCard;
