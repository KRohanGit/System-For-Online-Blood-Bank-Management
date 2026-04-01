import React, { useState } from 'react';
import './TransferForm.css';

const TransferForm = ({ unitId, onComplete }) => {
  const [formData, setFormData] = useState({
    facility: '',
    facilityName: '',
    metadata: {
      transportMethod: 'courier',
      specialHandling: '',
      temperature: '4'
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const facilityOptions = [
    { id: 'hospital', name: 'Hospital' },
    { id: 'blood_bank', name: 'Blood Bank' },
    { id: 'testing_lab', name: 'Testing Laboratory' },
    { id: 'distribution', name: 'Distribution Center' }
  ];

  const transportMethods = [
    { value: 'courier', label: 'Courier Service' },
    { value: 'ambulance', label: 'Ambulance' },
    { value: 'direct', label: 'Direct Transfer' },
    { value: 'cold_chain', label: 'Cold Chain Van' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMetadataChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        [name]: value
      }
    }));
  };

  const handleFacilitySelect = (e) => {
    const selected = facilityOptions.find(f => f.id === e.target.value);
    setFormData(prev => ({
      ...prev,
      facility: selected.id,
      facilityName: selected.name
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      if (!formData.facility) {
        throw new Error('Please select a facility type');
      }
      if (!formData.facilityName) {
        throw new Error('Please enter the facility name');
      }

      await onComplete(formData);
      setSuccess(true);
      setFormData({
        facility: '',
        facilityName: '',
        metadata: {
          transportMethod: 'courier',
          specialHandling: '',
          temperature: '4'
        }
      });
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to record transfer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="transfer-form-container">
      <h3>Record Blood Unit Transfer</h3>
      
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">Transfer recorded successfully!</div>}

      <form onSubmit={handleSubmit} className="transfer-form">
        <div className="form-section">
          <h4>Transfer Details</h4>

          <div className="form-group">
            <label htmlFor="facility">Facility Type *</label>
            <select
              id="facility"
              name="facility"
              value={formData.facility}
              onChange={handleFacilitySelect}
              required
              disabled={loading}
            >
              <option value="">Select facility type...</option>
              {facilityOptions.map(option => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="facilityName">Facility Name *</label>
            <input
              id="facilityName"
              type="text"
              name="facilityName"
              placeholder="e.g., Apollo Hospital, Blood Bank A"
              value={formData.facilityName}
              onChange={handleInputChange}
              required
              disabled={loading}
            />
          </div>
        </div>

        <div className="form-section">
          <h4>Transport Details</h4>

          <div className="form-group">
            <label htmlFor="transportMethod">Transport Method *</label>
            <select
              id="transportMethod"
              name="transportMethod"
              value={formData.metadata.transportMethod}
              onChange={handleMetadataChange}
              disabled={loading}
            >
              {transportMethods.map(method => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="temperature">Storage Temperature (°C)</label>
            <input
              id="temperature"
              type="number"
              name="temperature"
              min="-40"
              max="25"
              step="0.5"
              value={formData.metadata.temperature}
              onChange={handleMetadataChange}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="specialHandling">Special Handling Instructions</label>
            <textarea
              id="specialHandling"
              name="specialHandling"
              rows="3"
              placeholder="Any special handling requirements..."
              value={formData.metadata.specialHandling}
              onChange={handleMetadataChange}
              disabled={loading}
            />
          </div>
        </div>

        <div className="form-actions">
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Recording Transfer...' : 'Record Transfer'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TransferForm;
