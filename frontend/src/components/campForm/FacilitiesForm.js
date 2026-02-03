import React from 'react';

export default function FacilitiesForm({ formData, setFormData }) {
  const handleCheckbox = (name) => {
    setFormData(prev => ({
      ...prev,
      facilities: { ...prev.facilities, [name]: !prev.facilities[name] }
    }));
  };

  return (
    <div className="form-section">
      <h3>Facility Checklist (Self-Declared)</h3>
      
      <div className="checkbox-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={formData.facilities.hygieneSanitation}
            onChange={() => handleCheckbox('hygieneSanitation')}
          />
          <span>Hygiene and Sanitation</span>
        </label>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={formData.facilities.powerSupply}
            onChange={() => handleCheckbox('powerSupply')}
          />
          <span>Power Supply</span>
        </label>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={formData.facilities.screeningArea}
            onChange={() => handleCheckbox('screeningArea')}
          />
          <span>Screening Area</span>
        </label>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={formData.facilities.waitingRefreshmentArea}
            onChange={() => handleCheckbox('waitingRefreshmentArea')}
          />
          <span>Waiting & Refreshment Area</span>
        </label>
      </div>
    </div>
  );
}
