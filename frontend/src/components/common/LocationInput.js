import React, { useState } from 'react';
import { geolocationHelper } from '../../services/communityApi';
import './LocationInput.css';

export default function LocationInput({ onLocationSelect }) {
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);

  const handleGetLocation = async () => {
    try {
      setLoading(true);
      const loc = await geolocationHelper.getCurrentLocation();
      setLocation(loc);
      onLocationSelect(loc);
    } catch (err) {
      alert('Failed to get location. Please enable location access.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="location-input">
      <h3>Location</h3>
      <button type="button" onClick={handleGetLocation} className="btn-location" disabled={loading}>
        {loading ? '📍 Getting Location...' : location ? '✓ Location Captured' : '📍 Get Current Location'}
      </button>
      {location && (
        <div className="location-display">
          <p>Latitude: {location.latitude.toFixed(6)}</p>
          <p>Longitude: {location.longitude.toFixed(6)}</p>
        </div>
      )}
    </div>
  );
}
