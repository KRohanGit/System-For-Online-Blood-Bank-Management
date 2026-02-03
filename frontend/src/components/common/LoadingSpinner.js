/**
 * LoadingSpinner Component
 * 
 * Purpose: Reusable loading indicator
 */

import React from 'react';
import './LoadingSpinner.css';

function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="loading-state">
      <div className="spinner"></div>
      <p>{message}</p>
    </div>
  );
}

export default LoadingSpinner;
