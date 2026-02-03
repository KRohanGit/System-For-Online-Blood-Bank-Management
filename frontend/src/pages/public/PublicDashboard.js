import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './PublicDashboard.css';

export default function PublicDashboard() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/public/login');
      return;
    }

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setUserName(user.fullName || user.name || 'User');
  }, [navigate]);

  const dashboardCards = [
    {
      icon: '💬',
      title: 'Community',
      description: 'Join discussions and see blood requests',
      path: '/community',
      color: '#e74c3c'
    },
    {
      icon: '🏥',
      title: 'Hospitals',
      description: 'Find nearby blood banks',
      path: '/hospitals',
      color: '#3498db'
    },
    {
      icon: '🩸',
      title: 'Blood Camps',
      description: 'View donation camps',
      path: '/blood-camps',
      color: '#e67e22'
    },
    {
      icon: '📅',
      title: 'Organize Camp',
      description: 'Setup a blood donation camp',
      path: '/organize-camp',
      color: '#2ecc71'
    },
    {
      icon: '📋',
      title: 'My Appointments',
      description: 'View your appointments',
      path: '/appointments/my-appointments',
      color: '#9b59b6'
    },
    {
      icon: '📜',
      title: 'My Certificates',
      description: 'View donation certificates',
      path: '/public/certificates',
      color: '#f39c12'
    },
    {
      icon: '🔔',
      title: 'Notifications',
      description: 'View your notifications',
      path: '/notifications',
      color: '#34495e'
    }
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <div className="public-dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="welcome-section">
            <h1>Welcome, {userName}! 👋</h1>
            <p>Your Public User Dashboard</p>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </header>

      <div className="dashboard-container">
        <section className="quick-actions">
          <h2>Quick Actions</h2>
          <div className="actions-grid">
            {dashboardCards.map((card, index) => (
              <div
                key={index}
                className="action-card"
                onClick={() => navigate(card.path)}
                style={{ '--card-color': card.color }}
              >
                <div className="card-icon">{card.icon}</div>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
                <button className="card-action-btn">
                  Go →
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="info-section">
          <div className="info-card">
            <h3>📊 Your Activity</h3>
            <div className="stats-row">
              <div className="stat">
                <span className="stat-label">Appointments</span>
                <span className="stat-value">-</span>
              </div>
              <div className="stat">
                <span className="stat-label">Certificates</span>
                <span className="stat-value">-</span>
              </div>
              <div className="stat">
                <span className="stat-label">Community Posts</span>
                <span className="stat-value">-</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
