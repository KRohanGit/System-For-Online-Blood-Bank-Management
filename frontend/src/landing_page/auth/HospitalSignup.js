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
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    latitude: '',
    longitude: '',
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
  const [locationDetected, setLocationDetected] = useState(false);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);

  const reverseGeocode = async (latitude, longitude) => {
    setIsResolvingAddress(true);
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&addressdetails=1`,
        {
          headers: {
            Accept: 'application/json'
          }
        }
      );

      if (!resp.ok) {
        return;
      }

      const data = await resp.json();
      const addr = data?.address || {};

      const detectedPincode = addr.postcode || '';
      const detectedCity = addr.city || addr.town || addr.village || addr.county || '';
      const detectedState = addr.state || '';
      const detectedAddress = data?.display_name || '';

      setFormData((prev) => ({
        ...prev,
        pincode: detectedPincode || prev.pincode,
        city: detectedCity || prev.city,
        state: detectedState || prev.state,
        address: detectedAddress || prev.address
      }));
    } catch (error) {
      console.warn('Failed to resolve address from coordinates:', error);
    } finally {
      setIsResolvingAddress(false);
    }
  };

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

  // Auto-detect location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const detectedLat = Number(position.coords.latitude).toFixed(6);
          const detectedLng = Number(position.coords.longitude).toFixed(6);
          setFormData((prev) => ({
            ...prev,
            latitude: detectedLat,
            longitude: detectedLng
          }));
          setLocationDetected(true);
          reverseGeocode(detectedLat, detectedLng);
        },
        () => {
          console.warn('Location access denied - hospital can set location later');
        }
      );
    }
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
    if (!formData.address) newErrors.address = 'Hospital address is required';
    if (!formData.city) newErrors.city = 'City is required';
    if (!formData.pincode) newErrors.pincode = 'Pincode is required';

    const latitude = Number(formData.latitude);
    const longitude = Number(formData.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      newErrors.latitude = 'Valid latitude is required';
      newErrors.longitude = 'Valid longitude is required';
    } else {
      if (latitude < -90 || latitude > 90) newErrors.latitude = 'Latitude must be between -90 and 90';
      if (longitude < -180 || longitude > 180) newErrors.longitude = 'Longitude must be between -180 and 180';
      if (latitude === 0 && longitude === 0) {
        newErrors.latitude = 'Latitude cannot be 0 when longitude is 0';
        newErrors.longitude = 'Longitude cannot be 0 when latitude is 0';
      }
    }

    if (!formData.phone) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phone.replace(/[- ]/g, ''))) {
      newErrors.phone = 'Enter a valid 10-digit phone number';
    }
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
        
        const response = await authAPI.registerHospital({
          ...formData,
          latitude: formData.latitude,
          longitude: formData.longitude
        });
        
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

            <div className="form-group">
              <label htmlFor="address">Hospital Address *</label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className={errors.address ? 'error' : ''}
              />
              {errors.address && <span className="error-message">{errors.address}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="city">City *</label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className={errors.city ? 'error' : ''}
                />
                {errors.city && <span className="error-message">{errors.city}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="state">State</label>
                <input
                  type="text"
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="pincode">Pincode *</label>
                <input
                  type="text"
                  id="pincode"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  className={errors.pincode ? 'error' : ''}
                />
                {errors.pincode && <span className="error-message">{errors.pincode}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="phone">Hospital Phone *</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={errors.phone ? 'error' : ''}
                  placeholder="9876543210"
                />
                {errors.phone && <span className="error-message">{errors.phone}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="latitude">Latitude *</label>
                <input
                  type="number"
                  step="0.000001"
                  id="latitude"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleChange}
                  className={errors.latitude ? 'error' : ''}
                />
                {errors.latitude && <span className="error-message">{errors.latitude}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="longitude">Longitude *</label>
                <input
                  type="number"
                  step="0.000001"
                  id="longitude"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleChange}
                  className={errors.longitude ? 'error' : ''}
                />
                {errors.longitude && <span className="error-message">{errors.longitude}</span>}
              </div>
            </div>

            {isResolvingAddress && (
              <div className="info-note" style={{ background: '#e3f2fd', marginBottom: '12px' }}>
                Detecting address and pincode from your coordinates...
              </div>
            )}

            {locationDetected && (
              <div className="info-note" style={{ background: '#e8f5e9', marginBottom: '12px' }}>
                📍 Location detected automatically. You can still edit coordinates before submit.
              </div>
            )}
            {!locationDetected && (
              <div className="info-note" style={{ background: '#fff3e0', marginBottom: '12px' }}>
                📍 Allow location access so donors can find your hospital on the map.
              </div>
            )}

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
                  placeholder="Giri G"
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
