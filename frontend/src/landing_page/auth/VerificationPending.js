import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import './VerificationPending.css';

function VerificationPending() {
  const containerRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.verification-card', 
        {
          scale: 0.8,
          opacity: 0
        },
        {
          scale: 1,
          opacity: 1,
          duration: 0.8,
          ease: 'back.out(1.7)'
        }
      );

      gsap.fromTo('.check-icon', 
        {
          scale: 0,
          opacity: 0
        },
        {
          scale: 1,
          opacity: 1,
          duration: 0.6,
          delay: 0.5,
          ease: 'elastic.out(1, 0.5)'
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className="verification-page" ref={containerRef}>
      <div className="verification-card">
        <div className="check-icon">✓</div>
        <h1>Application Submitted!</h1>
        <p className="main-message">
          Your registration has been received and is under review.
        </p>

        <div className="timeline">
          <div className="timeline-item completed">
            <div className="timeline-icon">📝</div>
            <div className="timeline-content">
              <h3>Application Submitted</h3>
              <p>Your information has been received</p>
            </div>
          </div>

          <div className="timeline-item active">
            <div className="timeline-icon">🔍</div>
            <div className="timeline-content">
              <h3>Under Review</h3>
              <p>Our team is verifying your documents</p>
            </div>
          </div>

          <div className="timeline-item">
            <div className="timeline-icon">✉️</div>
            <div className="timeline-content">
              <h3>Notification</h3>
              <p>You'll receive an email once approved</p>
            </div>
          </div>
        </div>

        <div className="info-box">
          <h3>What happens next?</h3>
          <ul>
            <li>Our verification team will review your documents within 24-48 hours</li>
            <li>You'll receive an email notification once your account is approved</li>
            <li>After approval, you can sign in and access your dashboard</li>
            <li>If we need additional information, we'll contact you via email</li>
          </ul>
        </div>

        <div className="action-buttons">
          <Link to="/" className="btn-primary">
            Back to Home
          </Link>
          <Link to="/support" className="btn-secondary">
            Contact Support
          </Link>
        </div>

        <div className="help-text">
          <p>
            Questions? Email us at{' '}
            <a href="mailto:verification@lifelink.com">verification@lifelink.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default VerificationPending;
