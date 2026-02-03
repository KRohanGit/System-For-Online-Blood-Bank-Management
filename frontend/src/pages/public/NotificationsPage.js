/**
 * NotificationsPage Component
 * 
 * Purpose: Display and manage user notifications
 * Access: Authenticated users only
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationAPI } from '../../services/bloodCampApi';
import NotificationItem from '../../components/common/NotificationItem';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
import './NotificationsPage.css';

function NotificationsPage() {
  const navigate = useNavigate();
  
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, unread

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/signin/public-user');
      return;
    }

    fetchNotifications();
  }, [navigate, filter]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = filter === 'unread' ? { isRead: false } : {};
      const response = await notificationAPI.getMyNotifications(params);
      
      setNotifications(response.data.notifications);
    } catch (err) {
      setError(err.message || 'Failed to load notifications');
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationAPI.markAsRead(notificationId);
      fetchNotifications();
    } catch (err) {
      alert('Failed to mark as read: ' + err.message);
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await notificationAPI.deleteNotification(notificationId);
      fetchNotifications();
    } catch (err) {
      alert('Failed to delete notification: ' + err.message);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      fetchNotifications();
    } catch (err) {
      alert('Failed to mark all as read: ' + err.message);
    }
  };

  const handleDeleteAllRead = async () => {
    if (!window.confirm('Delete all read notifications?')) return;
    
    try {
      await notificationAPI.deleteAllRead();
      fetchNotifications();
    } catch (err) {
      alert('Failed to delete notifications: ' + err.message);
    }
  };

  return (
    <div className="notifications-page">
      <header className="notifications-header">
        <div className="header-content">
          <button 
            className="back-button" 
            onClick={() => navigate(-1)}
          >
            ← Back
          </button>
          <h1>🔔 Notifications</h1>
          <p>Stay updated with your blood camp activities</p>
        </div>
      </header>

      <div className="notifications-toolbar">
        <div className="filter-buttons">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button 
            className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            Unread
          </button>
        </div>

        <div className="action-buttons">
          <button 
            className="btn-secondary"
            onClick={handleMarkAllAsRead}
          >
            Mark All as Read
          </button>
          <button 
            className="btn-outline"
            onClick={handleDeleteAllRead}
          >
            Delete Read
          </button>
        </div>
      </div>

      <div className="notifications-container">
        {loading && <LoadingSpinner message="Loading notifications..." />}

        {error && !loading && (
          <ErrorMessage message={error} onRetry={fetchNotifications} />
        )}

        {!loading && !error && notifications.length === 0 && (
          <EmptyState
            icon="🔔"
            title="No notifications"
            message={
              filter === 'unread'
                ? "You're all caught up! No unread notifications."
                : "You don't have any notifications yet."
            }
          />
        )}

        {!loading && !error && notifications.length > 0 && (
          <div className="notifications-list">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification._id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default NotificationsPage;
