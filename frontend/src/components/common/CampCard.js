/**
 * CampCard Component
 * 
 * Purpose: Reusable card component to display a single blood camp
 * Can be used in listing pages, search results, etc.
 */

import React from 'react';
import './CampCard.css';

function CampCard({ camp, onViewDetails, onBook }) {
  const availableSlots = camp.capacity - camp.bookedSlots;
  
  const getStatusColor = () => {
    if (availableSlots === 0) return 'full';
    if (availableSlots <= 10) return 'filling';
    return 'available';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="camp-card">
      <div className="camp-header">
        <h3 className="camp-title">{camp.title}</h3>
        <span className={`status-badge ${getStatusColor()}`}>
          {availableSlots > 0 
            ? `${availableSlots} slots left`
            : 'Fully Booked'}
        </span>
      </div>

      <div className="camp-details">
        <div className="detail-row">
          <span className="detail-icon">📅</span>
          <span className="detail-text">{formatDate(camp.dateTime)}</span>
        </div>

        <div className="detail-row">
          <span className="detail-icon">📍</span>
          <span className="detail-text">
            {camp.location.address}, {camp.location.city}
            {camp.distance && <span className="distance"> • {camp.distance} km away</span>}
          </span>
        </div>

        <div className="detail-row">
          <span className="detail-icon">👤</span>
          <span className="detail-text">Organized by: {camp.organizerName}</span>
        </div>

        <div className="detail-row">
          <span className="detail-icon">🩸</span>
          <span className="detail-text">
            Blood Groups: {camp.bloodGroupsNeeded?.join(', ') || 'All'}
          </span>
        </div>

        {camp.description && (
          <p className="camp-description">{camp.description}</p>
        )}
      </div>

      <div className="camp-actions">
        <button 
          className="btn-outline view-details-btn"
          onClick={() => onViewDetails(camp)}
        >
          View Details
        </button>
        
        <button 
          className="btn-primary book-btn"
          onClick={() => onBook(camp._id)}
          disabled={availableSlots === 0}
        >
          {availableSlots === 0 ? 'Fully Booked' : 'Book Slot'}
        </button>
      </div>
    </div>
  );
}

export default CampCard;
