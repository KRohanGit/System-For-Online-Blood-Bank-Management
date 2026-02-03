import React from 'react';

export default function VenueDetailsForm({ formData, setFormData }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      venue: { ...prev.venue, [name]: value }
    }));
  };

  return (
    <div className="form-section">
      <h3>Venue & Capacity</h3>
      
      <div className="form-group">
        <label>Venue Name *</label>
        <input
          type="text"
          name="name"
          value={formData.venue.name}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label>Address *</label>
        <textarea
          name="address"
          value={formData.venue.address}
          onChange={handleChange}
          rows="2"
          required
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>City *</label>
          <input type="text" name="city" value={formData.venue.city} onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label>State *</label>
          <input type="text" name="state" value={formData.venue.state} onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label>Pincode *</label>
          <input type="text" name="pincode" value={formData.venue.pincode} onChange={handleChange} required />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Latitude *</label>
          <input
            type="number"
            step="any"
            name="latitude"
            value={formData.venue.latitude}
            onChange={(e) => setFormData(prev => ({ ...prev, venue: { ...prev.venue, latitude: e.target.value }}))}
            required
          />
        </div>

        <div className="form-group">
          <label>Longitude *</label>
          <input
            type="number"
            step="any"
            name="longitude"
            value={formData.venue.longitude}
            onChange={(e) => setFormData(prev => ({ ...prev, venue: { ...prev.venue, longitude: e.target.value }}))}
            required
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Venue Type *</label>
          <select name="type" value={formData.venue.type} onChange={handleChange} required>
            <option value="">Select Type</option>
            <option value="Indoor">Indoor</option>
            <option value="Outdoor">Outdoor</option>
          </select>
        </div>

        <div className="form-group">
          <label>Seating Capacity *</label>
          <input
            type="number"
            name="seatingCapacity"
            value={formData.venue.seatingCapacity}
            onChange={handleChange}
            min="10"
            required
          />
        </div>

        <div className="form-group">
          <label>Expected Donors *</label>
          <input
            type="number"
            name="expectedDonors"
            value={formData.venue.expectedDonors}
            onChange={handleChange}
            min="5"
            required
          />
        </div>
      </div>
    </div>
  );
}
