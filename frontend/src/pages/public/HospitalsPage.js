import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { hospitalAPI, geolocationHelper } from '../../services/communityApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
import './HospitalsPage.css';

export default function HospitalsPage() {
  const navigate = useNavigate();
  const [hospitals, setHospitals] = useState([]);
  const [filteredHospitals, setFilteredHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('all');
  const [userLocation, setUserLocation] = useState(null);
  const [searchRadius, setSearchRadius] = useState(50);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [hospitalCamps, setHospitalCamps] = useState([]);
  const [loadingCamps, setLoadingCamps] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', label: 'All Hospitals', icon: '🏥', color: '#3498db' },
    { id: 'bloodBank', label: 'Blood Banks', icon: '🩸', color: '#e74c3c' },
    { id: 'emergency', label: 'Emergency', icon: '🚨', color: '#f39c12' },
    { id: 'verified', label: 'Verified', icon: '✓', color: '#27ae60' }
  ];

  useEffect(() => {
    fetchAllHospitals();
  }, []);

  useEffect(() => {
    filterHospitals();
  }, [searchQuery, selectedCategory, hospitals]);

  const filterHospitals = () => {
    let filtered = [...hospitals];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(h => 
        h.hospitalName?.toLowerCase().includes(query) ||
        h.city?.toLowerCase().includes(query) ||
        h.state?.toLowerCase().includes(query) ||
        h.address?.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'bloodBank') {
        filtered = filtered.filter(h => h.bloodBankAvailable);
      } else if (selectedCategory === 'emergency') {
        filtered = filtered.filter(h => h.emergencySupport);
      } else if (selectedCategory === 'verified') {
        filtered = filtered.filter(h => h.verificationStatus === 'approved');
      }
    }

    setFilteredHospitals(filtered);
  };

  useEffect(() => {
    fetchAllHospitals();
  }, []);

  const fetchAllHospitals = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await hospitalAPI.getAllHospitals({ approved: true });
      setHospitals(response.data.hospitals || []);
      setViewMode('all');
    } catch (err) {
      setError(err.message || 'Failed to load hospitals');
    } finally {
      setLoading(false);
    }
  };

  const fetchNearbyHospitals = async () => {
    try {
      setLoading(true);
      setError(null);
      const location = await geolocationHelper.getCurrentLocation();
      setUserLocation(location);
      const response = await hospitalAPI.getNearbyHospitals(location.longitude, location.latitude, searchRadius);
      setHospitals(response.data.hospitals || []);
      setViewMode('nearby');
    } catch (err) {
      setError(err.message || 'Failed to load nearby hospitals');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (hospital) => {
    setSelectedHospital(hospital);
  };

  useEffect(() => {
    const fetchCamps = async () => {
      if (!selectedHospital?._id) {
        setHospitalCamps([]);
        return;
      }
      try {
        setLoadingCamps(true);
        const resp = await hospitalAPI.getCampsByHospital(selectedHospital._id);
        const camps = resp.data?.data?.camps || resp.data?.camps || [];
        setHospitalCamps(camps);
      } catch (err) {
        console.error('Failed to load hospital camps', err);
        setHospitalCamps([]);
      } finally {
        setLoadingCamps(false);
      }
    };

    fetchCamps();
  }, [selectedHospital]);

  const handleBookAppointment = (hospital) => {
    const isLoggedIn = !!localStorage.getItem('token');
    if (!isLoggedIn) {
      alert('Please login to book an appointment');
      navigate('/signin/public-user');
      return;
    }
    navigate('/appointments/book', { state: { hospital } });
  };

  return (
    <div className="hospitals-page">
      <header className="hospitals-header">
        <button className="back-button" onClick={() => navigate(-1)}>← Back</button>
        <div className="header-content">
          <h1>🏥 Hospital Directory</h1>
          <p>Comprehensive directory of registered blood banks and hospitals</p>
        </div>
      </header>

      {/* Search and Filters */}
      <div className="controls-section">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by hospital name, city, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button className="clear-btn" onClick={() => setSearchQuery('')}>×</button>
          )}
        </div>

        <div className="category-filters">
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`category-btn ${selectedCategory === cat.id ? 'active' : ''}`}
              style={{ 
                borderColor: selectedCategory === cat.id ? cat.color : '#ddd',
                color: selectedCategory === cat.id ? cat.color : '#666'
              }}
              onClick={() => setSelectedCategory(cat.id)}
            >
              <span className="cat-icon">{cat.icon}</span>
              <span className="cat-label">{cat.label}</span>
            </button>
          ))}
        </div>

        <div className="view-toggle">
          <button 
            className={`view-btn ${viewMode === 'all' ? 'active' : ''}`}
            onClick={fetchAllHospitals}
          >
            📋 All ({hospitals.length})
          </button>
          <button 
            className={`view-btn ${viewMode === 'nearby' ? 'active' : ''}`}
            onClick={fetchNearbyHospitals}
          >
            📍 Nearby
          </button>
          {viewMode === 'nearby' && (
            <select 
              value={searchRadius} 
              onChange={(e) => { setSearchRadius(Number(e.target.value)); fetchNearbyHospitals(); }}
              className="radius-select"
            >
              <option value={10}>10 km</option>
              <option value={25}>25 km</option>
              <option value={50}>50 km</option>
              <option value={100}>100 km</option>
            </select>
          )}
        </div>
      </div>

      {/* Results Count */}
      {!loading && !error && (
        <div className="results-info">
          <span className="results-count">
            {filteredHospitals.length} {filteredHospitals.length === 1 ? 'hospital' : 'hospitals'} found
          </span>
          {searchQuery && (
            <span className="search-query">for "{searchQuery}"</span>
          )}
        </div>
      )}

      {/* Hospitals List */}
      <div className="hospitals-container">
        {loading && <LoadingSpinner message="Loading hospitals..." />}
        {error && !loading && <ErrorMessage message={error} onRetry={fetchAllHospitals} />}
        {!loading && !error && filteredHospitals.length === 0 && (
          <EmptyState 
            icon="🏥" 
            title="No hospitals found" 
            message={searchQuery ? "Try adjusting your search" : "Try expanding your search radius"} 
          />
        )}
        {!loading && !error && filteredHospitals.length > 0 && (
          <div className="hospitals-directory">
            {filteredHospitals.map(hospital => (
              <div key={hospital._id} className="hospital-card-dir">
                <div className="hospital-card-header">
                  <div className="hospital-info">
                    <h3 className="hospital-name">{hospital.hospitalName || 'Unnamed Hospital'}</h3>
                    <div className="hospital-badges">
                      {hospital.bloodBankAvailable && <span className="badge blood-bank">🩸 Blood Bank</span>}
                      {hospital.emergencySupport && <span className="badge emergency">🚨 Emergency</span>}
                      {hospital.verificationStatus === 'approved' && <span className="badge verified">✓ Verified</span>}
                    </div>
                  </div>
                  <button 
                    className="details-btn"
                    onClick={() => setSelectedHospital(hospital)}
                  >
                    View Details
                  </button>
                </div>
                <div className="hospital-card-body">
                  <div className="info-row">
                    <span className="info-icon">📍</span>
                    <span className="info-text">
                      {hospital.address && hospital.city 
                        ? `${hospital.address}, ${hospital.city}${hospital.state ? `, ${hospital.state}` : ''}`
                        : hospital.city || hospital.state || 'Location not available'}
                    </span>
                  </div>
                  {hospital.phone && (
                    <div className="info-row">
                      <span className="info-icon">📞</span>
                      <span className="info-text">{hospital.phone}</span>
                    </div>
                  )}
                  {hospital.email && (
                    <div className="info-row">
                      <span className="info-icon">✉️</span>
                      <span className="info-text">{hospital.email}</span>
                    </div>
                  )}
                  {hospital.distance && (
                    <div className="info-row distance">
                      <span className="info-icon">🗺️</span>
                      <span className="info-text">{hospital.distance.toFixed(1)} km away</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hospital Details Modal */}
      {selectedHospital && (
        <div className="modal-overlay" onClick={() => setSelectedHospital(null)}>
          <div className="modal-content hospital-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedHospital.hospitalName || 'Hospital Details'}</h2>
              <button className="close-btn" onClick={() => setSelectedHospital(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="hospital-details">
                <div className="detail-section">
                  <h4>📍 Location</h4>
                  <p>{selectedHospital.address}, {selectedHospital.city}, {selectedHospital.state} - {selectedHospital.pincode || 'N/A'}</p>
                </div>
                <div className="detail-section">
                  <h4>📞 Contact</h4>
                  <p><strong>Phone:</strong> {selectedHospital.phone || 'Not available'}</p>
                  <p><strong>Email:</strong> {selectedHospital.email || 'Not available'}</p>
                  {selectedHospital.emergencyContact && (
                    <p><strong>Emergency:</strong> {selectedHospital.emergencyContact}</p>
                  )}
                </div>
                <div className="detail-section">
                  <h4>🏥 Services</h4>
                  <div className="services-list">
                    {selectedHospital.bloodBankAvailable && <span className="service-tag">Blood Bank Available</span>}
                    {selectedHospital.emergencySupport && <span className="service-tag">24/7 Emergency</span>}
                    {selectedHospital.verificationStatus === 'approved' && <span className="service-tag">Verified Hospital</span>}
                  </div>
                </div>
              </div>
              <div className="hospital-camps-section">
                <h4>🗓️ Upcoming Camps</h4>
                {loadingCamps && <div>Loading camps...</div>}
                {!loadingCamps && hospitalCamps.length === 0 && (
                  <div className="no-camps">No upcoming camps for this hospital</div>
                )}
                {!loadingCamps && hospitalCamps.length > 0 && (
                  <ul className="camp-list">
                    {hospitalCamps.map(c => (
                      <li key={c._id} className="camp-item">
                        <strong>{c.campName || c.title || c.name || 'Camp'}</strong>
                        <div className="camp-meta">
                          <span>{(c.schedule?.date && new Date(c.schedule.date).toLocaleDateString()) || (c.dateTime && new Date(c.dateTime).toLocaleDateString())}</span>
                          <span> • {c.venue?.name || c.venueName || 'Venue'}</span>
                          <span> • {c.stats?.registeredAttendees ?? c.registeredAttendees ?? 0} registered</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setSelectedHospital(null)}>Close</button>
                <button 
                  className="btn-primary" 
                  onClick={() => {
                    const isLoggedIn = !!localStorage.getItem('token');
                    if (!isLoggedIn) {
                      alert('Please login to book an appointment');
                      navigate('/signin/public-user');
                      return;
                    }
                    navigate('/appointments/book', { state: { hospital: selectedHospital } });
                  }}
                >
                  Book Appointment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
