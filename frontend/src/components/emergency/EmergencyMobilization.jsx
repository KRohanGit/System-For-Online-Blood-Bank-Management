import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './EmergencyMobilization.css';

const EmergencyMobilization = () => {
  const [events, setEvents] = useState([]);
  const [myResponses, setMyResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [activeTab, setActiveTab] = useState('events');

  useEffect(() => {
    getUserLocation();
    fetchMyResponses();
  }, []);

  useEffect(() => {
    if (userLocation) {
      fetchEvents();
    }
  }, [userLocation]);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => {
          setUserLocation({ lat: 17.6868, lng: 83.2185 });
        }
      );
    } else {
      setUserLocation({ lat: 17.6868, lng: 83.2185 });
    }
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `/api/public/emergency-events?lat=${userLocation.lat}&lng=${userLocation.lng}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEvents(response.data.data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyResponses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/public/my-volunteer-responses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyResponses(response.data.data || []);
    } catch (error) {
      console.error('Error fetching responses:', error);
    }
  };

  const handleRegister = async (eventId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        '/api/public/emergency-volunteer-register',
        { eventId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Successfully registered as volunteer!');
      fetchEvents();
      fetchMyResponses();
    } catch (error) {
      alert(error.response?.data?.message || 'Error registering as volunteer');
    }
  };

  const getUrgencyColor = (level) => {
    const colors = {
      CRITICAL: '#e74c3c',
      HIGH: '#f39c12',
      MEDIUM: '#f1c40f',
      LOW: '#3498db'
    };
    return colors[level] || '#95a5a6';
  };

  const getUrgencyIcon = (level) => {
    const icons = {
      CRITICAL: '🚨',
      HIGH: '⚠️',
      MEDIUM: '⏰',
      LOW: '📢'
    };
    return icons[level] || '📋';
  };

  const formatTimeRemaining = (hours) => {
    if (hours < 1) return `${Math.floor(hours * 60)} minutes`;
    if (hours < 24) return `${Math.floor(hours)} hours`;
    return `${Math.floor(hours / 24)} days`;
  };

  if (loading && activeTab === 'events') {
    return (
      <div className="emergency-loading">
        <div className="spinner"></div>
        <p>Loading emergency events...</p>
      </div>
    );
  }

  return (
    <div className="emergency-mobilization">
      <div className="emergency-header">
        <h2>🚨 Emergency Blood Mobilization</h2>
        <p>Help save lives during critical shortages</p>
      </div>

      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          Active Events ({events.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'my-responses' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-responses')}
        >
          My Responses ({myResponses.length})
        </button>
      </div>

      {activeTab === 'events' && (
        <div className="events-section">
          {events.length === 0 ? (
            <div className="no-events">
              <div className="no-events-icon">✨</div>
              <h3>No Active Emergencies</h3>
              <p>Great! There are no emergency blood requests at the moment.</p>
            </div>
          ) : (
            <div className="events-grid">
              {events.map((event) => (
                <div
                  key={event._id}
                  className="emergency-card"
                  style={{ borderTopColor: getUrgencyColor(event.urgencyLevel) }}
                >
                  <div className="emergency-urgency-badge" style={{ backgroundColor: getUrgencyColor(event.urgencyLevel) }}>
                    {getUrgencyIcon(event.urgencyLevel)} {event.urgencyLevel}
                  </div>

                  <div className="emergency-main">
                    <h3 className="emergency-hospital">{event.hospitalName}</h3>
                    
                    <div className="emergency-requirement">
                      <div className="blood-info">
                        <span className="blood-group-large">{event.bloodGroup}</span>
                        <div className="units-info">
                          <span className="units-needed">{event.unitsRequired} units needed</span>
                          <span className="volunteers-count">
                            {event.volunteersRegistered}/{event.volunteersRequired} volunteers
                          </span>
                        </div>
                      </div>
                    </div>

                    {event.description && (
                      <p className="emergency-description">{event.description}</p>
                    )}

                    <div className="emergency-meta">
                      {event.distance && (
                        <div className="meta-badge">
                          <span className="meta-icon">📍</span>
                          <span>{event.distance} km away</span>
                        </div>
                      )}
                      <div className="meta-badge">
                        <span className="meta-icon">⏱️</span>
                        <span>{formatTimeRemaining(event.hoursRemaining)} left</span>
                      </div>
                      <div className="meta-badge">
                        <span className="meta-icon">👥</span>
                        <span>{event.spotsAvailable} spots left</span>
                      </div>
                    </div>

                    <div className="volunteer-progress">
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${(event.volunteersRegistered / event.volunteersRequired) * 100}%`,
                            backgroundColor: getUrgencyColor(event.urgencyLevel)
                          }}
                        ></div>
                      </div>
                      <span className="progress-text">
                        {Math.round((event.volunteersRegistered / event.volunteersRequired) * 100)}% filled
                      </span>
                    </div>

                    {event.instructions && (
                      <div className="instructions-box">
                        <strong>Instructions:</strong> {event.instructions}
                      </div>
                    )}
                  </div>

                  <div className="emergency-actions">
                    <button
                      className="volunteer-btn"
                      onClick={() => handleRegister(event._id)}
                      disabled={event.spotsAvailable <= 0}
                    >
                      {event.spotsAvailable > 0 ? '🙋‍♂️ Register as Volunteer' : 'Event Full'}
                    </button>
                    <button className="navigate-btn">
                      📍 Navigate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'my-responses' && (
        <div className="responses-section">
          {myResponses.length === 0 ? (
            <div className="no-responses">
              <p>You haven't registered for any emergency events yet.</p>
            </div>
          ) : (
            <div className="responses-list">
              {myResponses.map((response) => (
                <div key={response._id} className="response-card">
                  <div className="response-header">
                    <h4>{response.eventId?.hospitalName || 'Unknown Hospital'}</h4>
                    <span className={`status-badge status-${response.responseStatus.toLowerCase()}`}>
                      {response.responseStatus}
                    </span>
                  </div>
                  <div className="response-details">
                    <p>Blood Group: <strong>{response.eventId?.bloodGroup}</strong></p>
                    <p>Units Required: <strong>{response.eventId?.unitsRequired}</strong></p>
                    <p>Registered: {new Date(response.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EmergencyMobilization;
