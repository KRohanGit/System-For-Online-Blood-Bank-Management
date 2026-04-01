import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../../config/config';
import './GeoTimeHeatmap.css';

/**
 * Geo-Time Heatmap for Blood Demand Visualization
 * Shows demand intensity by location from real hospital data
 */

const BLOOD_GROUPS = ['ALL', 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

const GeoTimeHeatmap = ({ hospitalLocation = null }) => {
  const [timeFilter, setTimeFilter] = useState('7d');
  const [bloodGroupFilter, setBloodGroupFilter] = useState('ALL');
  const [heatmapData, setHeatmapData] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  const hasConfiguredHospitalLocation =
    hospitalLocation &&
    Number.isFinite(hospitalLocation.latitude) &&
    Number.isFinite(hospitalLocation.longitude);

  useEffect(() => {
    fetchHeatmapData();
  }, [timeFilter, bloodGroupFilter, hasConfiguredHospitalLocation, hospitalLocation]);

  const fetchHeatmapData = async () => {
    setLoading(true);
    try {
      if (!hasConfiguredHospitalLocation) {
        setHeatmapData([]);
        setLoading(false);
        return;
      }

      const API_URL = config?.API_URL || process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const center = hospitalLocation;

      // Fetch nearby hospitals and live emergency requests
      const [hospitalsResp, requestsResp] = await Promise.allSettled([
        axios.get(`${API_URL}/geolocation/nearby-hospitals`, {
          params: { latitude: center.latitude, longitude: center.longitude, radius: 100, limit: 100 },
          headers
        }),
        axios.get(`${API_URL}/emergency-coordination/requests`, { headers })
      ]);

      const hospitals = hospitalsResp.status === 'fulfilled' 
        ? (hospitalsResp.value.data?.data?.hospitals || hospitalsResp.value.data?.hospitals || [])
        : [];
      
      const requests = requestsResp.status === 'fulfilled'
        ? (requestsResp.value.data?.requests || [])
        : [];

      const now = Date.now();
      const hoursWindow = timeFilter === '24h' ? 24 : timeFilter === '7d' ? 24 * 7 : 24 * 30;
      const minTimestamp = now - (hoursWindow * 60 * 60 * 1000);

      const filteredRequests = requests.filter((request) => {
        const createdAt = request?.createdAt ? new Date(request.createdAt).getTime() : 0;
        const inWindow = createdAt >= minTimestamp;
        const bloodGroupMatch = bloodGroupFilter === 'ALL' || request?.bloodGroup === bloodGroupFilter;
        return inWindow && bloodGroupMatch;
      });

      const requestMap = filteredRequests.reduce((acc, request) => {
        const hospitalId = String(request?.requestingHospitalId || '');
        if (!hospitalId) return acc;

        const existing = acc.get(hospitalId) || { total: 0, fulfilled: 0 };
        existing.total += 1;
        if (request?.lifecycleStatus === 'DELIVERED' || request?.lifecycleStatus === 'COMPLETED') {
          existing.fulfilled += 1;
        }
        acc.set(hospitalId, existing);
        return acc;
      }, new Map());

      const data = hospitals
        .map((hospital, idx) => {
          const lat = Number(hospital?.location?.latitude);
          const lng = Number(hospital?.location?.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return null;
          }

          const hospitalId = String(hospital?.id || hospital?._id || '');
          const demandMetrics = requestMap.get(hospitalId) || { total: 0, fulfilled: 0 };

          return {
            id: idx + 1,
            hospitalId,
            name: hospital?.name || hospital?.hospitalName || 'Unknown Hospital',
            lat,
            lng,
            requests: demandMetrics.total,
            fulfilled: demandMetrics.fulfilled,
            phone: hospital?.phone || 'N/A',
            city: hospital?.city || 'N/A',
            distance: Number(hospital?.distance || 0)
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.distance - b.distance);

      setHeatmapData(data);
    } catch (err) {
      console.error('Heatmap fetch error:', err);
      setHeatmapData([]);
    } finally {
      setLoading(false);
    }
  };

  const getIntensityColor = (requests, fulfilled) => {
    if (requests <= 0) return '#10b981';
    const unfulfilled = requests - fulfilled;
    const ratio = unfulfilled / requests;
    
    if (ratio >= 0.4) return '#dc2626'; // Red - High demand
    if (ratio >= 0.3) return '#ea580c'; // Orange
    if (ratio >= 0.2) return '#f59e0b'; // Amber
    if (ratio >= 0.1) return '#fbbf24'; // Yellow
    return '#10b981'; // Green - Low demand
  };

  const getIntensityLabel = (requests, fulfilled) => {
    if (requests <= 0) return 'NO ACTIVE REQUESTS';
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

  const getHeatPointPosition = (location) => {
    if (!heatmapData.length) {
      return { left: '50%', top: '50%' };
    }

    const lats = heatmapData.map((item) => item.lat);
    const lngs = heatmapData.map((item) => item.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latRange = maxLat - minLat || 1;
    const lngRange = maxLng - minLng || 1;

    const normalizedX = (location.lng - minLng) / lngRange;
    const normalizedY = (maxLat - location.lat) / latRange;

    const padding = 10;
    const left = padding + (normalizedX * (100 - (padding * 2)));
    const top = padding + (normalizedY * (100 - (padding * 2)));

    return {
      left: `${left}%`,
      top: `${top}%`
    };
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
        <div className="heatmap-canvas">
          {heatmapData.length > 0 ? (
            <div className="map-overlay">
              {heatmapData.map((location) => {
                const color = getIntensityColor(location.requests, location.fulfilled);
                const size = getIntensitySize(location.requests);
                const position = getHeatPointPosition(location);

                return (
                  <div
                    key={location.id}
                    className="heat-point"
                    style={{
                      backgroundColor: color,
                      width: `${size}px`,
                      height: `${size}px`,
                      left: position.left,
                      top: position.top,
                      boxShadow: `0 0 ${size / 2}px ${color}`
                    }}
                    onClick={() => handleLocationClick(location)}
                  >
                    <div className="heat-point-label">{location.requests}</div>
                  </div>
                );
              })}
            </div>
          ) : null}
          <div className="map-placeholder">
            <span className="map-icon">🗺️</span>
            <p>
              {!hasConfiguredHospitalLocation
                ? 'Hospital location not configured'
                : heatmapData.length > 0
                ? 'Nearby Hospitals Heat View'
                : 'No Nearby Hospital Data'}
            </p>
            <small>
              {!hasConfiguredHospitalLocation
                ? 'Set your hospital coordinates during signup or profile setup to enable real-time location intelligence.'
                : heatmapData.length > 0
                ? 'Points are positioned from real hospital coordinates and live emergency request trends.'
                : 'No approved nearby hospitals found for the selected filters.'}
            </small>
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
                        width: `${location.requests > 0 ? (location.fulfilled / location.requests) * 100 : 0}%`,
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
