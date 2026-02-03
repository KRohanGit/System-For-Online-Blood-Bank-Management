/**
 * NotificationBell Component
 * 
 * Purpose: Reusable notification bell icon with unread count
 * Can be placed in navbar or any header
 */

import React, { useState, useEffect } from 'react';
import { notificationAPI } from '../../services/bloodCampApi';
import './NotificationBell.css';

function NotificationBell({ onClick }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUnreadCount();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const response = await notificationAPI.getUnreadCount();
      setUnreadCount(response.data.unreadCount);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  return (
    <button className="notification-bell" onClick={onClick}>
      <span className="bell-icon">🔔</span>
      {unreadCount > 0 && (
        <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
      )}
    </button>
  );
}

export default NotificationBell;
