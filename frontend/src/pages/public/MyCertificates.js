import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './MyCertificates.css';

export default function MyCertificates() {
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/public/login');
      return;
    }

    // Simulate loading certificates
    setTimeout(() => {
      setCertificates([]);
      setLoading(false);
    }, 500);
  }, [navigate]);

  return (
    <div className="my-certificates-page">
      <header className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h1>My Donation Certificates</h1>
        <p>View and download your blood donation certificates</p>
      </header>

      <div className="certificates-container">
        {loading ? (
          <div className="loading">Loading certificates...</div>
        ) : certificates.length > 0 ? (
          <div className="certificates-grid">
            {certificates.map((cert, index) => (
              <div key={index} className="certificate-card">
                <div className="cert-icon">📜</div>
                <h3>{cert.title}</h3>
                <p>{cert.date}</p>
                <button className="download-btn">Download</button>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-certificates">
            <div className="empty-icon">📭</div>
            <h3>No Certificates Yet</h3>
            <p>Your donation certificates will appear here after you donate blood at camps</p>
            <button onClick={() => navigate('/blood-camps')} className="cta-btn">
              View Blood Camps
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
