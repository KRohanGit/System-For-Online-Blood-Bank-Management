import React from 'react';
import '../../styles/admin.css';

function Loader({ size = 'medium', fullScreen = false }) {
  if (fullScreen) {
    return (
      <div className="loader-fullscreen">
        <div className={`loader loader-${size}`}>
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`loader loader-${size}`}>
      <div className="spinner"></div>
    </div>
  );
}

export default Loader;
