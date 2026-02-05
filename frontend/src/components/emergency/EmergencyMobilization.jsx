/**
 * EmergencyMobilization Component
 * 
 * Main component for Emergency Blood Mobilization feature
 * Displays active emergency events and user response history
 */

import React, { useState, useEffect } from 'react';
import { getCurrentLocation } from '../../services/geolocationApi';
import {
  getActiveEmergencyEvents,
  getUserResponses,
  submitEmergencyResponse
} from '../../services/emergencyMockData';
import EmergencyEventCard from './EmergencyEventCard';
import ResponseModal from './ResponseModal';
import MyResponsesTab from './MyResponsesTab';
import './EmergencyMobilization.css';

const EmergencyMobilization = () => {
  // State management
  const [events, setEvents] = useState([]);
  const [myResponses, setMyResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('events');
  
  // Modal state
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Initialize component
  useEffect(() => {
    detectUserLocation();
    loadMyResponses();
  }, []);

  useEffect(() => {
    if (userLocation) {
      loadActiveEvents();
    }
  }, [userLocation]);

  /**
   * Detect user's current location
   */
  const detectUserLocation = async () => {
    setLocationLoading(true);
    try {
      const location = await getCurrentLocation();
      setUserLocation({
        lat: location.latitude,
        lng: location.longitude
      });
    } catch (error) {
      console.error('Location error:', error);
      // Fallback to Hyderabad coordinates
      setUserLocation({ lat: 17.4065, lng: 78.4772 });
    } finally {
      setLocationLoading(false);
    }
  };

  /**
   * Load active emergency events
   */
  const loadActiveEvents = async () => {
    try {
      setLoading(true);
      const result = await getActiveEmergencyEvents(userLocation);
      setEvents(result.data || []);
    } catch (error) {
      console.error('Error loading events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load user's response history
   */
  const loadMyResponses = async () => {
    try {
      const result = await getUserResponses();
      setMyResponses(result.data || []);
    } catch (error) {
      console.error('Error loading responses:', error);
      setMyResponses([]);
    }
  };

  /**
   * Handle respond button click
   */
  const handleRespondClick = (event) => {
    setSelectedEvent(event);
    setShowResponseModal(true);
  };

  /**
   * Handle response confirmation
   */
  const handleResponseConfirm = async (responseStatus) => {
    try {
      const result = await submitEmergencyResponse(
        selectedEvent.eventId,
        responseStatus
      );
      
      // Show success message
      alert(result.message || 'Response submitted successfully!');
      
      // Reload data
      await loadMyResponses();
      await loadActiveEvents();
      
      // Close modal
      setShowResponseModal(false);
      setSelectedEvent(null);
      
      // Switch to My Responses tab if user responded
      if (responseStatus === 'RESPONDED') {
        setActiveTab('my-responses');
      }
    } catch (error) {
      alert(error.message || 'Error submitting response');
    }
  };

  /**
   * Handle modal close
   */
  const handleModalClose = () => {
    setShowResponseModal(false);
    setSelectedEvent(null);
  };

  // Loading state
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
      {/* Header */}
      <div className="emergency-header">
        <div className="header-content">
          <h2>🚨 Emergency Blood Mobilization</h2>
          <p>Help save lives during critical blood shortages</p>
        </div>
        {userLocation && (
          <div className="location-badge">
            📍 {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          🔴 Active Events ({events.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'my-responses' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-responses')}
        >
          📋 My Responses ({myResponses.length})
        </button>
      </div>

      {/* Active Events Tab */}
      {activeTab === 'events' && (
        <div className="events-section">
          {events.length === 0 ? (
            <div className="no-events">
              <div className="no-events-icon">✨</div>
              <h3>No Active Emergencies</h3>
              <p>Great news! There are no emergency blood requests at the moment.</p>
              <p className="sub-text">You'll be notified when help is needed.</p>
            </div>
          ) : (
            <>
              <div className="events-info">
                <p>
                  <strong>{events.length}</strong> active emergency event{events.length !== 1 ? 's' : ''} 
                  {' '}near your location
                </p>
              </div>
              <div className="events-grid">
                {events.map((event) => (
                  <EmergencyEventCard
                    key={event.eventId}
                    event={event}
                    onRespond={handleRespondClick}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* My Responses Tab */}
      {activeTab === 'my-responses' && (
        <MyResponsesTab responses={myResponses} />
      )}

      {/* Response Modal */}
      {showResponseModal && selectedEvent && (
        <ResponseModal
          event={selectedEvent}
          onClose={handleModalClose}
          onConfirm={handleResponseConfirm}
        />
      )}
    </div>
  );
};

export default EmergencyMobilization;
