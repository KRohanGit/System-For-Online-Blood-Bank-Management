import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './DonationReadinessAdvisor.css';

const DonationReadinessAdvisor = () => {
  const [formData, setFormData] = useState({
    age: '',
    weight: '',
    lastDonationDate: '',
    hemoglobinLevel: '',
    medicationStatus: false,
    illnessHistory: false,
    travelHistory: false
  });
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/public/donation-readiness-history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistory(response.data.data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        '/api/public/donation-readiness-check',
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResult(response.data.data);
      fetchHistory();
    } catch (error) {
      console.error('Error checking readiness:', error);
      alert('Error checking readiness. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      ELIGIBLE: '#2ecc71',
      CONDITIONAL: '#f39c12',
      NOT_ELIGIBLE: '#e74c3c'
    };
    return colors[status] || '#95a5a6';
  };

  const getStatusIcon = (status) => {
    const icons = {
      ELIGIBLE: '✅',
      CONDITIONAL: '⚠️',
      NOT_ELIGIBLE: '❌'
    };
    return icons[status] || '❓';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="donation-readiness-advisor">
      <div className="advisor-header">
        <h2>💉 Donation Readiness Advisor</h2>
        <p>Check if you're ready to donate blood</p>
      </div>

      <div className="advisor-container">
        <div className="assessment-form-section">
          <form onSubmit={handleSubmit} className="readiness-form">
            <div className="form-section">
              <h3>📋 Basic Information</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Age (years) *</label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    required
                    min="1"
                    max="120"
                    placeholder="Enter your age"
                  />
                </div>

                <div className="form-group">
                  <label>Weight (kg) *</label>
                  <input
                    type="number"
                    name="weight"
                    value={formData.weight}
                    onChange={handleChange}
                    required
                    min="1"
                    step="0.1"
                    placeholder="Enter your weight"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Last Donation Date</label>
                  <input
                    type="date"
                    name="lastDonationDate"
                    value={formData.lastDonationDate}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Hemoglobin Level (g/dL)</label>
                  <input
                    type="number"
                    name="hemoglobinLevel"
                    value={formData.hemoglobinLevel}
                    onChange={handleChange}
                    step="0.1"
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>🏥 Health Status</h3>
              
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="medicationStatus"
                    checked={formData.medicationStatus}
                    onChange={handleChange}
                  />
                  <span>Currently taking medication</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="illnessHistory"
                    checked={formData.illnessHistory}
                    onChange={handleChange}
                  />
                  <span>Recent illness or surgery</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="travelHistory"
                    checked={formData.travelHistory}
                    onChange={handleChange}
                  />
                  <span>Recent international travel</span>
                </label>
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Analyzing...' : 'Check Readiness'}
            </button>
          </form>
        </div>

        {result && (
          <div className="results-section">
            <div className="result-card">
              <div className="score-display">
                <div className="score-circle" style={{ borderColor: getStatusColor(result.eligibilityStatus) }}>
                  <span className="score-number">{result.readinessScore}</span>
                  <span className="score-label">/100</span>
                </div>
                <div className="status-badge" style={{ backgroundColor: getStatusColor(result.eligibilityStatus) }}>
                  {getStatusIcon(result.eligibilityStatus)} {result.eligibilityStatus.replace('_', ' ')}
                </div>
              </div>

              <div className="result-details">
                <h3>📅 Next Eligible Date</h3>
                <p className="eligible-date">{formatDate(result.nextEligibleDate)}</p>

                <h3>💡 Recommendations</h3>
                <ul className="recommendations-list">
                  {result.recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </div>

              <div className="health-progress">
                <h4>Readiness Meter</h4>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${result.readinessScore}%`,
                      backgroundColor: getStatusColor(result.eligibilityStatus)
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="history-section">
        <div className="history-header">
          <h3>📊 Your Readiness History</h3>
          <button
            className="toggle-history-btn"
            onClick={() => setShowHistory(!showHistory)}
          >
            {showHistory ? 'Hide' : 'Show'} History
          </button>
        </div>

        {showHistory && history.length > 0 && (
          <div className="history-timeline">
            {history.map((entry, index) => (
              <div key={entry._id} className="history-item">
                <div className="history-date">{formatDate(entry.createdAt)}</div>
                <div className="history-content">
                  <div className="history-score" style={{ color: getStatusColor(entry.eligibilityStatus) }}>
                    {entry.readinessScore}/100
                  </div>
                  <div className="history-status">
                    {getStatusIcon(entry.eligibilityStatus)} {entry.eligibilityStatus.replace('_', ' ')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showHistory && history.length === 0 && (
          <p className="no-history">No previous assessments found</p>
        )}
      </div>
    </div>
  );
};

export default DonationReadinessAdvisor;
