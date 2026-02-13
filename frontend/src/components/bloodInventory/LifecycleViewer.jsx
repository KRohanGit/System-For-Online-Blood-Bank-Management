import React from 'react';
import { formatDate } from '../../services/bloodInventoryApi';
import './LifecycleViewer.css';

const LifecycleViewer = ({ unit, onClose }) => {
  if (!unit || !unit.lifecycle) return null;

  const getEventIcon = (action) => {
    const icons = {
      'Created': '🩸',
      'Reserved': '🔒',
      'Issued': '✅',
      'Emergency Release': '🚨',
      'Updated': '✏️',
      'Quarantined': '⚠️',
      'Expired': '⏰'
    };
    return icons[action] || '📋';
  };

  const getEventColor = (action) => {
    const colors = {
      'Created': '#10b981',
      'Reserved': '#f59e0b',
      'Issued': '#3b82f6',
      'Emergency Release': '#ef4444',
      'Updated': '#6366f1',
      'Quarantined': '#f97316',
      'Expired': '#6b7280'
    };
    return colors[action] || '#9ca3af';
  };

  return (
    <div className="lifecycle-viewer">
      <div className="lifecycle-header">
        <div>
          <h3>Blood Unit Lifecycle</h3>
          <p className="unit-id">{unit.unitId}</p>
        </div>
        <div className="unit-basic-info">
          <span className="badge">{unit.bloodGroup}</span>
          <span className={`badge badge-${unit.status.toLowerCase()}`}>
            {unit.status}
          </span>
        </div>
      </div>

      <div className="lifecycle-timeline">
        {unit.lifecycle.map((event, index) => (
          <div key={index} className="timeline-item">
            <div 
              className="timeline-marker"
              style={{ backgroundColor: getEventColor(event.action) }}
            >
              <span className="timeline-icon">{getEventIcon(event.action)}</span>
            </div>

            <div className="timeline-content">
              <div className="timeline-header">
                <h4>{event.action}</h4>
                <span className="timeline-date">
                  {formatDate(event.timestamp)}
                </span>
              </div>

              {(event.performedByName || event.performedBy) && (
                <p className="timeline-user">
                  By: {event.performedByName || (event.performedBy && event.performedBy.email) || event.performedBy}
                </p>
              )}

              {event.details && (
                <div className="timeline-details">
                  {Object.entries(event.details).map(([key, value]) => (
                    <div key={key} className="detail-row">
                      <span className="detail-key">{key}:</span>
                      <span className="detail-value">{value}</span>
                    </div>
                  ))}
                </div>
              )}

              {event.metadata && (
                <div className="timeline-metadata">
                  {event.metadata.patientId && (
                    <span className="metadata-badge">
                      Patient: {event.metadata.patientId}
                    </span>
                  )}
                  {event.metadata.reason && (
                    <span className="metadata-badge emergency">
                      {event.metadata.reason}
                    </span>
                  )}
                </div>
              )}
            </div>

            {index < unit.lifecycle.length - 1 && (
              <div className="timeline-connector"></div>
            )}
          </div>
        ))}
      </div>

      <button className="btn-secondary" onClick={onClose}>
        Close
      </button>
    </div>
  );
};

export default LifecycleViewer;
