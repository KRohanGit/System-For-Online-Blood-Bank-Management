import React, { useState, useEffect } from 'react';
import { getDoctorAlerts, markAlertRead } from '../../services/doctorApi';
import '../../styles/AlertsPanel.css';

const AlertsPanel = () => {
  const [alerts, setAlerts] = useState([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadAlerts = async () => {
    try {
      const data = await getDoctorAlerts();
      setAlerts(data);
    } catch (error) {
      console.error('Load alerts error:', error);
    }
  };

  const handleMarkRead = async (alertId) => {
    try {
      await markAlertRead(alertId);
      loadAlerts();
    } catch (error) {
      console.error('Mark read error:', error);
    }
  };

  if (alerts.length === 0) return null;

  const displayAlerts = showAll ? alerts : alerts.slice(0, 3);

  return (
    <div className="alerts-panel">
      <div className="alerts-header">
        <h3>🔔 Alerts & Notifications</h3>
        {alerts.length > 3 && (
          <button onClick={() => setShowAll(!showAll)} className="toggle-btn">
            {showAll ? 'Show Less' : `Show All (${alerts.length})`}
          </button>
        )}
      </div>

      <div className="alerts-list">
        {displayAlerts.map(alert => (
          <div key={alert._id} className={`alert-item ${alert.priority}`}>
            <div className="alert-icon">
              {alert.type === 'emergency' && '🚨'}
              {alert.type === 'unsafe' && '⚠️'}
              {alert.type === 'deferral' && '⏸️'}
            </div>
            <div className="alert-content">
              <div className="alert-title">{alert.title}</div>
              <div className="alert-message">{alert.message}</div>
              <div className="alert-time">{new Date(alert.createdAt).toLocaleString()}</div>
            </div>
            <button onClick={() => handleMarkRead(alert._id)} className="mark-read-btn">
              ✓
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AlertsPanel;
