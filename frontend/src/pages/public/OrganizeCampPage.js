import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import CampForm from '../../components/common/CampForm';
import './OrganizeCampPage.css';

export default function OrganizeCampPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login to organize a camp');
      navigate('/signin/public-user');
    } else {
      setIsAuthenticated(true);
    }
  }, [navigate]);
  
  if (!isAuthenticated) {
    return null;
  }

  const handleSubmit = async (formData) => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/blood-camps`, {
        name: formData.title,
        description: formData.description,
        date: formData.date,
        venue: {
          name: formData.venueName || formData.title,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          coordinates: formData.longitude && formData.latitude 
            ? { type: 'Point', coordinates: [parseFloat(formData.longitude), parseFloat(formData.latitude)] }
            : undefined
        },
        bloodGroupsNeeded: formData.bloodGroupsNeeded || ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
        totalSlots: formData.totalSlots || 50,
        contactPhone: formData.contactPhone,
        contactEmail: formData.contactEmail
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Blood camp organized successfully!');
      navigate('/blood-camps');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to organize camp');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="organize-camp-page">
      <header className="page-header">
        <button className="back-button" onClick={() => navigate(-1)}>← Back</button>
        <h1>Organize Blood Camp</h1>
        <p>Host a blood donation drive in your community</p>
      </header>
      
      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}
      
      <CampForm onSubmit={handleSubmit} loading={loading} />
    </div>
  );
}
