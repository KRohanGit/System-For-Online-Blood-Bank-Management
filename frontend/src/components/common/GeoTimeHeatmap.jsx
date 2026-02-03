import React, { useState, useEffect } from 'react';
import './GeoTimeHeatmap.css';

/**
 * Geo-Time Heatmap for Blood Demand Visualization
 * Shows demand intensity by location and time
 */

// Mock data generator for demonstration
const generateMockData = (timeFilter) => {
  const locations = [
    { id: 1, name: 'Madhurawada', lat: 17.7831, lng: 83.3780, requests: 45, fulfilled: 38 },
    { id: 2, name: 'Hanumanthawaka', lat: 17.7500, lng: 83.2833, requests: 38, fulfilled: 30 },
    { id: 3, name: 'Yendada', lat: 17.7697, lng: 83.3629, requests: 52, fulfilled: 45 },
    { id: 4, name: 'Town', lat: 17.6868, lng: 83.2185, requests: 31, fulfilled: 28 },
    { id: 5, name: 'Gajuwaka', lat: 17.7000, lng: 83.2167, requests: 42, fulfilled: 35 },
    { id: 6, name: 'MVP Colony', lat: 17.7306, lng: 83.3185, requests: 36, fulfilled: 32 },
    { id: 7, name: 'Rushikonda', lat: 17.7860, lng: 83.3850, requests: 29, fulfilled: 24 },
    { id: 8, name: 'Dwaraka Nagar', lat: 17.7231, lng: 83.3145, requests: 27, fulfilled: 23 }
  ];

  // Adjust numbers based on time filter
  const multiplier = timeFilter === '24h' ? 0.3 : timeFilter === '7d' ? 1 : 3.5;
  
  return locations.map(loc => ({
    ...loc,
    requests: Math.round(loc.requests * multiplier),
    fulfilled: Math.round(loc.fulfilled * multiplier)
  }));
};

const BLOOD_GROUPS = ['ALL', 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

const GeoTimeHeatmap = () => {
  const [timeFilter, setTimeFilter] = useState('7d');
  const [bloodGroupFilter, setBloodGroupFilter] = useState('ALL');
  const [heatmapData, setHeatmapData] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHeatmapData();
  }, [timeFilter, bloodGroupFilter]);

  const fetchHeatmapData = async () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      const data = generateMockData(timeFilter);
      setHeatmapData(data);
      setLoading(false);
    }, 500);
  };

  const getIntensityColor = (requests, fulfilled) => {
    const unfulfilled = requests - fulfilled;
    const ratio = unfulfilled / requests;
    
    if (ratio >= 0.4) return '#dc2626'; // Red - High demand
    if (ratio >= 0.3) return '#ea580c'; // Orange
    if (ratio >= 0.2) return '#f59e0b'; // Amber
    if (ratio >= 0.1) return '#fbbf24'; // Yellow
    return '#10b981'; // Green - Low demand
  };

  const getIntensityLabel = (requests, fulfilled) => {
    const ratio = (requests - fulfilled) / requests;
    if (ratio >= 0.4) return 'CRITICAL';
    if (ratio >= 0.3) return 'HIGH';
    if (ratio >= 0.2) return 'MEDIUM';
    if (ratio >= 0.1) return 'LOW';
    return 'MINIMAL';
  };

  const getIntensitySize = (requests) => {
    const maxRequests = Math.max(...heatmapData.map(d => d.requests), 1);
    const baseSize = 40;
    const maxSize = 120;
    return baseSize + ((requests / maxRequests) * (maxSize - baseSize));
  };

  const handleLocationClick = (location) => {
    setSelectedLocation(location);
  };

  if (loading) {
    return <div className="heatmap-loading">Loading heatmap data...</div>;
  }

  return (
    <div className="geo-time-heatmap">
      <div className="heatmap-header">
        <div className="header-content">
          <h2>Blood Demand Heat Map</h2>
          <p>Geographic visualization of blood demand intensity</p>
        </div>

        <div className="header-filters">
          <div className="filter-group">
            <label>Time Period</label>
            <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Blood Group</label>
            <select value={bloodGroupFilter} onChange={(e) => setBloodGroupFilter(e.target.value)}>
              {BLOOD_GROUPS.map(group => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="heatmap-legend">
        <h4>Demand Intensity Legend</h4>
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#10b981' }}></span>
            <span>Minimal</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#fbbf24' }}></span>
            <span>Low</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#f59e0b' }}></span>
            <span>Medium</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#ea580c' }}></span>
            <span>High</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#dc2626' }}></span>
            <span>Critical</span>
          </div>
        </div>
      </div>

      <div className="heatmap-container">
        {/* Placeholder map - in production, use actual map library like Leaflet or Google Maps */}
        <div className="heatmap-canvas">
          <div className="map-overlay">
            {heatmapData.map((location) => {
              const color = getIntensityColor(location.requests, location.fulfilled);
              const size = getIntensitySize(location.requests);
              const intensity = getIntensityLabel(location.requests, location.fulfilled);
              
              return (
                <div
                  key={location.id}
                  className="heat-point"
                  style={{
                    backgroundColor: color,
                    width: `${size}px`,
                    height: `${size}px`,
                    left: `${(location.id % 4) * 25}%`,
                    top: `${Math.floor(location.id / 4) * 33}%`,
                    boxShadow: `0 0 ${size/2}px ${color}`
                  }}
                  onClick={() => handleLocationClick(location)}
                >
                  <div className="heat-point-label">{location.requests}</div>
                </div>
              );
            })}
          </div>
          <div className="map-placeholder">
            <span className="map-icon">🗺️</span>
            <p>Interactive Map View</p>
            <small>In production: Integrate with Leaflet/Google Maps API</small>
          </div>
        </div>

        <div className="locations-sidebar">
          <h3>Locations ({heatmapData.length})</h3>
          <div className="locations-list">
            {heatmapData.map((location) => {
              const color = getIntensityColor(location.requests, location.fulfilled);
              const intensity = getIntensityLabel(location.requests, location.fulfilled);
              const unfulfilled = location.requests - location.fulfilled;
              
              return (
                <div
                  key={location.id}
                  className={`location-card ${selectedLocation?.id === location.id ? 'selected' : ''}`}
                  onClick={() => handleLocationClick(location)}
                  style={{ borderLeftColor: color }}
                >
                  <div className="location-header">
                    <h4>{location.name}</h4>
                    <span 
                      className="location-badge"
                      style={{ backgroundColor: color }}
                    >
                      {intensity}
                    </span>
                  </div>
                  
                  <div className="location-stats">
                    <div className="stat-item">
                      <span className="stat-label">Total Requests</span>
                      <span className="stat-value">{location.requests}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Fulfilled</span>
                      <span className="stat-value fulfilled">{location.fulfilled}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Unfulfilled</span>
                      <span className="stat-value unfulfilled">{unfulfilled}</span>
                    </div>
                  </div>

                  <div className="fulfillment-bar">
                    <div 
                      className="fulfillment-fill"
                      style={{ 
                        width: `${(location.fulfilled / location.requests) * 100}%`,
                        backgroundColor: '#10b981'
                      }}
                    />
                  </div>
                  
                  <p className="location-coordinates">
                    📍 {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selectedLocation && (
        <div className="location-detail-modal" onClick={() => setSelectedLocation(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedLocation(null)}>×</button>
            
            <h3>{selectedLocation.name}</h3>
            
            <div className="detail-stats">
              <div className="detail-stat">
                <span className="detail-icon">📊</span>
                <div>
                  <strong>Total Requests</strong>
                  <span className="detail-number">{selectedLocation.requests}</span>
                </div>
              </div>
              
              <div className="detail-stat">
                <span className="detail-icon">✅</span>
                <div>
                  <strong>Fulfilled</strong>
                  <span className="detail-number">{selectedLocation.fulfilled}</span>
                </div>
              </div>
              
              <div className="detail-stat">
                <span className="detail-icon">❌</span>
                <div>
                  <strong>Unfulfilled</strong>
                  <span className="detail-number">{selectedLocation.requests - selectedLocation.fulfilled}</span>
                </div>
              </div>
              
              <div className="detail-stat">
                <span className="detail-icon">📈</span>
                <div>
                  <strong>Fulfillment Rate</strong>
                  <span className="detail-number">
                    {Math.round((selectedLocation.fulfilled / selectedLocation.requests) * 100)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="planning-section">
              <h4>📅 Planning Recommendation</h4>
              <p>
                {selectedLocation.requests - selectedLocation.fulfilled > 10 
                  ? `High unfulfilled demand detected. Consider organizing a blood camp in ${selectedLocation.name} within the next 2-3 weeks.`
                  : `Demand is relatively stable. Continue regular monitoring and schedule camps as per normal rotation.`
                }
              </p>
            </div>

            <button className="btn-primary" onClick={() => setSelectedLocation(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeoTimeHeatmap;
