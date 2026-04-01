import React, { useState, useEffect } from 'react';
import auditTrailAPI from '../../services/auditTrailAPI';
import ActionDistributionChart from '../../components/doctor/audit/ActionDistributionChart';
import OverrideFrequencyChart from '../../components/doctor/audit/OverrideFrequencyChart';
import BloodUsageChart from '../../components/doctor/audit/BloodUsageChart';
import EmergencyPatternsChart from '../../components/doctor/audit/EmergencyPatternsChart';
import AuditLogTable from '../../components/doctor/audit/AuditLogTable';
import AuditFilters from '../../components/doctor/audit/AuditFilters';
import './AuditTrailPage.css';

const AuditTrailPage = () => {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });
  const [actionDistribution, setActionDistribution] = useState([]);
  const [overrideFrequency, setOverrideFrequency] = useState([]);
  const [bloodUsage, setBloodUsage] = useState([]);
  const [emergencyPatterns, setEmergencyPatterns] = useState([]);
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAuditData();
  }, [filters, pagination.page]);

  const loadAuditData = async () => {
    setLoading(true);
    try {
      setError('');
      const [logsRes, distRes, overrideRes, usageRes, patternsRes] = await Promise.all([
        auditTrailAPI.getAuditLogs({ ...filters, page: pagination.page, limit: pagination.limit }),
        auditTrailAPI.getActionDistribution(filters),
        auditTrailAPI.getOverrideFrequency(30),
        auditTrailAPI.getBloodUsageAnalytics(filters),
        auditTrailAPI.getEmergencyPatterns(30)
      ]);

      if (logsRes.success) {
        setLogs(logsRes.data.logs);
        setPagination(logsRes.data.pagination);
      }

      if (distRes.success) setActionDistribution(distRes.data);
      if (overrideRes.success) setOverrideFrequency(overrideRes.data);
      if (usageRes.success) setBloodUsage(usageRes.data);
      if (patternsRes.success) setEmergencyPatterns(patternsRes.data);
    } catch (error) {
      console.error('Error loading audit data:', error);
      setLogs([]);
      setPagination({ page: 1, limit: 50, total: 0, pages: 0 });
      setActionDistribution([]);
      setOverrideFrequency([]);
      setBloodUsage([]);
      setEmergencyPatterns([]);
      setError('Unable to load audit trail right now.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleLogClick = async (logId) => {
    try {
      const response = await auditTrailAPI.getLogDetails(logId);
      if (response.success) {
        setSelectedLog(response.data);
      }
    } catch (error) {
      console.error('Error loading log details:', error);
    }
  };

  if (loading && logs.length === 0) {
    return <div className="loading">Loading audit trail...</div>;
  }

  return (
    <div className="audit-trail-page">
      <div className="audit-header">
        <h1>🔍 Audit Trail</h1>
        <p className="audit-subtitle">Immutable medical accountability records</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <AuditFilters onFilterChange={handleFilterChange} currentFilters={filters} />

      <div className="audit-grid">
        <div className="charts-section">
          <div className="chart-row">
            <div className="chart-card">
              <h3>Action Distribution</h3>
              <ActionDistributionChart data={actionDistribution} />
            </div>

            <div className="chart-card">
              <h3>Override Frequency (30 Days)</h3>
              <OverrideFrequencyChart data={overrideFrequency} />
            </div>
          </div>

          <div className="chart-row">
            <div className="chart-card">
              <h3>Blood Usage vs Wastage</h3>
              <BloodUsageChart data={bloodUsage} />
            </div>

            <div className="chart-card">
              <h3>Emergency Tag Patterns</h3>
              <EmergencyPatternsChart data={emergencyPatterns} />
            </div>
          </div>
        </div>

        <div className="logs-section">
          <h2>Audit Logs</h2>
          <AuditLogTable
            logs={logs}
            pagination={pagination}
            onPageChange={handlePageChange}
            onLogClick={handleLogClick}
          />
        </div>
      </div>

      {selectedLog && (
        <div className="log-modal" onClick={() => setSelectedLog(null)}>
          <div className="log-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedLog(null)}>×</button>
            <h3>Audit Log Details</h3>
            <div className="log-details">
              <div className="detail-row">
                <span className="label">Action Type:</span>
                <span className="value">{selectedLog.actionType}</span>
              </div>
              <div className="detail-row">
                <span className="label">Case Type:</span>
                <span className="value">{selectedLog.caseType}</span>
              </div>
              <div className="detail-row">
                <span className="label">Timestamp:</span>
                <span className="value">{new Date(selectedLog.timestamp).toLocaleString()}</span>
              </div>
              <div className="detail-row">
                <span className="label">Justification:</span>
                <span className="value">{selectedLog.justification || 'N/A'}</span>
              </div>
              {selectedLog.metadata && (
                <div className="detail-row">
                  <span className="label">Metadata:</span>
                  <pre className="value">{JSON.stringify(selectedLog.metadata, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditTrailPage;
