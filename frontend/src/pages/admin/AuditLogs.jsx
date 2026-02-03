import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import '../../styles/admin.css';

function AuditLogs() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [dateRange, setDateRange] = useState('today');

  const logs = [
    {
      id: 1,
      action: 'Doctor Approved',
      performedBy: 'Admin User',
      details: 'Approved Dr. Sarah Johnson registration',
      timestamp: '2026-01-02 14:30:15',
      type: 'approval',
      ipAddress: '192.168.1.100'
    },
    {
      id: 2,
      action: 'Emergency Triggered',
      performedBy: 'System Auto',
      details: 'Critical blood request for O- (3 units)',
      timestamp: '2026-01-02 13:45:22',
      type: 'emergency',
      ipAddress: 'System'
    },
    {
      id: 3,
      action: 'Blood Issued',
      performedBy: 'Nurse Station',
      details: 'Issued 5 units of A+ blood to Surgery Dept',
      timestamp: '2026-01-02 12:15:40',
      type: 'inventory',
      ipAddress: '192.168.1.105'
    },
    {
      id: 4,
      action: 'Donor Registered',
      performedBy: 'Front Desk',
      details: 'New donor registration: John Doe (AB+)',
      timestamp: '2026-01-02 11:20:18',
      type: 'registration',
      ipAddress: '192.168.1.102'
    },
    {
      id: 5,
      action: 'Stock Updated',
      performedBy: 'Admin User',
      details: 'Added 10 units of B+ to inventory',
      timestamp: '2026-01-02 10:05:33',
      type: 'inventory',
      ipAddress: '192.168.1.100'
    },
    {
      id: 6,
      action: 'Doctor Rejected',
      performedBy: 'Admin User',
      details: 'Rejected Dr. James Wilson - Invalid license',
      timestamp: '2026-01-02 09:30:12',
      type: 'rejection',
      ipAddress: '192.168.1.100'
    },
    {
      id: 7,
      action: 'Inter-Hospital Request',
      performedBy: 'Emergency Dept',
      details: 'Requested O- blood from St. Mary Medical Center',
      timestamp: '2026-01-02 08:45:55',
      type: 'emergency',
      ipAddress: '192.168.1.110'
    },
    {
      id: 8,
      action: 'Donor Deactivated',
      performedBy: 'Admin User',
      details: 'Deactivated donor: Michael Chen (medical reasons)',
      timestamp: '2026-01-01 16:20:30',
      type: 'status-change',
      ipAddress: '192.168.1.100'
    },
    {
      id: 9,
      action: 'Settings Updated',
      performedBy: 'Admin User',
      details: 'Changed notification preferences',
      timestamp: '2026-01-01 15:10:22',
      type: 'settings',
      ipAddress: '192.168.1.100'
    },
    {
      id: 10,
      action: 'Report Generated',
      performedBy: 'Admin User',
      details: 'Generated monthly blood inventory report',
      timestamp: '2026-01-01 14:00:00',
      type: 'report',
      ipAddress: '192.168.1.100'
    }
  ];

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
