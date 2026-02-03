import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { authAPI, auth } from '../../services/api';
import './HospitalSignup.css';

function HospitalSignup() {
  const navigate = useNavigate();
  const formRef = useRef(null);
  const [formData, setFormData] = useState({
    hospitalName: '',
    officialEmail: '',
    licenseNumber: '',
    adminName: '',
    adminEmail: '',
    password: '',
    confirmPassword: '',
    license: null
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
        setErrors({ ...errors, license: error });
        setFileName('');
        setFormData({ ...formData, license: null });
      } else {
        setErrors({ ...errors, license: null });
        setFileName(file.name);
        setFormData({ ...formData, license: file });
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.hospitalName) newErrors.hospitalName = 'Hospital name is required';
    
    if (!formData.officialEmail) {
      newErrors.officialEmail = 'Official email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.officialEmail)) {
      newErrors.officialEmail = 'Email is invalid';
    }

    if (!formData.licenseNumber) newErrors.licenseNumber = 'License number is required';
    if (!formData.adminName) newErrors.adminName = 'Admin name is required';
    
    if (!formData.adminEmail) {
      newErrors.adminEmail = 'Admin email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.adminEmail)) {
      newErrors.adminEmail = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.license) newErrors.license = 'Hospital license is required';

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('🔍 Form submitted with data:', {
      hospitalName: formData.hospitalName,
      adminEmail: formData.adminEmail,
      hasLicense: !!formData.license
    });
    
    const newErrors = validateForm();
    
    console.log('📋 Validation errors:', newErrors);

    if (Object.keys(newErrors).length === 0) {
      setIsSubmitting(true);
      setApiError('');
      setSuccessMessage('');
      
      try {
        console.log('🏥 Submitting hospital registration:', {
          hospitalName: formData.hospitalName,
          adminEmail: formData.adminEmail,
          licenseNumber: formData.licenseNumber
        });
        
        const response = await authAPI.registerHospital(formData);
        
        console.log('✅ Registration response:', response);
        
        // Save token
        if (response.data && response.data.token) {
          auth.setToken(response.data.token);
        }
        
        setSuccessMessage(response.message || 'Registration successful!');
        
        // Navigate to verification pending page
        setTimeout(() => {
          navigate('/verification-pending', { 
            state: { 
              email: formData.adminEmail,
              name: formData.hospitalName,
              role: 'hospital'
            } 
          });
        }, 1500);
      } catch (error) {
        console.error('❌ Registration error:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack
        });
        setApiError(error.message || 'Registration failed. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      console.log('❌ Form has validation errors:', newErrors);
      setErrors(newErrors);
    }
  };

  return (
    <div className="auth-page hospital-signup" ref={formRef}>
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
          <div className="role-icon">🏥</div>
          <h1>Hospital Registration</h1>
          <p>Register your hospital on LifeLink platform</p>
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
          
          <div className="form-section">
            <h3>Hospital Information</h3>
            
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
                <label htmlFor="officialEmail">Official Email *</label>
                <input
                  type="email"
                  id="officialEmail"
                  name="officialEmail"
                  value={formData.officialEmail}
                  onChange={handleChange}
                  className={errors.officialEmail ? 'error' : ''}
                  placeholder="info@hospital.com"
                />
                {errors.officialEmail && <span className="error-message">{errors.officialEmail}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="licenseNumber">License Number *</label>
                <input
                  type="text"
                  id="licenseNumber"
                  name="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={handleChange}
                  className={errors.licenseNumber ? 'error' : ''}
                  placeholder="LIC-123456"
                />
                {errors.licenseNumber && <span className="error-message">{errors.licenseNumber}</span>}
              </div>
            </div>

            <div className="form-group file-upload-group">
              <label>Hospital License * (PDF, JPG, PNG - Max 2MB)</label>
              <div className="file-upload-wrapper">
                <input
                  type="file"
                  id="license"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="file-input"
                />
                <label htmlFor="license" className="file-label">
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
              {errors.license && <span className="error-message">{errors.license}</span>}
            </div>
          </div>

          <div className="form-section">
            <h3>Admin Account</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="adminName">Admin Name *</label>
                <input
                  type="text"
                  id="adminName"
                  name="adminName"
                  value={formData.adminName}
                  onChange={handleChange}
                  className={errors.adminName ? 'error' : ''}
                  placeholder="John Smith"
                />
                {errors.adminName && <span className="error-message">{errors.adminName}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="adminEmail">Admin Email *</label>
                <input
                  type="email"
                  id="adminEmail"
                  name="adminEmail"
                  value={formData.adminEmail}
                  onChange={handleChange}
                  className={errors.adminEmail ? 'error' : ''}
                  placeholder="admin@hospital.com"
                />
                {errors.adminEmail && <span className="error-message">{errors.adminEmail}</span>}
              </div>
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
          </div>

          <div className="info-note">
            <strong>📋 Note:</strong> After verification, you'll be able to create donor 
            accounts, manage blood inventory, and coordinate with verified doctors.
          </div>

          <button 
            type="submit" 
            className="submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Create Hospital Account'}
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

export default HospitalSignup;
