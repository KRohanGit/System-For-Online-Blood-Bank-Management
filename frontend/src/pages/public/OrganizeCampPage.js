import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CampForm from '../../components/common/CampForm';
import { communityAPI } from '../../services/communityApi';
import './OrganizeCampPage.css';

export default function OrganizeCampPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
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
      
      await communityAPI.createPost({
        title: formData.title,
        content: formData.description,
        type: 'announcement',
        bloodGroup: formData.bloodGroupsNeeded?.[0] || 'Any',
        urgency: 'medium',
        location: {
          type: 'Point',
          coordinates: [formData.longitude, formData.latitude],
          address: formData.address,
          city: formData.city,
          state: formData.state
        },
        contactInfo: {
          phone: formData.contactPhone,
          email: formData.contactEmail
        }
      });
      
      alert('Camp organized successfully!');
      navigate('/community');
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
