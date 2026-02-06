import React from 'react';
import './AuditLogTable.css';

const AuditLogTable = ({ logs, pagination, onPageChange, onLogClick }) => {
  const getActionBadgeClass = (action) => {
    const classes = {
      accepted: 'badge-success',
      overridden: 'badge-danger',
      rejected: 'badge-danger',
      deferred: 'badge-warning',
      approved: 'badge-success'
    };
    return classes[action] || 'badge-default';
  };

  return (
    <div className="audit-log-table-container">
      <table className="audit-log-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Action Type</th>
            <th>Case Type</th>
            <th>Justification</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log._id}>
              <td className="timestamp-cell">
                {new Date(log.timestamp).toLocaleString()}
              </td>
              <td>
                <span className={`action-badge ${getActionBadgeClass(log.actionType)}`}>
                  {log.actionType}
                </span>
              </td>
              <td className="case-type-cell">{log.caseType}</td>
              <td className="justification-cell">
                {log.justification ? (
                  <span title={log.justification}>
                    {log.justification.substring(0, 50)}
                    {log.justification.length > 50 ? '...' : ''}
                  </span>
                ) : (
                  <span className="no-justification">-</span>
                )}
              </td>
              <td>
                <button
                  className="btn-view-details"
                  onClick={() => onLogClick(log._id)}
                >
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {logs.length === 0 && (
        <div className="no-logs">
          <p>No audit logs found</p>
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="pagination">
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="pagination-btn"
          >
            Previous
          </button>
          <span className="pagination-info">
            Page {pagination.page} of {pagination.pages} ({pagination.total} total records)
          </span>
          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.pages}
            className="pagination-btn"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default AuditLogTable;
