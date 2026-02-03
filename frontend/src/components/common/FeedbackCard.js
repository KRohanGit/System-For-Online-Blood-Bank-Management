import React from 'react';
import './FeedbackCard.css';

export default function FeedbackCard({ feedback }) {
  const renderStars = (rating) => {
    return '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="feedback-card">
      <div className="feedback-header">
        <div className="user-avatar">{feedback.userName?.charAt(0) || 'U'}</div>
        <div className="user-info">
          <div className="user-name">{feedback.userName}</div>
          <div className="feedback-time">{getTimeAgo(feedback.createdAt)}</div>
        </div>
        <div className="feedback-rating">{renderStars(feedback.rating)}</div>
      </div>
      <div className="feedback-comment">{feedback.comment}</div>
    </div>
  );
}
