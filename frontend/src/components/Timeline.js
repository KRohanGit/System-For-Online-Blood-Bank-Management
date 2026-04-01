import React from 'react';
import './Timeline.css';

const Timeline = ({ events = [] }) => {
  const formatTimelineEvent = (event) => {
    const eventTypes = {
      'collected': {
        icon: '🩸',
        color: '#d32f2f',
        title: 'Blood Collected'
      },
      'processing': {
        icon: '⚙️',
        color: '#2196F3',
        title: 'Processing Started'
      },
      'tested': {
        icon: '🧪',
        color: '#FF9800',
        title: 'Tests Completed'
      },
      'transferred': {
        icon: '📦',
        color: '#2196F3',
        title: 'Transferred'
      },
      'received': {
        icon: '📥',
        color: '#4CAF50',
        title: 'Received'
      },
      'stored': {
        icon: '❄️',
        color: '#00BCD4',
        title: 'In Storage'
      },
      'transfused': {
        icon: '💉',
        color: '#9C27B0',
        title: 'Transfused'
      },
      'discarded': {
        icon: '🗑️',
        color: '#F44336',
        title: 'Discarded'
      },
      'expired': {
        icon: '⏰',
        color: '#757575',
        title: 'Expired'
      }
    };

    return eventTypes[event.type] || {
      icon: '📋',
      color: '#999',
      title: event.type || 'Event'
    };
  };

  if (!events || events.length === 0) {
    return (
      <div className="timeline-empty">
        <p>No timeline events yet</p>
      </div>
    );
  }

  // Sort events by date (most recent first)
  const sortedEvents = [...events].sort((a, b) => 
    new Date(b.timestamp) - new Date(a.timestamp)
  );

  return (
    <div className="timeline">
      <div className="timeline-container">
        {sortedEvents.map((event, index) => {
          const eventInfo = formatTimelineEvent(event);
          const date = new Date(event.timestamp);

          return (
            <div key={index} className="timeline-item">
              <div className="timeline-marker" style={{ borderColor: eventInfo.color }}>
                <span>{eventInfo.icon}</span>
              </div>

              <div className="timeline-content">
                <div className="timeline-header">
                  <h4 style={{ color: eventInfo.color }}>
                    {eventInfo.title}
                  </h4>
                  <time className="timeline-time">
                    {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </time>
                </div>

                {event.description && (
                  <p className="timeline-description">{event.description}</p>
                )}

                {event.location && (
                  <div className="timeline-location">
                    📍 <strong>{event.location}</strong>
                  </div>
                )}

                {event.details && typeof event.details === 'object' && (
                  <div className="timeline-details">
                    {Object.entries(event.details).map(([key, value]) => (
                      <div key={key} className="detail-row">
                        <strong>{key}:</strong>
                        <span>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {event.blockchainTx && (
                  <div className="timeline-blockchain">
                    🔗 TX: <code>{event.blockchainTx.substring(0, 16)}...</code>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Timeline;
