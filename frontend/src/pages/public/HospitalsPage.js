import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { hospitalAPI, geolocationHelper } from '../../services/communityApi';
import HospitalCard from '../../components/common/HospitalCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
import './HospitalsPage.css';

export default function HospitalsPage() {
  const navigate = useNavigate();
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('all');
  const [userLocation, setUserLocation] = useState(null);
  const [searchRadius, setSearchRadius] = useState(50);
  const [selectedHospital, setSelectedHospital] = useState(null);

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
        <h1>🏥 Hospitals</h1>
        <p>Find blood banks and donation centers near you</p>
      </header>

      <div className="action-bar">
        <button className={`btn-secondary ${viewMode === 'nearby' ? 'active' : ''}`} onClick={viewMode === 'nearby' ? fetchAllHospitals : fetchNearbyHospitals}>
          📍 {viewMode === 'nearby' ? 'Show All' : 'Find Nearby'}
        </button>
        {viewMode === 'nearby' && userLocation && (
          <select value={searchRadius} onChange={(e) => { setSearchRadius(Number(e.target.value)); fetchNearbyHospitals(); }}>
            <option value={10}>10 km</option>
            <option value={25}>25 km</option>
            <option value={50}>50 km</option>
            <option value={100}>100 km</option>
          </select>
        )}
      </div>

      <div className="hospitals-container">
        {loading && <LoadingSpinner message="Loading hospitals..." />}
        {error && !loading && <ErrorMessage message={error} onRetry={fetchAllHospitals} />}
        {!loading && !error && hospitals.length === 0 && (
          <EmptyState icon="🏥" title="No hospitals found" message="Try expanding your search radius" />
        )}
        {!loading && !error && hospitals.length > 0 && (
          <div className="hospitals-grid">
            {hospitals.map(hospital => (
              <HospitalCard
                key={hospital._id}
                hospital={hospital}
                onViewDetails={handleViewDetails}
                onBookAppointment={handleBookAppointment}
              />
            ))}
          </div>
        )}
      </div>

      {selectedHospital && (
        <div className="modal-overlay" onClick={() => setSelectedHospital(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedHospital.hospitalName}</h2>
              <button className="close-btn" onClick={() => setSelectedHospital(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="hospital-details">
                <p><strong>Address:</strong> {selectedHospital.address}, {selectedHospital.city}, {selectedHospital.state} - {selectedHospital.pincode}</p>
                <p><strong>Phone:</strong> {selectedHospital.phone}</p>
                <p><strong>Email:</strong> {selectedHospital.email}</p>
                {selectedHospital.emergencyContact && <p><strong>Emergency:</strong> {selectedHospital.emergencyContact}</p>}
                {selectedHospital.bloodBankAvailable && <p className="blood-bank-badge">✓ Blood Bank Available</p>}
              </div>
              <button className="btn-primary" onClick={() => { setSelectedHospital(null); handleBookAppointment(selectedHospital); }}>
                Book Appointment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
