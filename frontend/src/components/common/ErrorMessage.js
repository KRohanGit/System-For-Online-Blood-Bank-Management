/**
 * ErrorMessage Component
 * 
 * Purpose: Reusable error display
 */

import React from 'react';
import './ErrorMessage.css';

function ErrorMessage({ message, onRetry }) {
  return (
    <div className="error-state">
      <p className="error-message">❌ {message}</p>
      {onRetry && (
        <button onClick={onRetry} className="retry-btn">
          Try Again
        </button>
      )}
    </div>
  );
}

export default ErrorMessage;
