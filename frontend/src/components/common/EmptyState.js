/**
 * EmptyState Component
 * 
 * Purpose: Reusable empty state display
 */

import React from 'react';
import './EmptyState.css';

function EmptyState({ icon = '🏥', title, message, actionButton }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{message}</p>
      {actionButton && (
        <button className="btn-primary" onClick={actionButton.onClick}>
          {actionButton.text}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
