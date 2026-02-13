import React from 'react';

const BloodInventoryHeader = ({ navigate, onAddClick, onEmergencyClick }) => {
  return (
    <div className="page-header">
      <button className="back-button" onClick={() => navigate('/admin/dashboard')}>
        ← Back
      </button>
      <div className="page-title-section">
        <h1>Blood Inventory Management</h1>
        <p className="page-subtitle">Manage blood units, track inventory, and monitor stock levels</p>
      </div>
      <div className="header-actions">
        <button 
          className="btn-emergency"
          onClick={onEmergencyClick}
        >
          🚨 Emergency Release
        </button>
        <button 
          className="btn-primary"
          onClick={onAddClick}
        >
          + Add Blood Unit
        </button>
      </div>
    </div>
  );
};

export default BloodInventoryHeader;
