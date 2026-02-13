import React, { useState, useEffect } from 'react';
import { getExpiringUnits, formatDate } from '../../services/bloodInventoryApi';
import './ExpiryWatch.css';

const ExpiryWatch = () => {
  const [expiringData, setExpiringData] = useState({
    critical: [],
    urgent: [],
    warning: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('critical');

  useEffect(() => {
    fetchExpiringUnits();
  }, []);

  const fetchExpiringUnits = async () => {
    setLoading(true);
    try {
      const response = await getExpiringUnits();
      setExpiringData(response.data?.categorized || response.categorized || { critical: [], urgent: [], warning: [] });
    } catch (error) {
      console.error('Failed to fetch expiring units:', error);
      setExpiringData({ critical: [], urgent: [], warning: [] });
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    {
      key: 'critical',
      label: 'Critical',
      icon: '🚨',
      description: '< 24 hours',
      color: '#ef4444'
    },
    {
      key: 'urgent',
      label: 'Urgent',
      icon: '⚠️',
      description: '< 72 hours',
      color: '#f59e0b'
    },
    {
      key: 'warning',
      label: 'Warning',
      icon: '⏰',
      description: '< 7 days',
      color: '#eab308'
    }
  ];

  const getHoursRemaining = (expiryDate) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const hours = Math.floor((expiry - now) / (1000 * 60 * 60));
    
    if (hours < 24) {
      return `${hours} hours`;
    } else {
      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? 's' : ''}`;
    }
  };

  if (loading) {
    return <div className="loading">Loading expiry data...</div>;
  }

  return (
    <div className="expiry-watch">
      <div className="expiry-header">
        <h2>Expiry Watch</h2>
        <button 
          className="btn-refresh"
          onClick={fetchExpiringUnits}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Category Cards */}
      <div className="expiry-categories">
        {categories.map((category) => (
          <div
            key={category.key}
            className={`expiry-card ${selectedCategory === category.key ? 'active' : ''}`}
            style={{ borderColor: category.color }}
            onClick={() => setSelectedCategory(category.key)}
          >
            <div className="card-icon" style={{ color: category.color }}>
              {category.icon}
            </div>
            <div className="card-content">
              <h3>{category.label}</h3>
              <p className="card-description">{category.description}</p>
              <div 
                className="card-count"
                style={{ color: category.color }}
              >
                {expiringData[category.key].length}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Units List */}
      <div className="expiry-units-section">
        <h3>
          {categories.find(c => c.key === selectedCategory)?.label} Units
          ({expiringData[selectedCategory].length})
        </h3>

        {expiringData[selectedCategory].length === 0 ? (
          <div className="no-data">
            ✅ No {selectedCategory} expiring units
          </div>
        ) : (
          <div className="expiry-units-list">
            {expiringData[selectedCategory].map((unit) => (
              <div key={unit._id} className="expiry-unit-card">
                <div className="unit-main-info">
                  <div className="unit-header">
                    <span className="unit-id">{unit.unitId}</span>
                    <span className={`blood-type blood-type-${unit.bloodGroup}`}>
                      {unit.bloodGroup}
                    </span>
                  </div>
                  
                  <div className="unit-details">
                    <div className="detail-item">
                      <span className="label">Storage:</span>
                      <span>{unit.storageType}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Location:</span>
                      <span>
                        {unit.storageLocation.fridgeId} - 
                        Rack {unit.storageLocation.rackNumber} - 
                        Shelf {unit.storageLocation.shelfPosition}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Status:</span>
                      <span className={`status-badge status-${unit.status.toLowerCase()}`}>
                        {unit.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="unit-expiry-info">
                  <div className="expiry-countdown">
                    <span className="countdown-label">Expires In:</span>
                    <span className="countdown-value">
                      {getHoursRemaining(unit.expiryDate)}
                    </span>
                  </div>
                  <div className="expiry-date">
                    {formatDate(unit.expiryDate)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpiryWatch;
