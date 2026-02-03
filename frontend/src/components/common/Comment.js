import React from 'react';
import './Comment.css';

export default function Comment({ comment }) {
  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="comment">
      <div className="comment-header">
        <strong>{comment.userName}</strong>
        <span className="comment-time">{getTimeAgo(comment.createdAt)}</span>
      </div>
      <p className="comment-content">{comment.content}</p>
    </div>
  );
}
