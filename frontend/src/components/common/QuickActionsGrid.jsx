import React from 'react';
import QuickActionCard from './QuickActionCard';
import './QuickActionsGrid.css';

const QuickActionsGrid = () => {
  const actions = [
    {
      icon: '🩸',
      title: 'Blood Inventory',
      description: 'Manage blood units, stock, and expiry',
      path: '/admin/blood-inventory',
      color: '#ef4444'
    },
    {
      icon: '✅',
      title: 'Doctor Approvals',
      description: 'Approve pending doctor registrations',
      path: '/admin/approvals',
      color: '#10b981'
    },
    {
      icon: '👥',
      title: 'Donor Management',
      description: 'View and manage blood donors',
      path: '/admin/donors',
      color: '#3b82f6'
    },
    {
      icon: '🚨',
      title: 'Emergency Requests',
      description: 'Handle emergency blood requests',
      path: '/admin/emergency',
      color: '#f59e0b'
    }
  ];

  return (
    <div className="quick-actions-grid">
      <h2>Quick Actions</h2>
      <div className="actions-grid">
        {actions.map((action, index) => (
          <QuickActionCard key={index} {...action} />
        ))}
      </div>
    </div>
  );
};

export default QuickActionsGrid;
