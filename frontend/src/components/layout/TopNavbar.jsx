import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { auth } from '../../services/api';
import '../../styles/admin.css';

function TopNavbar({ toggleSidebar, hospitalName = 'City General Hospital' }) {
  const navigate = useNavigate();
  const navRef = useRef(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const notifications = [
    { id: 1, type: 'emergency', icon: '🚨', message: 'Critical: O- blood needed urgently', time: '2 min ago', priority: 'high' },
    { id: 2, type: 'low-stock', icon: '⚠️', message: 'AB+ blood stock running low', time: '15 min ago', priority: 'medium' },
    { id: 3, type: 'donor', icon: '👤', message: 'New donor response received', time: '1 hour ago', priority: 'normal' },
    { id: 4, type: 'request', icon: '📋', message: 'Blood request approved', time: '2 hours ago', priority: 'normal' }
  ];

  const handleLogout = () => {
    auth.removeToken();
    navigate('/signin');
  };

  const handleEmergency = () => {
    navigate('/admin/emergency');
  };

  const handleProfile = () => {
    navigate('/admin/settings');
    setShowProfile(false);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.navbar-item')) {
        setShowNotifications(false);
        setShowProfile(false);
      }
    };

    if (showNotifications || showProfile) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications, showProfile]);
  
  useEffect(() => {
    if (navRef.current) {
      gsap.fromTo(navRef.current,
        { y: -30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }
      );
    }
  }, []);

  return (
    <nav ref={navRef} className="top-navbar">
      <div className="navbar-left">
        <button className="menu-toggle" onClick={toggleSidebar}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <div className="hospital-info">
          <h1 className="hospital-name">{hospitalName}</h1>
          <span className="hospital-role">Blood Bank Admin</span>
        </div>
      </div>

      <div className="navbar-right">
        {/* Quick Actions */}
        <div className="navbar-item quick-action">
          <button 
            className="icon-button emergency-btn" 
            title="Go to Emergency Page"
            onClick={handleEmergency}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
            </svg>
            <span className="btn-label">Emergency</span>
          </button>
        </div>

        {/* Notifications */}
        <div className="navbar-item notifications">
          <button 
            className="icon-button notif-btn"
            onClick={() => setShowNotifications(!showNotifications)}
            title="Notifications"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span className="badge pulse">{notifications.length}</span>
          </button>
          
          {showNotifications && (
            <div className="dropdown notifications-dropdown">
              <div className="dropdown-header">
                <h3>Notifications</h3>
                <button onClick={() => setShowNotifications(false)}>✕</button>
              </div>
              <div className="dropdown-body">
                {notifications.map(notif => (
                  <div key={notif.id} className={`notification-item ${notif.type} priority-${notif.priority}`}>
                    <div className="notif-icon">{notif.icon}</div>
                    <div className="notif-content">
                      <p className="notif-message">{notif.message}</p>
                      <span className="notif-time">{notif.time}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="dropdown-footer">
                <a href="#view-all">View All Notifications</a>
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="navbar-item profile">
          <button 
            className="profile-button"
            onClick={() => setShowProfile(!showProfile)}
          >
            <div className="profile-avatar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
            <span className="profile-name">Admin</span>
            <svg className="dropdown-arrow" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 10l5 5 5-5z"/>
            </svg>
          </button>

          {showProfile && (
            <div className="dropdown profile-dropdown">
              <div className="profile-info">
                <div className="profile-avatar-large">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
                <h4>Hospital Admin</h4>
                <p>admin@hospital.com</p>
                <span className="role-badge">HOSPITAL_ADMIN</span>
              </div>
              <div className="dropdown-divider"></div>
              <div className="dropdown-menu">
                <button className="dropdown-item" onClick={handleProfile}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                  My Profile
                </button>
                <button className="dropdown-item" onClick={() => { navigate('/admin/settings'); setShowProfile(false); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94L14.4 2.81c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
                  </svg>
                  Settings
                </button>
                <button className="dropdown-item" onClick={() => { alert('Help & Support feature coming soon!'); setShowProfile(false); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                  </svg>
                  Help & Support
                </button>
                <div className="dropdown-divider"></div>
                <button className="dropdown-item logout" onClick={handleLogout}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
                  </svg>
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default TopNavbar;
