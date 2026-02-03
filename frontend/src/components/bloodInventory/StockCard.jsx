import React from 'react';
import { formatDate } from '../../services/bloodInventoryApi';

const StockCard = ({ bloodGroup, units, status, expiringSoon, lastUpdated, onAction }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'Critical': return '#ef4444';
      case 'Low': return '#f59e0b';
      case 'Adequate': return '#10b981';
      default: return '#6b7280';
    }
  };

  return (
    <div 
      className="stock-card" 
      style={{ borderLeftColor: getStatusColor() }}
      onClick={onAction}
    >
      <div className="stock-card-header">
        <h3 className="blood-group">{bloodGroup}</h3>
        <span 
          className="status-badge"
          style={{ backgroundColor: getStatusColor() }}
        >
          {status}
        </span>
      </div>

      <div className="stock-card-body">
        <div className="units-count">
          <span className="count-number">{units}</span>
          <span className="count-label">Available Units</span>
        </div>

        {expiringSoon > 0 && (
          <div className="expiry-alert">
            ⚠️ {expiringSoon} expiring soon
          </div>
        )}
      </div>

      <div className="stock-card-footer">
        <small>Updated: {formatDate(lastUpdated)}</small>
      </div>
    </div>
  );
};

export default StockCard;
