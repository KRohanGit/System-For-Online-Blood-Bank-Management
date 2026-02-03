import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StatusBadge from '../../components/common/StatusBadge';
import FeedbackCard from '../../components/common/FeedbackCard';
import { bloodCampAPI } from '../../services/bloodCampApi';
import './CampDetailsPage.css';

export default function CampDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [camp, setCamp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedback, setFeedback] = useState({ rating: 5, comment: '' });

  useEffect(() => {
    fetchCampDetails();
  }, [id]);

  const fetchCampDetails = async () => {
    try {
      const response = await bloodCampAPI.getCampById(id);
      setCamp(response.camp);
    } catch (error) {
      console.error('Error fetching camp details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAttendCamp = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      if (window.confirm('Please login to register for this camp')) {
        navigate('/signin/public-user');
      }
      return;
    }

    try {
      await bloodCampAPI.registerAttendance(id, token);
      alert('Successfully registered for the camp!');
      fetchCampDetails();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to register');
    }
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login to submit feedback');
      return;
    }

    try {
      await bloodCampAPI.addFeedback(id, feedback, token);
      alert('Feedback submitted successfully!');
      setShowFeedbackForm(false);
      setFeedback({ rating: 5, comment: '' });
      fetchCampDetails();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to submit feedback');
    }
  };

  if (loading) return <div className="loading-page">Loading...</div>;
  if (!camp) return <div className="error-page">Camp not found</div>;

  return (
    <div className="camp-details-page">
      <button className="back-btn" onClick={() => navigate('/blood-camps')}>← Back to Camps</button>

      <div className="camp-details-container">
        <div className="camp-header-section">
          <div className="camp-title-row">
            <h1>{camp.campName}</h1>
            <StatusBadge status={camp.lifecycle.status} approvalStatus={camp.lifecycle.approvalStatus} />
          </div>
          <p className="camp-description">{camp.description}</p>
        </div>

        <div className="camp-content-grid">
          <div className="main-content">
            <section className="info-section">
              <h2>Camp Details</h2>
              <div className="info-grid">
                <div className="info-item">
                  <span className="label">Date</span>
                  <span className="value">{new Date(camp.schedule.date).toLocaleDateString()}</span>
                </div>
                <div className="info-item">
                  <span className="label">Time</span>
                  <span className="value">{camp.schedule.startTime} - {camp.schedule.endTime}</span>
                </div>
                <div className="info-item">
                  <span className="label">Category</span>
                  <span className="value">{camp.schedule.category}</span>
                </div>
                <div className="info-item">
                  <span className="label">Venue Type</span>
                  <span className="value">{camp.venue.type}</span>
                </div>
              </div>
            </section>

            <section className="info-section">
              <h2>Venue Information</h2>
              <div className="venue-details">
                <p><strong>{camp.venue.name}</strong></p>
                <p>{camp.venue.address}</p>
                <p>{camp.venue.city}, {camp.venue.state} - {camp.venue.pincode}</p>
                <div className="map-placeholder">🗺️ Map View</div>
              </div>
            </section>

            <section className="info-section">
              <h2>Facilities Available</h2>
              <div className="facilities-grid">
                {camp.facilities.hygieneSanitation && <div className="facility-badge">✓ Hygiene & Sanitation</div>}
                {camp.facilities.powerSupply && <div className="facility-badge">✓ Power Supply</div>}
                {camp.facilities.screeningArea && <div className="facility-badge">✓ Screening Area</div>}
                {camp.facilities.waitingRefreshmentArea && <div className="facility-badge">✓ Waiting & Refreshment</div>}
              </div>
            </section>

            {camp.lifecycle.status === 'Completed' && (
              <section className="info-section">
                <div className="feedback-header">
                  <h2>Feedback & Reviews</h2>
                  <button onClick={() => setShowFeedbackForm(!showFeedbackForm)} className="add-feedback-btn">
                    + Add Feedback
                  </button>
                </div>

                {showFeedbackForm && (
                  <form onSubmit={handleSubmitFeedback} className="feedback-form">
                    <div className="form-group">
                      <label>Rating</label>
                      <select value={feedback.rating} onChange={(e) => setFeedback({ ...feedback, rating: parseInt(e.target.value) })}>
                        <option value={5}>5 - Excellent</option>
                        <option value={4}>4 - Good</option>
                        <option value={3}>3 - Average</option>
                        <option value={2}>2 - Poor</option>
                        <option value={1}>1 - Very Poor</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Comment</label>
                      <textarea 
                        value={feedback.comment}
                        onChange={(e) => setFeedback({ ...feedback, comment: e.target.value })}
                        rows="4"
                        required
                      />
                    </div>
                    <button type="submit" className="submit-feedback-btn">Submit Feedback</button>
                  </form>
                )}

                <div className="feedback-list">
                  {camp.feedback?.length > 0 ? (
                    camp.feedback.map((fb, idx) => <FeedbackCard key={idx} feedback={fb} />)
                  ) : (
                    <p className="no-feedback">No feedback yet</p>
                  )}
                </div>
              </section>
            )}
          </div>

          <div className="sidebar-content">
            <div className="stats-card">
              <h3>Camp Statistics</h3>
              <div className="stat-row">
                <span>Registered</span>
                <strong>{camp.stats.registeredAttendees}</strong>
              </div>
              <div className="stat-row">
                <span>Expected</span>
                <strong>{camp.venue.expectedDonors}</strong>
              </div>
              {camp.stats.actualDonors > 0 && (
                <>
                  <div className="stat-row">
                    <span>Actual Donors</span>
                    <strong>{camp.stats.actualDonors}</strong>
                  </div>
                  <div className="stat-row">
                    <span>Units Collected</span>
                    <strong>{camp.stats.bloodUnitsCollected}</strong>
                  </div>
                </>
              )}
            </div>

            <div className="organizer-card">
              <h3>Organizer</h3>
              <p><strong>{camp.organizer.name}</strong></p>
              <p>{camp.organizer.type}</p>
              <p>📧 {camp.organizer.contactEmail}</p>
              <p>📞 {camp.organizer.contactPhone}</p>
            </div>

            <div className="action-buttons">
              {camp.lifecycle.status === 'Pre-Camp' && (
                <button onClick={handleAttendCamp} className="attend-btn">
                  Register to Attend
                </button>
              )}
              <button onClick={() => navigate('/organize-camp')} className="organize-btn-secondary">
                Organize Your Camp
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
