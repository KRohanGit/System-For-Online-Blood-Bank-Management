import React from 'react';

export default function ScheduleForm({ formData, setFormData }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      schedule: { ...prev.schedule, [name]: value }
    }));
  };

  return (
    <div className="form-section">
      <h3>Camp Schedule</h3>
      
      <div className="form-group">
        <label>Camp Name *</label>
        <input
          type="text"
          name="campName"
          value={formData.campName}
          onChange={(e) => setFormData(prev => ({ ...prev, campName: e.target.value }))}
          required
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Date *</label>
          <input
            type="date"
            name="date"
            value={formData.schedule.date}
            onChange={handleChange}
            min={new Date().toISOString().split('T')[0]}
            required
          />
        </div>

        <div className="form-group">
          <label>Start Time *</label>
          <input type="time" name="startTime" value={formData.schedule.startTime} onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label>End Time *</label>
          <input type="time" name="endTime" value={formData.schedule.endTime} onChange={handleChange} required />
        </div>
      </div>

      <div className="form-group">
        <label>Category *</label>
        <select name="category" value={formData.schedule.category} onChange={handleChange} required>
          <option value="">Select Category</option>
          <option value="Voluntary">Voluntary</option>
          <option value="Corporate">Corporate</option>
          <option value="College">College</option>
          <option value="Community">Community</option>
        </select>
      </div>

      <div className="form-group">
        <label>Description *</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows="4"
          required
        />
      </div>
    </div>
  );
}
