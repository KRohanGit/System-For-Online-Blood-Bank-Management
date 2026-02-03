import React from 'react';
import { useNavigate } from 'react-router-dom';
import './VerificationPending.css';

const VerificationPending = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('publicUserToken');
    localStorage.removeItem('publicUser');
    navigate('/public/login');
  };

  return (
    <div className="verification-pending-container">
      <div className="pending-card">
        <div className="icon-container">
          <span className="pending-icon">⏳</span>
        </div>

        <h2>Verification Pending</h2>
        
        <p className="message">
          Thank you for registering! Your account is currently under review by our admin team.
        </p>

        <div className="info-box">
          <h3>What happens next?</h3>
          <ul>
            <li>Admin will verify your identity documents</li>
            <li>This usually takes 24-48 hours</li>
            <li>You'll receive an email once verified</li>
            <li>After verification, you can access blood availability and news</li>
          </ul>
        </div>

        <div className="status-badge pending">
          Status: Pending Verification
        </div>

        <button className="btn-logout" onClick={handleLogout}>
          Logout
        </button>

        <p className="contact-info">
          Need help? Contact: support@lifelink.com
        </p>
      </div>
    </div>
  );
};

export default VerificationPending;
