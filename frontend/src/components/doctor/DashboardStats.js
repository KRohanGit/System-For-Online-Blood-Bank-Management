import React, { useState, useEffect } from 'react';
import { getDashboardStats } from '../../services/doctorApi';
import '../../styles/DashboardStats.css';

const DashboardStats = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error('Load stats error:', error);
    }
  };

  if (!stats) return null;

  return (
    <div className="dashboard-stats">
      <div className="stat-card urgent">
        <div className="stat-icon">🚨</div>
        <div className="stat-info">
          <h3>{stats.pendingEmergency || 0}</h3>
          <p>Emergency Requests</p>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon">📋</div>
        <div className="stat-info">
          <h3>{stats.pendingRequests || 0}</h3>
          <p>Pending Requests</p>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon">👤</div>
        <div className="stat-info">
          <h3>{stats.pendingDonors || 0}</h3>
          <p>Donors for Screening</p>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon">🩸</div>
        <div className="stat-info">
          <h3>{stats.pendingUnits || 0}</h3>
          <p>Units for Validation</p>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon">⚠️</div>
        <div className="stat-info">
          <h3>{stats.adverseReactions || 0}</h3>
          <p>Adverse Reactions</p>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon">⛺</div>
        <div className="stat-info">
          <h3>{stats.pendingCamps || 0}</h3>
          <p>Camps for Review</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;
