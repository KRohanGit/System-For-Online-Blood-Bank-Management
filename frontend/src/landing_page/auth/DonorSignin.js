import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import './DonorSignin.css';

function DonorSignin() {
  const navigate = useNavigate();
  const formRef = useRef(null);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.form-container', 
        {
          y: 50,
          opacity: 0
        },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'power3.out'
        }
      );
    }, formRef);

    return () => ctx.revert();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = validateForm();

    if (Object.keys(newErrors).length === 0) {
      setIsSubmitting(true);
      console.log('Donor Signin Data:', formData);
      
      setTimeout(() => {
        setIsSubmitting(false);
        // Navigate to donor dashboard (to be created)
        navigate('/donor-dashboard');
      }, 1500);
    } else {
      setErrors(newErrors);
    }
  };

  return (
    <div className="auth-page donor-signin" ref={formRef}>
      <div className="auth-nav">
        <Link to="/signup" className="back-link">
          ← Back to Role Selection
        </Link>
      </div>

      <div className="form-container">
        <div className="form-header">
          <div className="role-icon">🩸</div>
          <h1>Donor Sign In</h1>
          <p>Access your donor account</p>
        </div>

        <div className="info-banner">
          <span className="info-icon">ℹ️</span>
          <div>
            <strong>Donor Account Access</strong>
            <p>
              Donor accounts are created by hospitals. If you don't have 
              credentials yet, please contact your hospital to set up an account.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? 'error' : ''}
              placeholder="donor@hospital.com"
              autoComplete="email"
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={errors.password ? 'error' : ''}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>

          <div className="form-options">
            <label className="remember-me">
              <input type="checkbox" />
              <span>Remember me</span>
            </label>
            <a href="#" className="forgot-password">Forgot password?</a>
          </div>

          <button 
            type="submit" 
            className="submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="help-section">
          <h3>Need Help?</h3>
          <div className="help-cards">
            <div className="help-card">
              <span className="help-icon">🏥</span>
              <div>
                <h4>Contact Your Hospital</h4>
                <p>Reach out to your hospital's blood bank to get your credentials</p>
              </div>
            </div>
            <div className="help-card">
              <span className="help-icon">📧</span>
              <div>
                <h4>Email Support</h4>
                <p>Contact us at <a href="mailto:support@lifelink.com">support@lifelink.com</a></p>
              </div>
            </div>
          </div>
        </div>

        <div className="role-switch">
          <p>Not a donor?</p>
          <div className="switch-buttons">
            <Link to="/auth/doctor" className="switch-btn">
              Sign Up as Doctor
            </Link>
            <Link to="/auth/hospital" className="switch-btn">
              Sign Up as Hospital
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DonorSignin;
