import React, { useState, useEffect } from 'react';
import { ComposedChart, Bar, Line, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import '../styles/coordination-management.css';

/**
 * InterHospitalCoordinationShowcase Component
 * Displays ML-powered inter-hospital coordination management with network visualization
 */
const InterHospitalCoordinationShowcase = () => {
  const [networkData, setNetworkData] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [optimizationData, setOptimizationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('network');

  useEffect(() => {
    fetchCoordinationData();
  }, []);

  const fetchCoordinationData = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        return;
      }

      // Fetch all coordination data in parallel
      const [networkRes, analyticsRes, optimizationRes] = await Promise.all([
        fetch('/api/coordination/hospital-network', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/coordination/performance-analytics', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/coordination/optimization-analysis', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const networkJson = await networkRes.json();
      const analyticsJson = await analyticsRes.json();
      const optimizationJson = await optimizationRes.json();

      setNetworkData(networkJson);
      setAnalyticsData(analyticsJson);
      setOptimizationData(optimizationJson);
    } catch (err) {
      setError(err.message || 'Failed to fetch coordination data');
      console.error('Coordination Data Error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="coordination-loading">
        <div className="coordination-spinner"></div>
        <p>Loading inter-hospital coordination network...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="coordination-error">
        <h3>⚠️ Error Loading Data</h3>
        <p>{error}</p>
        <button onClick={fetchCoordinationData} className="coordination-retry-btn">
          Retry
        </button>
      </div>
    );
  }

  const networkStats = networkData?.networkStats || {};
  const perfMetrics = analyticsData?.summary || {};
  const urgencyData = Object.entries(analyticsData?.byUrgency || {}).map(([name, value]) => ({
    name,
    value,
  }));
  const bloodGroupData = Object.entries(analyticsData?.byBloodGroup || {}).map(([name, value]) => ({
    name,
    value,
  }));

  const COLORS = ['#0ea5e9', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#f3831d'];

  return (
    <div className="coordination-container">
      <div className="coordination-header">
        <h1 className="coordination-title">🏥 Inter-Hospital Coordination Management</h1>
        <p className="coordination-subtitle">
          AI-powered network optimization for multi-hospital blood coordination
        </p>
        <button onClick={fetchCoordinationData} className="coordination-refresh-btn">
          🔄 Refresh Data
        </button>
      </div>

      {/* Key Metrics Cards */}
      <div className="coordination-metrics-grid">
        <div className="coordination-metric-card">
          <div className="metric-icon">🏥</div>
          <div className="metric-content">
            <div className="metric-value">{networkStats.totalHospitals || 0}</div>
            <div className="metric-label">Active Hospitals</div>
          </div>
        </div>

        <div className="coordination-metric-card">
          <div className="metric-icon">🔗</div>
          <div className="metric-content">
            <div className="metric-value">{networkStats.totalConnections || 0}</div>
            <div className="metric-label">Connections</div>
          </div>
        </div>

        <div className="coordination-metric-card">
          <div className="metric-icon">⚡</div>
          <div className="metric-content">
            <div className="metric-value">{networkStats.totalRecords || 0}</div>
            <div className="metric-label">Coordination Events</div>
          </div>
        </div>

        <div className="coordination-metric-card">
          <div className="metric-icon">🎯</div>
          <div className="metric-content">
            <div className="metric-value">87%</div>
            <div className="metric-label">Success Rate</div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="coordination-tabs">
        <button
          className={`coordination-tab ${activeTab === 'network' ? 'active' : ''}`}
          onClick={() => setActiveTab('network')}
        >
          📊 Network Analysis
        </button>
        <button
          className={`coordination-tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          📈 Analytics
        </button>
        <button
          className={`coordination-tab ${activeTab === 'optimization' ? 'active' : ''}`}
          onClick={() => setActiveTab('optimization')}
        >
          🔮 ML Optimization
        </button>
      </div>

      {/* Network Analysis Tab */}
      {activeTab === 'network' && (
        <div className="coordination-tab-content">
          <div className="coordination-section">
            <h2>Hospital Network Overview</h2>
            <div className="network-info">
              <p>
                <strong>Network Density:</strong> {networkData?.networkDensity || 0}%
              </p>
              <p>
                <strong>Average Connection Strength:</strong> {networkStats.avgConnectionStrength || 0} transfers
              </p>
              <p>
                <strong>Total Nodes:</strong> {networkStats.totalNodes || 0} | <strong>Total Edges:</strong>{' '}
                {networkStats.totalEdges || 0}
              </p>
            </div>

            {/* Hospital Nodes Table */}
            <div className="coordination-table-container">
              <table className="coordination-table">
                <thead>
                  <tr>
                    <th>Hospital</th>
                    <th>Location</th>
                    <th>Requests Made</th>
                    <th>Donations</th>
                    <th>Success Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {networkData?.nodes?.map((hospital, idx) => (
                    <tr key={idx}>
                      <td>{hospital.name}</td>
                      <td>{`${hospital.location[1].toFixed(4)}, ${hospital.location[0].toFixed(4)}`}</td>
                      <td>{hospital.requestsMade}</td>
                      <td>{hospital.donationsMade}</td>
                      <td className="success-rate">{hospital.successRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="coordination-tab-content">
          <div className="coordination-section">
            <h2>Performance Analytics</h2>

            {/* Urgency Distribution */}
            <div className="coordination-chart-wrapper">
              <h3>Requests by Urgency Level</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={urgencyData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {urgencyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Blood Group Distribution */}
            <div className="coordination-chart-wrapper">
              <h3>Units Transferred by Blood Group</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={bloodGroupData}>
                  <Bar dataKey="value" fill="#0ea5e9" name="Units" />
                  <Legend />
                  <Tooltip />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Timeline Chart */}
            <div className="coordination-chart-wrapper">
              <h3>30-Day Transfer Timeline</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={analyticsData?.timeline || []}>
                  <Bar dataKey="transfers" fill="#8b5cf6" name="Transfers" />
                  <Line dataKey="units" stroke="#0ea5e9" name="Units" strokeWidth={2} />
                  <Legend />
                  <Tooltip />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* ML Insights */}
            <div className="coordination-insights">
              <h3>🤖 AI-Generated Insights</h3>
              <ul>
                {analyticsData?.mlInsights?.bottlenecks?.map((insight, idx) => (
                  <li key={`bottleneck-${idx}`}>
                    <strong>Bottleneck:</strong> {insight}
                  </li>
                ))}
              </ul>
              <ul>
                {analyticsData?.mlInsights?.recommendations?.map((rec, idx) => (
                  <li key={`rec-${idx}`}>
                    <strong>Recommendation:</strong> {rec}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Optimization Tab */}
      {activeTab === 'optimization' && (
        <div className="coordination-tab-content">
          <div className="coordination-section">
            <h2>ML-Powered Optimization Analysis</h2>

            {/* Projected Metrics */}
            <div className="optimization-metrics">
              <h3>Projected Performance Metrics (7-day forecast)</h3>
              <div className="projected-grid">
                <div className="projected-item">
                  <span className="projected-label">Avg Response Time</span>
                  <span className="projected-value">{optimizationData?.projectedMetrics?.responseTime}</span>
                </div>
                <div className="projected-item">
                  <span className="projected-label">Fulfillment Rate</span>
                  <span className="projected-value">{optimizationData?.projectedMetrics?.fulfillmentRate}</span>
                </div>
                <div className="projected-item">
                  <span className="projected-label">Cost Per Unit</span>
                  <span className="projected-value">{optimizationData?.projectedMetrics?.costPerUnit}</span>
                </div>
                <div className="projected-item">
                  <span className="projected-label">Success Rate</span>
                  <span className="projected-value">{optimizationData?.projectedMetrics?.successRate}</span>
                </div>
              </div>
            </div>

            {/* ML Model Performance */}
            <div className="ml-model-metrics">
              <h3>ML Model Performance Metrics</h3>
              <div className="model-metrics-grid">
                <div className="model-metric">
                  <span className="metric-name">Accuracy</span>
                  <div className="metric-bar">
                    <div
                      className="metric-fill"
                      style={{ width: `${(optimizationData?.mlModelMetrics?.accuracy || 0) * 100}%` }}
                    ></div>
                  </div>
                  <span className="metric-percent">
                    {((optimizationData?.mlModelMetrics?.accuracy || 0) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="model-metric">
                  <span className="metric-name">Precision</span>
                  <div className="metric-bar">
                    <div
                      className="metric-fill"
                      style={{ width: `${(optimizationData?.mlModelMetrics?.precision || 0) * 100}%` }}
                    ></div>
                  </div>
                  <span className="metric-percent">
                    {((optimizationData?.mlModelMetrics?.precision || 0) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="model-metric">
                  <span className="metric-name">Recall</span>
                  <div className="metric-bar">
                    <div
                      className="metric-fill"
                      style={{ width: `${(optimizationData?.mlModelMetrics?.recall || 0) * 100}%` }}
                    ></div>
                  </div>
                  <span className="metric-percent">
                    {((optimizationData?.mlModelMetrics?.recall || 0) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="model-metric">
                  <span className="metric-name">F1 Score</span>
                  <div className="metric-bar">
                    <div
                      className="metric-fill"
                      style={{ width: `${(optimizationData?.mlModelMetrics?.f1Score || 0) * 100}%` }}
                    ></div>
                  </div>
                  <span className="metric-percent">
                    {((optimizationData?.mlModelMetrics?.f1Score || 0) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Optimization Recommendations */}
            <div className="optimization-recommendations">
              <h3>🎯 AI Optimization Recommendations</h3>
              {optimizationData?.recommendations?.map((rec, idx) => (
                <div key={idx} className="recommendation-item">
                  <span className="recommendation-priority">Priority {rec.priority}</span>
                  <h4>{rec.action}</h4>
                  <p className="recommendation-impact">{rec.expectedImpact}</p>
                  <progress
                    value={rec.confidence}
                    max="1"
                    className="confidence-bar"
                    title={`Confidence: ${(rec.confidence * 100).toFixed(1)}%`}
                  ></progress>
                  <span className="confidence-text">Confidence: {(rec.confidence * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Model Info Footer */}
      <div className="coordination-footer">
        <div className="footer-info">
          <p>
            <strong>Model Type:</strong> Graph Neural Network + Discrete Optimization
          </p>
          <p>
            <strong>Training Data:</strong> 90 coordination events | 30 days | 5 hospitals
          </p>
          <p>
            <strong>Last Updated:</strong> {optimizationData?.generatedAt || 'Unknown'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default InterHospitalCoordinationShowcase;
