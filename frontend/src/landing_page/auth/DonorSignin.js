import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import axiosInstance from '../../services/axiosInstance';
import './DonorSignin.css';

function DonorSignin() {
  const navigate = useNavigate();
  const formRef = useRef(null);
  const [loginMode, setLoginMode] = useState('password'); // 'password' or 'otp'
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    otp: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

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

    if (loginMode === 'password') {
      if (!formData.password) {
        newErrors.password = 'Password is required';
      }
    } else {
      if (!formData.otp) {
        newErrors.otp = 'OTP is required';
      } else if (!/^\d{6}$/.test(formData.otp)) {
        newErrors.otp = 'OTP must be 6 digits';
      }
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();

    if (Object.keys(newErrors).length === 0) {
      setIsSubmitting(true);
      setApiError('');
      
      try {
        let response;
        if (loginMode === 'password') {
          response = await axiosInstance.post('/donor-auth/login/password', {
            email: formData.email,
            password: formData.password
          });
        } else {
          response = await axiosInstance.post('/donor-auth/login/otp', {
            email: formData.email,
            otp: formData.otp
          });
        }

        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data.donor));

        if (response.data.data.mustChangePassword) {
          navigate('/donor/change-password');
        } else {
          navigate('/donor/dashboard');
        }
      } catch (error) {
        setApiError(error.response?.data?.message || error.message || 'Login failed. Please check your credentials.');
      } finally {
        setIsSubmitting(false);
      }
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
          {apiError && (
            <div className="alert alert-error" style={{color: '#dc3545', background: '#f8d7da', padding: '10px', borderRadius: '6px', marginBottom: '15px'}}>
              {apiError}
            </div>
          )}

          {/* Login Mode Tabs */}
          <div style={{ display: 'flex', gap: '0', marginBottom: '20px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <button
              type="button"
              onClick={() => { setLoginMode('password'); setApiError(''); setErrors({}); }}
              style={{
                flex: 1, padding: '10px', border: 'none', cursor: 'pointer',
                background: loginMode === 'password' ? '#e53e3e' : '#f7fafc',
                color: loginMode === 'password' ? 'white' : '#4a5568',
                fontWeight: '600', fontSize: '14px'
              }}
            >
              🔑 Password Login
            </button>
            <button
              type="button"
              onClick={() => { setLoginMode('otp'); setApiError(''); setErrors({}); }}
              style={{
                flex: 1, padding: '10px', border: 'none', cursor: 'pointer',
                background: loginMode === 'otp' ? '#e53e3e' : '#f7fafc',
                color: loginMode === 'otp' ? 'white' : '#4a5568',
                fontWeight: '600', fontSize: '14px'
              }}
            >
              📱 OTP Login
            </button>
          </div>

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

          {loginMode === 'password' ? (
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
          ) : (
            <div className="form-group">
              <label htmlFor="otp">One-Time Password (OTP) *</label>
              <input
                type="text"
                id="otp"
                name="otp"
                value={formData.otp}
                onChange={handleChange}
                className={errors.otp ? 'error' : ''}
                placeholder="Enter 6-digit OTP"
                maxLength="6"
                style={{ letterSpacing: '8px', fontSize: '20px', textAlign: 'center' }}
              />
              {errors.otp && <span className="error-message">{errors.otp}</span>}
              <p style={{ fontSize: '12px', color: '#718096', marginTop: '5px' }}>
                Enter the OTP sent to your email by the hospital
              </p>
            </div>
          )}

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
