import React, { useState } from 'react';
import './IncidentForm.css';

const INCIDENT_TYPES = [
  { value: 'road_accident', label: 'Road Accident' },
  { value: 'disaster', label: 'Natural Disaster' },
  { value: 'festival', label: 'Mass Festival' },
  { value: 'industrial_accident', label: 'Industrial Accident' },
  { value: 'natural_calamity', label: 'Natural Calamity' },
  { value: 'mass_casualty', label: 'Mass Casualty Event' }
];

const IncidentForm = ({ onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    incidentType: 'road_accident',
    incidentLocation: {
      latitude: '',
      longitude: '',
      areaName: '',
      city: ''
    },
    estimatedCasualties: '',
    incidentTime: new Date().toISOString().slice(0, 16),
    severityDistribution: {
      criticalPercentage: 30,
      moderatePercentage: 40,
      minorPercentage: 30
    },
    notes: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSeverityChange = (e) => {
    const { name, value } = e.target;
    const numValue = parseInt(value) || 0;
    
    setFormData(prev => ({
      ...prev,
      severityDistribution: {
        ...prev.severityDistribution,
        [name]: numValue
      }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate severity percentages add up to 100
    const { criticalPercentage, moderatePercentage, minorPercentage } = formData.severityDistribution;
    const total = criticalPercentage + moderatePercentage + minorPercentage;
    
    if (total !== 100) {
      alert(`Severity distribution must add up to 100% (currently ${total}%)`);
      return;
    }
    
    onSubmit({
      ...formData,
      estimatedCasualties: parseInt(formData.estimatedCasualties),
      incidentLocation: {
        ...formData.incidentLocation,
        latitude: parseFloat(formData.incidentLocation.latitude),
        longitude: parseFloat(formData.incidentLocation.longitude)
      }
    });
  };

  const severityTotal = 
    formData.severityDistribution.criticalPercentage +
    formData.severityDistribution.moderatePercentage +
    formData.severityDistribution.minorPercentage;

  return (
    <form className="incident-form" onSubmit={handleSubmit}>
      <div className="simulation-badge">
        🔬 SIMULATION MODE - No Real Alerts Will Be Triggered
      </div>

      <div className="form-section">
        <h3>Incident Details</h3>
        
        <div className="form-group">
          <label>Incident Type *</label>
          <select
            name="incidentType"
            value={formData.incidentType}
            onChange={handleChange}
            required
          >
            {INCIDENT_TYPES.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Estimated Casualties *</label>
            <input
              type="number"
              name="estimatedCasualties"
              value={formData.estimatedCasualties}
              onChange={handleChange}
              min="1"
              required
            />
          </div>

          <div className="form-group">
            <label>Incident Time *</label>
            <input
              type="datetime-local"
              name="incidentTime"
              value={formData.incidentTime}
              onChange={handleChange}
              required
            />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Location</h3>
        
        <div className="form-row">
          <div className="form-group">
            <label>Area Name *</label>
            <input
              type="text"
              name="incidentLocation.areaName"
              value={formData.incidentLocation.areaName}
              onChange={handleChange}
              placeholder="e.g., Downtown Square"
              required
            />
          </div>

          <div className="form-group">
            <label>City *</label>
            <input
              type="text"
              name="incidentLocation.city"
              value={formData.incidentLocation.city}
              onChange={handleChange}
              placeholder="e.g., Mumbai"
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Latitude *</label>
            <input
              type="number"
              step="0.000001"
              name="incidentLocation.latitude"
              value={formData.incidentLocation.latitude}
              onChange={handleChange}
              placeholder="19.0760"
              required
            />
          </div>

          <div className="form-group">
            <label>Longitude *</label>
            <input
              type="number"
              step="0.000001"
              name="incidentLocation.longitude"
              value={formData.incidentLocation.longitude}
              onChange={handleChange}
              placeholder="72.8777"
              required
            />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Severity Distribution</h3>
        <p className="help-text">Adjust percentages (must total 100%)</p>
        
        <div className="severity-controls">
          <div className="severity-item">
            <label>Critical Cases</label>
            <input
              type="number"
              name="criticalPercentage"
              value={formData.severityDistribution.criticalPercentage}
              onChange={handleSeverityChange}
              min="0"
              max="100"
            />
            <span className="percentage">%</span>
          </div>

          <div className="severity-item">
            <label>Moderate Cases</label>
            <input
              type="number"
              name="moderatePercentage"
              value={formData.severityDistribution.moderatePercentage}
              onChange={handleSeverityChange}
              min="0"
              max="100"
            />
            <span className="percentage">%</span>
          </div>

          <div className="severity-item">
            <label>Minor Cases</label>
            <input
              type="number"
              name="minorPercentage"
              value={formData.severityDistribution.minorPercentage}
              onChange={handleSeverityChange}
              min="0"
              max="100"
            />
            <span className="percentage">%</span>
          </div>
        </div>

        <div className={`severity-total ${severityTotal === 100 ? 'valid' : 'invalid'}`}>
          Total: {severityTotal}% {severityTotal === 100 ? '✓' : '✗'}
        </div>
      </div>

      <div className="form-section">
        <h3>Additional Notes (Optional)</h3>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Add any additional context or observations..."
          rows="4"
        />
      </div>

      <button type="submit" className="submit-btn" disabled={loading || severityTotal !== 100}>
        {loading ? 'Creating Scenario...' : '🚀 Create Emergency Scenario'}
      </button>
    </form>
  );
};

export default IncidentForm;
