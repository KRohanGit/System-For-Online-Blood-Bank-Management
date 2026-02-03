import React, { useState } from 'react';
import LocationInput from './LocationInput';
import BloodGroupSelector from './BloodGroupSelector';
import './CampForm.css';

export default function CampForm({ onSubmit, loading }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dateTime: '',
    duration: 4,
    capacity: 50,
    latitude: '',
    longitude: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    contactPhone: '',
    contactEmail: '',
    bloodGroupsNeeded: [],
    facilities: []
  });

  const handleLocationSelect = (location) => {
    setFormData({
      ...formData,
      latitude: location.latitude,
      longitude: location.longitude
    });
  };

  const handleBloodGroupsChange = (groups) => {
    setFormData({ ...formData, bloodGroupsNeeded: groups });
  };

  const handleFacilityToggle = (facility) => {
    const facilities = formData.facilities.includes(facility)
      ? formData.facilities.filter(f => f !== facility)
      : [...formData.facilities, facility];
    setFormData({ ...formData, facilities });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.latitude || !formData.longitude) {
      alert('Please select a location');
      return;
    }
    onSubmit(formData);
  };

  return (
    <form className="camp-form" onSubmit={handleSubmit}>
      <div className="form-section">
        <h3>Camp Details</h3>
        <input
          type="text"
          placeholder="Camp Title *"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
        <textarea
          placeholder="Description *"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={4}
          required
        />
        <div className="row">
          <input
            type="datetime-local"
            value={formData.dateTime}
            onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
            min={new Date().toISOString().slice(0, 16)}
            required
          />
          <input
            type="number"
            placeholder="Duration (hours)"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
            min="1"
            max="12"
          />
          <input
            type="number"
            placeholder="Capacity"
            value={formData.capacity}
            onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
            min="10"
            max="500"
          />
        </div>
      </div>

      <LocationInput onLocationSelect={handleLocationSelect} />

      <div className="form-section">
        <h3>Address</h3>
        <input
          type="text"
          placeholder="Street Address *"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          required
        />
        <div className="row">
          <input
            type="text"
            placeholder="City *"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="State *"
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Pincode *"
            value={formData.pincode}
            onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
            required
          />
        </div>
      </div>

      <BloodGroupSelector
        selected={formData.bloodGroupsNeeded}
        onChange={handleBloodGroupsChange}
      />

      <div className="form-section">
        <h3>Facilities Available</h3>
        <div className="facilities-grid">
          {['Refreshments', 'Medical Staff', 'AC Facility', 'Parking', 'Waiting Area', 'Certificate'].map(facility => (
            <label key={facility} className="facility-checkbox">
              <input
                type="checkbox"
                checked={formData.facilities.includes(facility)}
                onChange={() => handleFacilityToggle(facility)}
              />
              <span>{facility}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="form-section">
        <h3>Contact Information</h3>
        <input
          type="email"
          placeholder="Contact Email *"
          value={formData.contactEmail}
          onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
          required
        />
        <input
          type="tel"
          placeholder="Contact Phone *"
          value={formData.contactPhone}
          onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
          required
        />
      </div>

      <button type="submit" className="btn-submit" disabled={loading}>
        {loading ? 'Organizing...' : 'Organize Camp'}
      </button>
    </form>
  );
}
