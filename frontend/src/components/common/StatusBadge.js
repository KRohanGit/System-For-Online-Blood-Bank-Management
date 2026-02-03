import React from 'react';
import './StatusBadge.css';

export default function StatusBadge({ status, approvalStatus }) {
  const getStatusConfig = () => {
    if (approvalStatus === 'Pending') {
      return { color: '#f39c12', text: 'Pending Approval' };
    }
    if (approvalStatus === 'Rejected') {
      return { color: '#e74c3c', text: 'Rejected' };
    }

    const configs = {
      'Pre-Camp': { color: '#3498db', text: 'Upcoming' },
      'Ongoing': { color: '#2ecc71', text: 'Ongoing' },
      'Completed': { color: '#95a5a6', text: 'Completed' },
      'Cancelled': { color: '#e74c3c', text: 'Cancelled' }
    };

    return configs[status] || { color: '#3498db', text: status };
  };

  const config = getStatusConfig();

  return (
    <span className="status-badge" style={{ background: config.color }}>
      {config.text}
    </span>
  );
}
