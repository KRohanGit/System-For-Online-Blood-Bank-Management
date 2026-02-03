import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { authAPI, auth } from '../../services/api';
import './DoctorSignup.css';

function DoctorSignup() {
  const navigate = useNavigate();
  const formRef = useRef(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    hospitalName: '',
    certificate: null
  });
  const [fileName, setFileName] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.form-container', 
        {
          y: 30,
          opacity: 0
        },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: 'power2.out',
          delay: 0.1
        }
      );
    }, formRef);

    return () => ctx.revert();
  }, []);

  const validateFile = (file) => {
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const maxSize = 2 * 1024 * 1024; // 2MB

    if (!validTypes.includes(file.type)) {
      return 'Please upload a PDF, JPG, or PNG file';
    }
    if (file.size > maxSize) {
      return 'File size must be less than 2MB';
    }
    return null;
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const error = validateFile(file);
      if (error) {
        setErrors({ ...errors, certificate: error });
        setFileName('');
        setFormData({ ...formData, certificate: null });
      } else {
        setErrors({ ...errors, certificate: null });
        setFileName(file.name);
        setFormData({ ...formData, certificate: file });
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Clear error when user starts typing
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
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.name) {
      newErrors.name = 'Name is required';
    }

    if (!formData.hospitalName) {
      newErrors.hospitalName = 'Hospital name is required';
    }

    if (!formData.certificate) {
      newErrors.certificate = 'Medical certificate is required';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();

    if (Object.keys(newErrors).length === 0) {
      setIsSubmitting(true);
      setApiError('');
      setSuccessMessage('');
      
      try {
        const response = await authAPI.registerDoctor(formData);
        
        // Save token
        if (response.data && response.data.token) {
          auth.setToken(response.data.token);
        }
        
        setSuccessMessage(response.message || 'Registration successful!');
        
        // Navigate to verification pending page after a short delay
        setTimeout(() => {
          navigate('/verification-pending', { 
            state: { 
              email: formData.email,
              name: formData.name,
              role: 'doctor'
            } 
          });
        }, 1500);
      } catch (error) {
        setApiError(error.message || 'Registration failed. Please try again.');
        console.error('Registration error:', error);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setErrors(newErrors);
    }
  };

  return (
    <div className="auth-page doctor-signup" ref={formRef}>
      <div className="auth-nav">
        <Link to="/signup" className="back-link">
          ← Back to Role Selection
        </Link>
        <div className="signin-link">
          Already have an account? <Link to="/signin">Sign In</Link>
        </div>
      </div>

      <div className="form-container">
        <div className="form-header">
          <div className="role-icon">🧑‍⚕️</div>
          <h1>Doctor Registration</h1>
          <p>Register as a verified medical professional</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {apiError && (
            <div className="alert alert-error">
              ❌ {apiError}
            </div>
          )}
          {successMessage && (
            <div className="alert alert-success">
              ✅ {successMessage}
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="name">Full Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={errors.name ? 'error' : ''}
              placeholder="Dr. John Smith"
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
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
              placeholder="doctor@hospital.com"
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="hospitalName">Hospital Name *</label>
            <input
              type="text"
              id="hospitalName"
              name="hospitalName"
              value={formData.hospitalName}
              onChange={handleChange}
              className={errors.hospitalName ? 'error' : ''}
              placeholder="City General Hospital"
            />
            {errors.hospitalName && <span className="error-message">{errors.hospitalName}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">Password *</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={errors.password ? 'error' : ''}
                placeholder="Minimum 8 characters"
              />
              {errors.password && <span className="error-message">{errors.password}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password *</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={errors.confirmPassword ? 'error' : ''}
                placeholder="Re-enter password"
              />
              {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
            </div>
          </div>

          <div className="form-group file-upload-group">
            <label>Medical Certificate * (PDF, JPG, PNG - Max 2MB)</label>
            <div className="file-upload-wrapper">
              <input
                type="file"
                id="certificate"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="file-input"
              />
              <label htmlFor="certificate" className="file-label">
                <span className="upload-icon">📎</span>
                <span className="upload-text">
                  {fileName || 'Choose file or drag here'}
                </span>
              </label>
            </div>
            {fileName && (
              <div className="file-preview">
                <span className="file-icon">📄</span>
                <span className="file-name">{fileName}</span>
              </div>
            )}
            {errors.certificate && <span className="error-message">{errors.certificate}</span>}
          </div>

          <div className="info-note">
            <strong>📋 Note:</strong> Your account will be pending verification until 
            your medical certificate is reviewed by our team. You'll receive an email 
            once approved.
          </div>

          <button 
            type="submit" 
            className="submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Create Account'}
          </button>
        </form>

        <div className="form-footer">
          <p>
            By signing up, you agree to our{' '}
            <a href="#">Terms of Service</a> and{' '}
            <a href="#">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default DoctorSignup;
