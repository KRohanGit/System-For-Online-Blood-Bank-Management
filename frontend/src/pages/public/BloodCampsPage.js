import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { bloodCampAPI, geolocationHelper } from '../../services/bloodCampApi';
import CampCard from '../../components/common/CampCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
import CampDetailsModal from '../../components/common/CampDetailsModal';
import './BloodCampsPage.css';

function BloodCampsPage() {
  const navigate = useNavigate();

  const [camps, setCamps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [searchRadius, setSearchRadius] = useState(50);
  const [viewMode, setViewMode] = useState('all'); // 'all' or 'nearby'
  const [selectedCamp, setSelectedCamp] = useState(null);
  const [showOrganizeModal, setShowOrganizeModal] = useState(false);
  
  // Check if user is logged in
  const isLoggedIn = !!localStorage.getItem('token');
  const userRole = localStorage.getItem('role');
  const isPublicUser = userRole === 'PUBLIC_USER';

  // Fetch all camps on component mount
  useEffect(() => {
    fetchAllCamps();
  }, []);

  /**
   * Fetch all upcoming camps
   */
  const fetchAllCamps = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await bloodCampAPI.getAllCamps({
        status: 'upcoming',
        sortBy: 'dateTime',
        sortOrder: 'asc'
      });
      setCamps(response.data.camps);
    } catch (err) {
      setError(err.message || 'Failed to load camps');
      console.error('Error fetching camps:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get user location and fetch nearby camps
   */
  const fetchNearbyCamps = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get user's location
      const location = await geolocationHelper.getCurrentLocation();
      setUserLocation(location);
      
      // Fetch nearby camps
      const response = await bloodCampAPI.getNearbyCamps(
        location.longitude,
        location.latitude,
        searchRadius
      );
      
      setCamps(response.data.camps);
      setViewMode('nearby');
    } catch (err) {
      if (err.message.includes('Geolocation')) {
        setError('Please enable location access to find nearby camps');
      } else {
        setError(err.message || 'Failed to load nearby camps');
      }
      console.error('Error fetching nearby camps:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Switch between all camps and nearby camps
   */
  const toggleViewMode = () => {
    if (viewMode === 'all') {
      fetchNearbyCamps();
    } else {
      setViewMode('all');
      fetchAllCamps();
    }
  };

  /**
   * Handle organize camp button click
   */
  const handleOrganizeCamp = () => {
    if (!isLoggedIn) {
      // Redirect to login with return URL
      localStorage.setItem('returnUrl', '/blood-camps/organize');
      alert('Please login as a Public User to organize a blood camp');
      navigate('/signin/public-user');
      return;
    }

    if (!isPublicUser) {
      alert('Only verified Public Users can organize blood camps');
      return;
    }

    // Navigate to organize camp page
    navigate('/blood-camps/organize');
  };

  /**
   * Handle book camp button click
   */
  const handleBookCamp = (campId) => {
    if (!isLoggedIn) {
      // Redirect to login with return URL
      localStorage.setItem('returnUrl', `/blood-camps/${campId}`);
      alert('Please login as a Public User to book a camp');
      navigate('/signin/public-user');
      return;
    }

    if (!isPublicUser) {
      alert('Only Public Users can book blood camps');
      return;
    }

    // Navigate to camp details page
    navigate(`/blood-camps/${campId}`);
  };

  /**
   * View camp details
   */
  const viewCampDetails = (camp) => {
    setSelectedCamp(camp);
  };

  return (
    <div className="blood-camps-page">
      {/* Header */}
      <header className="camps-header">
        <div className="header-content">
          <button 
            className="back-button" 
            onClick={() => navigate('/')}
          >
            ← Back to Home
          </button>
          <h1>🩸 Community Blood Camps</h1>
          <p>Join a blood donation camp near you and save lives</p>
        </div>
      </header>

      {/* Action Bar */}
      <div className="action-bar">
        <div className="action-buttons">
          <button 
            className="btn-primary organize-btn"
            onClick={handleOrganizeCamp}
          >
            + Organize a Camp
          </button>
          
          <button 
            className={`btn-secondary location-btn ${viewMode === 'nearby' ? 'active' : ''}`}
            onClick={toggleViewMode}
          >
            📍 {viewMode === 'nearby' ? 'Show All Camps' : 'Find Nearby Camps'}
          </button>

          {isPublicUser && (
            <button 
              className="btn-outline"
              onClick={() => navigate('/my-bookings')}
            >
              My Bookings
            </button>
          )}
        </div>

        {viewMode === 'nearby' && userLocation && (
          <div className="radius-selector">
            <label>Search Radius:</label>
            <select 
              value={searchRadius} 
              onChange={(e) => {
                setSearchRadius(Number(e.target.value));
                // Re-fetch with new radius
                if (userLocation) {
                  fetchNearbyCamps();
                }
              }}
            >
              <option value={10}>10 km</option>
              <option value={25}>25 km</option>
              <option value={50}>50 km</option>
              <option value={100}>100 km</option>
            </select>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="camps-container">
        {/* Loading State */}
        {loading && <LoadingSpinner message="Loading camps..." />}

        {/* Error State */}
        {error && !loading && (
          <ErrorMessage message={error} onRetry={fetchAllCamps} />
        )}

        {/* Empty State */}
        {!loading && !error && camps.length === 0 && (
          <EmptyState
            icon="🏥"
            title="No camps found"
            message={
              viewMode === 'nearby' 
                ? 'No blood camps found in your area. Try increasing the search radius or view all camps.'
                : 'No upcoming blood camps at the moment. Check back later or organize one!'
            }
            actionButton={viewMode === 'nearby' ? {
              text: 'View All Camps',
              onClick: fetchAllCamps
            } : null}
          />
        )}

        {/* Camps Grid */}
        {!loading && !error && camps.length > 0 && (
          <div className="camps-grid">
            {camps.map((camp) => (
              <CampCard
                key={camp._id}
                camp={camp}
                onViewDetails={viewCampDetails}
                onBook={handleBookCamp}
              />
            ))}
          </div>
        )}
      </div>

      {/* Camp Details Modal */}
      {selectedCamp && (
        <CampDetailsModal
          camp={selectedCamp}
          onClose={() => setSelectedCamp(null)}
          onBook={handleBookCamp}
        />
      )}
    </div>
  );
}

export default BloodCampsPage;