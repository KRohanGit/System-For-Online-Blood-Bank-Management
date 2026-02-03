import React, { useState } from 'react';

const AddUnitForm = ({ onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    bloodGroup: '',
    storageType: 'Whole Blood',
    volume: 450,
    collectionDate: new Date().toISOString().split('T')[0],
    donorInfo: {
      donorId: '',
      name: '',
      contactNumber: ''
    },
    storageLocation: {
      fridgeId: '',
      rackNumber: '',
      shelfPosition: ''
    }
  });

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const storageTypes = ['Whole Blood', 'Packed RBC', 'Plasma', 'Platelets'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNestedChange = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value
      }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="add-unit-form">
      <div className="form-row">
        <div className="form-group">
          <label>Blood Group *</label>
          <select
            name="bloodGroup"
            value={formData.bloodGroup}
            onChange={handleChange}
            required
          >
            <option value="">Select Blood Group</option>
            {bloodGroups.map(group => (
              <option key={group} value={group}>{group}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Storage Type *</label>
          <select
            name="storageType"
            value={formData.storageType}
            onChange={handleChange}
            required
          >
            {storageTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Volume (ml) *</label>
          <input
            type="number"
            name="volume"
            value={formData.volume}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Collection Date *</label>
          <input
            type="date"
            name="collectionDate"
            value={formData.collectionDate}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <h4>Donor Information (Optional)</h4>
      <div className="form-row">
        <div className="form-group">
          <label>Donor ID</label>
          <input
            type="text"
            value={formData.donorInfo.donorId}
            onChange={(e) => handleNestedChange('donorInfo', 'donorId', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Donor Name</label>
          <input
            type="text"
            value={formData.donorInfo.name}
            onChange={(e) => handleNestedChange('donorInfo', 'name', e.target.value)}
          />
        </div>
      </div>

      <div className="form-group">
        <label>Contact Number</label>
        <input
          type="tel"
          value={formData.donorInfo.contactNumber}
          onChange={(e) => handleNestedChange('donorInfo', 'contactNumber', e.target.value)}
        />
      </div>

      <h4>Storage Location *</h4>
      <div className="form-row">
        <div className="form-group">
          <label>Fridge ID *</label>
          <input
            type="text"
            value={formData.storageLocation.fridgeId}
            onChange={(e) => handleNestedChange('storageLocation', 'fridgeId', e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Rack Number *</label>
          <input
            type="text"
            value={formData.storageLocation.rackNumber}
            onChange={(e) => handleNestedChange('storageLocation', 'rackNumber', e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Shelf Position *</label>
          <input
            type="text"
            value={formData.storageLocation.shelfPosition}
            onChange={(e) => handleNestedChange('storageLocation', 'shelfPosition', e.target.value)}
            required
          />
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn-cancel" onClick={onCancel} disabled={loading}>
          Cancel
        </button>
        <button type="submit" className="btn-submit" disabled={loading}>
          {loading ? 'Adding...' : 'Add Unit'}
        </button>
      </div>
    </form>
  );
};

export default AddUnitForm;
