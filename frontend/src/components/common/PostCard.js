import React from 'react';
import './PostCard.css';

export default function PostCard({ post, onViewDetails, onComment, onLike, isLiked }) {
  const getUrgencyColor = () => {
    const colors = { critical: 'urgent-critical', high: 'urgent-high', medium: 'urgent-medium', low: 'urgent-low' };
    return colors[post.urgency] || 'urgent-medium';
  };

  const getTypeIcon = () => {
    const icons = { request: '🩸', announcement: '📢', story: '💝', question: '❓' };
    return icons[post.type] || '📝';
  };

  return (
    <div className="post-card">
      <div className="post-header">
        <div className="post-meta">
          <span className="post-icon">{getTypeIcon()}</span>
          <div>
            <h3>{post.title}</h3>
            <p className="post-author">{post.authorName} • {post.location?.city}</p>
          </div>
        </div>
        <span className={`urgency-badge ${getUrgencyColor()}`}>{post.urgency}</span>
      </div>
      <p className="post-content">{post.content.substring(0, 150)}...</p>
      {post.bloodGroup && (
        <div className="blood-info">
          <span className="blood-badge">{post.bloodGroup}</span>
        </div>
      )}
      <div className="post-footer">
        <button onClick={() => onLike(post._id)} className={`btn-icon ${isLiked ? 'liked' : ''}`}>
          ❤️ {post.likes?.length || 0}
        </button>
        <button onClick={() => onComment(post)} className="btn-icon">
          💬 {post.comments?.length || 0}
        </button>
        <button onClick={() => onViewDetails(post)} className="btn-primary-sm">View Details</button>
      </div>
    </div>
  );
}
