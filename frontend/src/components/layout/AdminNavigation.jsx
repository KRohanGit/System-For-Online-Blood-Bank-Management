import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './AdminNavigation.css';

const AdminNavigation = () => {
  const location = useLocation();

  const navItems = [
    { path: '/admin/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/admin/blood-inventory', icon: '🩸', label: 'Blood Inventory' },
    { path: '/admin/approvals', icon: '✅', label: 'Approvals' },
    { path: '/admin/donors', icon: '👥', label: 'Donors' },
    { path: '/admin/emergency', icon: '🚨', label: 'Emergency' },
    { path: '/admin/logs', icon: '📋', label: 'Audit Logs' },
    { path: '/admin/settings', icon: '⚙️', label: 'Settings' }
  ];

  return (
    <nav className="admin-nav">
      {navItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
};

export default AdminNavigation;
