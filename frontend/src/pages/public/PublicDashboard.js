import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CivicAlertFeed from '../../components/civic/CivicAlertFeed';
import DonationReadinessAdvisor from '../../components/readiness/DonationReadinessAdvisor';
import EmergencyMobilization from '../../components/emergency/EmergencyMobilization';
import './PublicDashboard.css';

export default function PublicDashboard() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/public/login');
      return;
    }

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setUserName(user.fullName || user.name || 'User');
  }, [navigate]);

  const quickAccessCards = [
    {
      icon: '🚨',
      title: 'Civic Alerts',
      description: 'View urgent blood needs nearby',
      action: () => setActiveSection('alerts'),
      color: '#e74c3c',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
      icon: '💉',
      title: 'Readiness Check',
      description: 'Check if you can donate',
      action: () => setActiveSection('readiness'),
      color: '#9b59b6',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    },
    {
      icon: '🆘',
      title: 'Emergency Response',
      description: 'Help during emergencies',
      action: () => setActiveSection('emergency'),
      color: '#e67e22',
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
    },
    {
      icon: '💬',
      title: 'Community',
      description: 'Join discussions',
      action: () => navigate('/community'),
      color: '#3498db',
      gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'
    },
    {
      icon: '🏥',
      title: 'Hospitals',
      description: 'Find blood banks',
      action: () => navigate('/hospitals'),
      color: '#2ecc71',
      gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)'
    },
    {
      icon: '🩸',
      title: 'Blood Camps',
      description: 'Donation events',
      action: () => navigate('/blood-camps'),
      color: '#e74c3c',
      gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)'
    },
    {
      icon: '📅',
      title: 'Organize Camp',
      description: 'Create donation event',
      action: () => navigate('/organize-camp'),
      color: '#f39c12',
      gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)'
    },
    {
      icon: '📋',
      title: 'Appointments',
      description: 'Your bookings',
      action: () => navigate('/appointments/my-appointments'),
      color: '#16a085',
      gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'
    },
    {
      icon: '📜',
      title: 'Certificates',
      description: 'Donation records',
      action: () => navigate('/public/certificates'),
      color: '#d35400',
      gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)'
    }
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <div className="public-dashboard">
      <div className="dashboard-sidebar">
        <div className="sidebar-header">
          <h2>🩸 Blood Bank</h2>
          <p className="user-welcome">Hello, {userName}</p>
        </div>
        
        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeSection === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveSection('overview')}
          >
            <span className="nav-icon">🏠</span>
            <span>Overview</span>
          </button>
          <button
            className={`nav-item ${activeSection === 'alerts' ? 'active' : ''}`}
            onClick={() => setActiveSection('alerts')}
          >
            <span className="nav-icon">🚨</span>
            <span>Civic Alerts</span>
          </button>
          <button
            className={`nav-item ${activeSection === 'readiness' ? 'active' : ''}`}
            onClick={() => setActiveSection('readiness')}
          >
            <span className="nav-icon">💉</span>
            <span>Readiness Check</span>
          </button>
          <button
            className={`nav-item ${activeSection === 'emergency' ? 'active' : ''}`}
            onClick={() => setActiveSection('emergency')}
          >
            <span className="nav-icon">🆘</span>
            <span>Emergency Response</span>
          </button>
        </nav>

        <button onClick={handleLogout} className="sidebar-logout">
          <span>🚪</span> Logout
        </button>
      </div>

      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <h1 className="section-title">
            {activeSection === 'overview' && 'Dashboard Overview'}
            {activeSection === 'alerts' && 'Civic Blood Alerts'}
            {activeSection === 'readiness' && 'Donation Readiness'}
            {activeSection === 'emergency' && 'Emergency Mobilization'}
          </h1>
          <div className="topbar-actions">
            <button className="notification-btn" onClick={() => navigate('/notifications')}>
              🔔
              <span className="notification-badge">3</span>
            </button>
          </div>
        </header>

        <div className="dashboard-content">
          {activeSection === 'overview' && (
            <>
              <div className="welcome-banner">
                <div className="banner-content">
                  <h2>Welcome back, {userName}! 👋</h2>
                  <p>Ready to make a difference? Explore your options below.</p>
                </div>
                <div className="banner-illustration">🩸</div>
              </div>

              <div className="stats-overview">
                <div className="stat-card">
                  <div className="stat-icon">💉</div>
                  <div className="stat-content">
                    <h3>3</h3>
                    <p>Total Donations</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">🏆</div>
                  <div className="stat-content">
                    <h3>1,500ml</h3>
                    <p>Blood Donated</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">❤️</div>
                  <div className="stat-content">
                    <h3>9</h3>
                    <p>Lives Saved</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">⭐</div>
                  <div className="stat-content">
                    <h3>Hero</h3>
                    <p>Donor Status</p>
                  </div>
                </div>
              </div>

              <section className="quick-access-section">
                <h2 className="section-heading">Quick Access</h2>
                <div className="quick-access-grid">
                  {quickAccessCards.map((card, index) => (
                    <div
                      key={index}
                      className="quick-access-card"
                      onClick={card.action}
                      style={{ background: card.gradient }}
                    >
                      <div className="card-icon">{card.icon}</div>
                      <h3>{card.title}</h3>
                      <p>{card.description}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="recent-activity">
                <h2 className="section-heading">Recent Activity</h2>
                <div className="activity-feed">
                  <div className="activity-item">
                    <div className="activity-icon">✅</div>
                    <div className="activity-content">
                      <p className="activity-title">Donation Completed</p>
                      <p className="activity-time">2 days ago</p>
                    </div>
                  </div>
                  <div className="activity-item">
                    <div className="activity-icon">📋</div>
                    <div className="activity-content">
                      <p className="activity-title">Appointment Booked</p>
                      <p className="activity-time">5 days ago</p>
                    </div>
                  </div>
                  <div className="activity-item">
                    <div className="activity-icon">🏆</div>
                    <div className="activity-content">
                      <p className="activity-title">Achievement Unlocked: Hero Badge</p>
                      <p className="activity-time">1 week ago</p>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}

          {activeSection === 'alerts' && <CivicAlertFeed />}
          {activeSection === 'readiness' && <DonationReadinessAdvisor />}
          {activeSection === 'emergency' && <EmergencyMobilization />}
        </div>
      </div>
    </div>
  );
}
