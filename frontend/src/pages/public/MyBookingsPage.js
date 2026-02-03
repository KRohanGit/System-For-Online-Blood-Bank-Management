/**
 * MyBookingsPage Component
 * 
 * Purpose: Display user's blood camp bookings
 * Access: PUBLIC_USER only
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { bloodCampAPI } from '../../services/bloodCampApi';
import BookingCard from '../../components/common/BookingCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
import './MyBookingsPage.css';

function MyBookingsPage() {
  const navigate = useNavigate();
  
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, confirmed, completed, cancelled

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (!token || role !== 'PUBLIC_USER') {
      alert('Please login as a Public User to view bookings');
      navigate('/signin/public-user');
      return;
    }

    fetchBookings();
  }, [navigate, filter]);

  /**
   * Fetch user's bookings
   */
  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await bloodCampAPI.getMyBookings(params);
      
      setBookings(response.data.bookings);
    } catch (err) {
      setError(err.message || 'Failed to load bookings');
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle cancel booking
   */
  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    const reason = prompt('Please provide a reason for cancellation (optional):');

    try {
      await bloodCampAPI.cancelBooking(bookingId, reason);
      alert('Booking cancelled successfully');
      fetchBookings(); // Refresh bookings
    } catch (err) {
      alert('Failed to cancel booking: ' + err.message);
      console.error('Error cancelling booking:', err);
    }
  };

  /**
   * Navigate to camp details
   */
  const handleViewCamp = (campId) => {
    navigate(`/blood-camps/${campId}`);
  };

  return (
    <div className="my-bookings-page">
      {/* Header */}
      <header className="bookings-header">
        <div className="header-content">
          <button 
            className="back-button" 
            onClick={() => navigate('/blood-camps')}
          >
            ← Back to Camps
          </button>
          <h1>🎫 My Bookings</h1>
          <p>View and manage your blood camp bookings</p>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-buttons">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button 
            className={`filter-btn ${filter === 'confirmed' ? 'active' : ''}`}
            onClick={() => setFilter('confirmed')}
          >
            Confirmed
          </button>
          <button 
            className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Completed
          </button>
          <button 
            className={`filter-btn ${filter === 'cancelled' ? 'active' : ''}`}
            onClick={() => setFilter('cancelled')}
          >
            Cancelled
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bookings-container">
        {loading && <LoadingSpinner message="Loading your bookings..." />}

        {error && !loading && (
          <ErrorMessage message={error} onRetry={fetchBookings} />
        )}

        {!loading && !error && bookings.length === 0 && (
          <EmptyState
            icon="🎫"
            title="No bookings found"
            message={
              filter === 'all'
                ? "You haven't booked any blood camps yet. Browse camps and make your first booking!"
                : `No ${filter} bookings found.`
            }
            actionButton={{
              text: 'Browse Blood Camps',
              onClick: () => navigate('/blood-camps')
            }}
          />
        )}

        {!loading && !error && bookings.length > 0 && (
          <>
            <div className="bookings-count">
              <h3>{bookings.length} {filter !== 'all' ? filter : ''} booking{bookings.length !== 1 ? 's' : ''}</h3>
            </div>

            <div className="bookings-grid">
              {bookings.map((booking) => (
                <BookingCard
                  key={booking._id}
                  booking={booking}
                  onCancel={handleCancelBooking}
                  onViewCamp={handleViewCamp}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default MyBookingsPage;
