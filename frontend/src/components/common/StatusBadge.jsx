import React from 'react';
import '../../styles/admin.css';

function StatusBadge({ status, type = 'default' }) {
  const getStatusClass = () => {
    const statusLower = status?.toLowerCase();
    
    switch(statusLower) {
      case 'pending':
        return 'status-pending';
      case 'approved':
      case 'active':
      case 'available':
        return 'status-approved';
      case 'rejected':
      case 'inactive':
      case 'unavailable':
        return 'status-rejected';
      case 'critical':
      case 'low':
        return 'status-critical';
      case 'high':
        return 'status-high';
      default:
        return 'status-default';
    }
  };

  return (
    <span className={`status-badge ${getStatusClass()}`}>
      {status}
    </span>
  );
}

export default StatusBadge;
