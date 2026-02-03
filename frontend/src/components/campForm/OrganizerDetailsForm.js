import React from 'react';

export default function OrganizerDetailsForm({ formData, setFormData }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      organizer: { ...prev.organizer, [name]: value }
    }));
  };

  return (
    <div className="form-section">
      <h3>Organizer Details</h3>
      
      <div className="form-group">
        <label>Organizer Name *</label>
        <input
          type="text"
          name="name"
          value={formData.organizer.name}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label>Organizer Type *</label>
        <select name="type" value={formData.organizer.type} onChange={handleChange} required>
          <option value="">Select Type</option>
          <option value="Hospital">Hospital</option>
          <option value="NGO">NGO</option>
          <option value="Institution">Institution</option>
          <option value="Individual">Individual</option>
        </select>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Contact Phone *</label>
          <input
            type="tel"
            name="contactPhone"
            value={formData.organizer.contactPhone}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Contact Email *</label>
          <input
            type="email"
            name="contactEmail"
            value={formData.organizer.contactEmail}
            onChange={handleChange}
            required
          />
        </div>
      </div>
    </div>
  );
}
