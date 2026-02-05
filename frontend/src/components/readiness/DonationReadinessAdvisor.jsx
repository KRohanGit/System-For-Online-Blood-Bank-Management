import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './DonationReadinessAdvisor.css';

const DonationReadinessAdvisor = () => {
  const [formData, setFormData] = useState({
    // Existing parameters
    age: '',
    weight: '',
    lastDonationDate: '',
    hemoglobinLevel: '',
    medicationStatus: false,
    illnessHistory: false,
    
    // New basic eligibility
    gender: '',
    bloodGroup: '',
    
    // Health & safety checks
    recentFever: false,
    chronicConditions: false,
    anemiaHistory: false,
    bleedingDisorders: false,
    
    // Lifestyle & risk
    recentAlcohol: false,
    recentTattoo: false,
    recentVaccination: false,
    
    // Female-specific
    isPregnant: false,
    isBreastfeeding: false,
    recentChildbirth: false
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
      TEMPORARILY_DEFERRED: '#e67e22',
      NOT_ELIGIBLE: '#e74c3c'
    };
    return colors[status] || '#95a5a6';
  };

  const getStatusIcon = (status) => {
    const icons = {
      ELIGIBLE: '✅',
      CONDITIONAL: '⚠️',
      TEMPORARILY_DEFERRED: '⏸️',
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
            {/* Section 1: Basic Information */}
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
                    min="18"
                    max="65"
                    placeholder="18-65"
                  />
                  <small className="helper-text">Eligible age: 18-65 years</small>
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
                    placeholder="Minimum 50 kg"
                  />
                  <small className="helper-text">Minimum weight: 50 kg</small>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Gender *</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Blood Group (Optional)</label>
                  <select
                    name="bloodGroup"
                    value={formData.bloodGroup}
                    onChange={handleChange}
                  >
                    <option value="">Select blood group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                  <small className="helper-text">Recommended for better matching</small>
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
                    max={new Date().toISOString().split('T')[0]}
                  />
                  <small className="helper-text">Leave blank if first time donor</small>
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
                  <small className="helper-text">Normal: Male 13+, Female 12+</small>
                </div>
              </div>
            </div>

            {/* Section 2: Health Status */}
            <div className="form-section">
              <h3>🏥 Health Status</h3>
              
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="recentFever"
                    checked={formData.recentFever}
                    onChange={handleChange}
                  />
                  <span>Fever or infection in the last 14 days</span>
                </label>

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
                  <span>Recent illness or surgery (within 6 months)</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="chronicConditions"
                    checked={formData.chronicConditions}
                    onChange={handleChange}
                  />
                  <span>Chronic conditions (Diabetes, BP, Heart problems)</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="anemiaHistory"
                    checked={formData.anemiaHistory}
                    onChange={handleChange}
                  />
                  <span>History of anemia or low hemoglobin</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="bleedingDisorders"
                    checked={formData.bleedingDisorders}
                    onChange={handleChange}
                  />
                  <span>Bleeding or clotting disorders</span>
                </label>
              </div>
            </div>

            {/* Section 3: Safety & Risk Checks */}
            <div className="form-section">
              <h3>🔒 Safety & Risk Checks</h3>
              
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="recentAlcohol"
                    checked={formData.recentAlcohol}
                    onChange={handleChange}
                  />
                  <span>Consumed alcohol in the last 24 hours</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="recentTattoo"
                    checked={formData.recentTattoo}
                    onChange={handleChange}
                  />
                  <span>Got a tattoo or piercing in the last 6 months</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="recentVaccination"
                    checked={formData.recentVaccination}
                    onChange={handleChange}
                  />
                  <span>Received vaccination in the last 30 days</span>
                </label>
              </div>
            </div>

            {/* Section 4: Female-Specific (Conditional) */}
            {formData.gender === 'Female' && (
              <div className="form-section female-specific">
                <h3>👩‍⚕️ Additional Information (Female)</h3>
                
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="isPregnant"
                      checked={formData.isPregnant}
                      onChange={handleChange}
                    />
                    <span>Currently pregnant</span>
                  </label>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="isBreastfeeding"
                      checked={formData.isBreastfeeding}
                      onChange={handleChange}
                    />
                    <span>Currently breastfeeding</span>
                  </label>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="recentChildbirth"
                      checked={formData.recentChildbirth}
                      onChange={handleChange}
                    />
                    <span>Gave birth within the last 6 months</span>
                  </label>
                </div>
              </div>
            )}

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Analyzing...' : '🔍 Check My Eligibility'}
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
                  {getStatusIcon(result.eligibilityStatus)} {result.eligibilityStatus.replace(/_/g, ' ')}
                </div>
              </div>

              {result.deferralReasons && result.deferralReasons.length > 0 && (
                <div className="deferral-reasons">
                  <h3>⚠️ Deferral Reasons</h3>
                  <ul className="deferral-list">
                    {result.deferralReasons.map((reason, index) => (
                      <li key={index} className="deferral-item">{reason}</li>
                    ))}
                  </ul>
                </div>
              )}

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
