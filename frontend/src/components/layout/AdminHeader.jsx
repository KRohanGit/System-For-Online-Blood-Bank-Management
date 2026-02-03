import React from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminHeader.css';

const AdminHeader = ({ title, user }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/signin');
  };

  return (
    <header className="admin-header">
      <div className="header-left">
        <h1>{title || 'Admin Dashboard'}</h1>
      </div>
      <div className="header-right">
        <div className="user-info">
          <span className="user-name">{user?.name || 'Admin User'}</span>
          <span className="user-role">{user?.role || 'Hospital Admin'}</span>
        </div>
        <button className="btn-logout" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </header>
  );
};

export default AdminHeader;
