/**
 * CampDetailsModal Component
 * 
 * Purpose: Reusable modal to display detailed camp information
 */

import React from 'react';
import './CampDetailsModal.css';

function CampDetailsModal({ camp, onClose, onBook }) {
  if (!camp) return null;

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

  const availableSlots = camp.capacity - camp.bookedSlots;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{camp.title}</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="detail-section">
            <h4>📅 Date & Time</h4>
            <p>{formatDate(camp.dateTime)}</p>
            <p>Duration: {camp.duration?.hours || 4} hours</p>
          </div>

          <div className="detail-section">
            <h4>📍 Location</h4>
            <p>{camp.location.address}</p>
            <p>{camp.location.city}, {camp.location.state}</p>
            {camp.location.pincode && (
              <p>PIN: {camp.location.pincode}</p>
            )}
          </div>

          <div className="detail-section">
            <h4>👤 Organizer</h4>
            <p>{camp.organizerName}</p>
            <p>📧 {camp.organizerContact?.email}</p>
            <p>📞 {camp.organizerContact?.phone}</p>
          </div>

          <div className="detail-section">
            <h4>📋 Details</h4>
            <p>{camp.description}</p>
            <p>Capacity: {camp.capacity} donors</p>
            <p>Available Slots: {availableSlots}</p>
          </div>

          {camp.facilities && camp.facilities.length > 0 && (
            <div className="detail-section">
              <h4>✨ Facilities</h4>
              <ul className="facilities-list">
                {camp.facilities.map((facility, index) => (
                  <li key={index}>✓ {facility}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button 
            className="btn-primary"
            onClick={() => {
              onClose();
              onBook(camp._id);
            }}
            disabled={availableSlots === 0}
          >
            {availableSlots === 0 ? 'Fully Booked' : 'Book This Camp'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CampDetailsModal;
