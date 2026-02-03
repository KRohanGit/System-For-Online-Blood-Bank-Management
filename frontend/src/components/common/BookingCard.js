/**
 * BookingCard Component
 * 
 * Purpose: Reusable component to display a single booking
 */

import React from 'react';
import './BookingCard.css';

function BookingCard({ booking, onCancel, onViewCamp }) {
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

  const getStatusBadge = (status) => {
    const badges = {
      confirmed: { text: 'Confirmed', class: 'confirmed' },
      pending: { text: 'Pending', class: 'pending' },
      cancelled: { text: 'Cancelled', class: 'cancelled' },
      completed: { text: 'Completed', class: 'completed' },
      'no-show': { text: 'No Show', class: 'no-show' }
    };
    return badges[status] || badges.pending;
  };

  const statusInfo = getStatusBadge(booking.status);
  const camp = booking.campId;

  return (
    <div className="booking-card">
      <div className="booking-header">
        <h3 className="booking-title">{camp?.title || 'Camp Details Unavailable'}</h3>
        <span className={`booking-badge ${statusInfo.class}`}>
          {statusInfo.text}
        </span>
      </div>

      <div className="booking-details">
        <div className="detail-row">
          <span className="detail-icon">📅</span>
          <span className="detail-text">
            {camp ? formatDate(camp.dateTime) : 'Date unavailable'}
          </span>
        </div>

        <div className="detail-row">
          <span className="detail-icon">📍</span>
          <span className="detail-text">
            {camp ? `${camp.location.address}, ${camp.location.city}` : 'Location unavailable'}
          </span>
        </div>

        <div className="detail-row">
          <span className="detail-icon">🎫</span>
          <span className="detail-text">
            Booked on: {formatDate(booking.bookingTime)}
          </span>
        </div>

        {booking.notes && (
          <div className="detail-row">
            <span className="detail-icon">📝</span>
            <span className="detail-text">{booking.notes}</span>
          </div>
        )}

        {booking.donationCompleted && (
          <div className="donation-badge">
            ✓ Donation Completed
          </div>
        )}
      </div>

      <div className="booking-actions">
        {camp && (
          <button 
            className="btn-outline"
            onClick={() => onViewCamp(camp._id)}
          >
            View Camp
          </button>
        )}
        
        {booking.status === 'confirmed' && (
          <button 
            className="btn-danger"
            onClick={() => onCancel(booking._id)}
          >
            Cancel Booking
          </button>
        )}
      </div>
    </div>
  );
}

export default BookingCard;
