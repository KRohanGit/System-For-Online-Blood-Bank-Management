import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import config from '../../config/config';
import DashboardLayout from '../../components/layout/DashboardLayout';
import '../../styles/admin.css';

function AuditLogs() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [dateRange, setDateRange] = useState('today');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_URL = config?.API_URL || process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchLogs();
  }, [filter, dateRange]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = {};
      if (filter !== 'all') params.action = filter;
      if (dateRange === 'today') {
        params.startDate = new Date().toISOString().split('T')[0];
      } else if (dateRange === 'week') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        params.startDate = d.toISOString().split('T')[0];
      } else if (dateRange === 'month') {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        params.startDate = d.toISOString().split('T')[0];
      }

      const response = await axios.get(`${API_URL}/audit-trail/logs`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = response.data;
      const fetchedLogs = data.data?.logs || data.logs || data.data || [];
      setLogs(fetchedLogs.map((log, idx) => ({
        id: log._id || idx + 1,
        action: log.action || log.eventType || 'System Event',
        performedBy: log.performedBy?.name || log.performedBy?.email || log.userId || 'System',
        details: log.details || log.description || log.message || '',
        timestamp: log.timestamp || log.createdAt || '',
        type: log.category || log.type || mapActionToType(log.action),
        ipAddress: log.ipAddress || log.metadata?.ipAddress || 'N/A'
      })));
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      // Show empty state rather than crash
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const mapActionToType = (action) => {
    if (!action) return 'settings';
    const a = action.toLowerCase();
    if (a.includes('approv')) return 'approval';
    if (a.includes('reject')) return 'rejection';
    if (a.includes('emergency')) return 'emergency';
    if (a.includes('blood') || a.includes('inventory') || a.includes('stock')) return 'inventory';
    if (a.includes('register') || a.includes('donor')) return 'registration';
    return 'settings';
  };

  const filteredLogs = logs.filter(log => 
    filter === 'all' ? true : log.type === filter
  );

  const handleExport = () => {
    // Convert logs to CSV format
    const headers = ['ID', 'Action', 'Performed By', 'Details', 'Timestamp', 'Type', 'IP Address'];
    const csvContent = [
      headers.join(','),
      ...filteredLogs.map(log => [
        log.id,
        `"${log.action}"`,
        `"${log.performedBy}"`,
        `"${log.details}"`,
        log.timestamp,
        log.type,
        log.ipAddress
      ].join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert('✅ Audit logs exported successfully!');
  };

  const getActionIcon = (type) => {
    const icons = {
      approval: '✅',
      rejection: '❌',
      emergency: '🚨',
      inventory: '🩸',
      registration: '👤',
      'status-change': '🔄',
      settings: '⚙️',
      report: '📊'
    };
    return icons[type] || '📝';
  };

  return (
    <DashboardLayout>
      <div className="audit-logs">
        <div className="page-header">
          <button className="back-button" onClick={() => navigate('/admin/dashboard')}>
            ← Back
          </button>
          <div className="page-title-section">
            <h1>Audit Logs</h1>
            <p>Complete transparency of all system activities</p>
          </div>
          <button 
            className="btn-primary"
            onClick={handleExport}
          >
            📥 Export Logs
          </button>
        </div>

        {/* Info Banner */}
        <div className="info-banner">
          <span className="info-icon">🔒</span>
          <div className="info-content">
            <strong>Accountability & Transparency:</strong>
            <p>All actions performed in the system are logged and tracked for security, compliance, and auditing purposes. Logs are stored securely and cannot be modified.</p>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-bar">
          <div className="filter-group">
            <label>Filter by Type:</label>
            <select 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="form-select-sm"
            >
              <option value="all">All Activities</option>
              <option value="approval">Approvals</option>
              <option value="rejection">Rejections</option>
              <option value="emergency">Emergency</option>
              <option value="inventory">Inventory</option>
              <option value="registration">Registrations</option>
              <option value="status-change">Status Changes</option>
              <option value="settings">Settings</option>
              <option value="report">Reports</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Date Range:</label>
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="form-select-sm"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          <input type="search" placeholder="Search logs..." className="search-input" />
        </div>

        {/* Logs Table */}
        <div className="dashboard-card">
          <div className="card-body no-padding">
            <div className="logs-table">
              {filteredLogs.map(log => (
                <div key={log.id} className={`log-entry log-${log.type}`}>
                  <div className="log-icon">
                    {getActionIcon(log.type)}
                  </div>
                  <div className="log-content">
                    <div className="log-header">
                      <h4 className="log-action">{log.action}</h4>
                      <span className="log-timestamp">{log.timestamp}</span>
                    </div>
                    <p className="log-details">{log.details}</p>
                    <div className="log-meta">
                      <span className="log-user">
                        <strong>Performed by:</strong> {log.performedBy}
                      </span>
                      <span className="log-ip">
                        <strong>IP:</strong> {log.ipAddress}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="logs-summary">
          <h3>Activity Summary</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">Total Actions (Today):</span>
              <span className="summary-value">{logs.length}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Emergency Events:</span>
              <span className="summary-value">{logs.filter(l => l.type === 'emergency').length}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Approvals:</span>
              <span className="summary-value">{logs.filter(l => l.type === 'approval').length}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Inventory Updates:</span>
              <span className="summary-value">{logs.filter(l => l.type === 'inventory').length}</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default AuditLogs;
