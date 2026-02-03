/**
 * NotificationItem Component
 * 
 * Purpose: Display a single notification
 */

import React from 'react';
import './NotificationItem.css';

function NotificationItem({ notification, onMarkAsRead, onDelete }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now - date;
    const diffInMins = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);

    if (diffInMins < 1) return 'Just now';
    if (diffInMins < 60) return `${diffInMins}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const getPriorityIcon = (priority) => {
    const icons = {
      urgent: '🚨',
      high: '❗',
      medium: 'ℹ️',
      low: '📝'
    };
    return icons[priority] || icons.medium;
  };

  return (
    <div className={`notification-item ${!notification.isRead ? 'unread' : ''}`}>
      <div className="notification-content">
        <div className="notification-header">
          <span className="priority-icon">{getPriorityIcon(notification.priority)}</span>
          <h4 className="notification-title">{notification.title}</h4>
        </div>
        <p className="notification-message">{notification.message}</p>
        <span className="notification-time">{formatDate(notification.createdAt)}</span>
      </div>

      <div className="notification-actions">
        {!notification.isRead && (
          <button 
            className="btn-icon"
            onClick={() => onMarkAsRead(notification._id)}
            title="Mark as read"
          >
            ✓
          </button>
        )}
        <button 
          className="btn-icon delete-btn"
          onClick={() => onDelete(notification._id)}
          title="Delete"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default NotificationItem;
