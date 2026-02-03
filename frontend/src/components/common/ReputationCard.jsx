import React from 'react';
import {
  calculateImpactScore,
  getBadgeLevel,
  getNextBadge,
  calculatePeopleHelped,
  getActivityBreakdown
} from './ReputationCalculator';
import './ReputationCard.css';

/**
 * Community Reputation & Impact Score Display Card
 * Shows user's reputation, achievements, and impact
 */

const ReputationCard = ({ activities, userName = 'User', compact = false }) => {
  const score = calculateImpactScore(activities);
  const badge = getBadgeLevel(score);
  const nextBadge = getNextBadge(score);
  const peopleHelped = calculatePeopleHelped(activities);
  const activityBreakdown = getActivityBreakdown(activities);

  if (compact) {
    return (
      <div className="reputation-badge-compact">
        <span className="badge-icon" style={{ color: badge.color }}>{badge.icon}</span>
        <div className="badge-info">
          <span className="badge-level">{badge.level}</span>
          <span className="badge-score">{score} pts</span>
        </div>
      </div>
    );
  }

  return (
    <div className="reputation-card">
      <div className="reputation-header">
        <div className="user-info">
          <div className="user-avatar">{userName.charAt(0)}</div>
          <div className="user-details">
            <h3>{userName}</h3>
            <p>Community Member</p>
          </div>
        </div>

        <div className="badge-display">
          <div 
            className="badge-icon-large"
            style={{ color: badge.color }}
          >
            {badge.icon}
          </div>
          <div className="badge-content">
            <span className="badge-level-text">{badge.level}</span>
            <span className="badge-score-text">{score.toLocaleString()} points</span>
          </div>
        </div>
      </div>

      <div className="impact-stats">
        <div className="impact-stat">
          <span className="stat-icon">👥</span>
          <div className="stat-content">
            <span className="stat-value">{peopleHelped.toLocaleString()}</span>
            <span className="stat-label">People Helped</span>
          </div>
        </div>

        <div className="impact-stat">
          <span className="stat-icon">🎪</span>
          <div className="stat-content">
            <span className="stat-value">{activities.campsOrganized || 0}</span>
            <span className="stat-label">Camps Organized</span>
          </div>
        </div>

        <div className="impact-stat">
          <span className="stat-icon">🏥</span>
          <div className="stat-content">
            <span className="stat-value">{activities.hospitalCollaborations || 0}</span>
            <span className="stat-label">Collaborations</span>
          </div>
        </div>
      </div>

      {nextBadge.nextBadge && (
        <div className="next-badge-section">
          <div className="progress-header">
            <span className="progress-label">
              Progress to {nextBadge.nextBadge.level} {nextBadge.nextBadge.icon}
            </span>
            <span className="progress-remaining">
              {nextBadge.remaining} points remaining
            </span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ 
                width: `${nextBadge.progress}%`,
                backgroundColor: nextBadge.nextBadge.color
              }}
            >
              <span className="progress-text">
                {Math.round(nextBadge.progress)}%
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="activity-breakdown">
        <h4>Activity Breakdown</h4>
        <div className="activities-list">
          {activityBreakdown.map((activity, index) => (
            activity.value > 0 && (
              <div key={index} className="activity-item">
                <div className="activity-icon">{activity.icon}</div>
                <div className="activity-details">
                  <span className="activity-label">{activity.label}</span>
                  <span className="activity-count">{activity.value}× activities</span>
                </div>
                <div className="activity-points">
                  <span className="points-value">+{activity.points}</span>
                  <span className="points-label">points</span>
                </div>
              </div>
            )
          ))}
        </div>
      </div>

      <div className="reputation-footer">
        <div className="footer-note">
          <span className="note-icon">🛡️</span>
          <p>
            Your reputation score reflects your positive contributions to the community. 
            Keep making a difference!
          </p>
        </div>

        <div className="point-values">
          <h5>How to earn points</h5>
          <ul>
            <li>Organize a blood camp: <strong>+50 points</strong></li>
            <li>Complete a donation: <strong>+30 points</strong></li>
            <li>Hospital collaboration: <strong>+25 points</strong></li>
            <li>Earn a certificate: <strong>+20 points</strong></li>
            <li>Attend a camp: <strong>+15 points</strong></li>
            <li>Create helpful post: <strong>+10 points</strong></li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ReputationCard;
