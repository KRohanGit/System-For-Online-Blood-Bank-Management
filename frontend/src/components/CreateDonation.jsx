import React, { useState } from 'react';
import axios from 'axios';

const CreateDonation = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    donorId: '',
    bloodGroup: '',
    units: 1
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/donations/create`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage('Donation created successfully');
      setFormData({ donorId: '', bloodGroup: '', units: 1 });
      if (onSuccess) onSuccess();
      setLoading(false);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to create donation');
      setLoading(false);
    }
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: '20px', marginBottom: '20px' }}>
      <h3>Create New Donation</h3>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Donor ID</label>
          <input
            type="text"
            name="donorId"
            value={formData.donorId}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Blood Group</label>
          <select
            name="bloodGroup"
            value={formData.bloodGroup}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '8px' }}
          >
            <option value="">Select</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Units</label>
          <input
            type="number"
            name="units"
            value={formData.units}
            onChange={handleChange}
            min="1"
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        {message && (
          <div style={{ marginBottom: '15px' }}>{message}</div>
        )}

        <button type="submit" disabled={loading} style={{ padding: '10px 20px' }}>
          {loading ? 'Creating...' : 'Create Donation'}
        </button>
      </form>
    </div>
  );
};

export default CreateDonation;
