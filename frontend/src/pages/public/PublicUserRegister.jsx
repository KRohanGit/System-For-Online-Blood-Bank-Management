import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register } from '../../services/publicUserApi';
import './PublicUserRegister.css';

const PublicUserRegister = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    city: '',
    state: '',
    bloodGroup: '',
    identityProofType: 'aadhaar',
    latitude: '',
    longitude: ''
  });
  const [files, setFiles] = useState({
    identityProof: null,
    signature: null
  });

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFileChange = (e) => {
    setFiles({
      ...files,
      [e.target.name]: e.target.files[0]
    });
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString()
          });
          alert('Location captured successfully');
        },
        (error) => {
          alert('Location access denied. Please enter city manually.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser');
    }
  };

  const validateForm = () => {
    const newErrors = [];

    if (formData.fullName.length < 3) {
      newErrors.push('Full name must be at least 3 characters');
    }

    if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.push('Invalid email format');
    }

    if (!/^[6-9]\d{9}$/.test(formData.phone)) {
      newErrors.push('Invalid phone number (10 digits, starting with 6-9)');
    }

    if (formData.password.length < 8) {
      newErrors.push('Password must be at least 8 characters');
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.push('Passwords do not match');
    }

    if (!files.identityProof) {
      newErrors.push('Identity proof is required');
    }

    if (!formData.latitude && !formData.city) {
      newErrors.push('Either enable location or enter city');
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors([]);

    const submitData = new FormData();
    submitData.append('fullName', formData.fullName);
    submitData.append('email', formData.email);
    submitData.append('phone', formData.phone);
    submitData.append('password', formData.password);
    submitData.append('city', formData.city);
    submitData.append('state', formData.state);
    submitData.append('bloodGroup', formData.bloodGroup);
    submitData.append('identityProofType', formData.identityProofType);
    submitData.append('latitude', formData.latitude);
    submitData.append('longitude', formData.longitude);
    submitData.append('identityProof', files.identityProof);
    if (files.signature) {
      submitData.append('signature', files.signature);
    }

    try {
      const result = await register(submitData);

      if (result.success) {
        alert('Registration successful! Awaiting verification.');
        navigate('/public/verification-pending');
      } else {
        setErrors(result.errors || [result.message]);
      }
    } catch (error) {
      setErrors(['Registration failed. Please try again.']);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="public-register-container">
      <div className="register-card">
        <h2>Public User Registration</h2>
        <p className="subtitle">Register as a verified citizen</p>

        {errors.length > 0 && (
          <div className="error-box">
            {errors.map((error, index) => (
              <p key={index}>• {error}</p>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name *</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              placeholder="Enter your full name"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="your@email.com"
                required
              />
            </div>

            <div className="form-group">
              <label>Phone Number *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="10-digit mobile number"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Password *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Min 8 characters"
                required
              />
            </div>

            <div className="form-group">
              <label>Confirm Password *</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Re-enter password"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Blood Group (Optional)</label>
            <select name="bloodGroup" value={formData.bloodGroup} onChange={handleInputChange}>
              <option value="">Select blood group</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </div>

          <div className="form-group">
            <label>Location</label>
            <button type="button" className="btn-location" onClick={getLocation}>
              📍 Get My Location
            </button>
            {formData.latitude && (
              <p className="location-info">✓ Location captured</p>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>City {!formData.latitude && '*'}</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                placeholder="Your city"
              />
            </div>

            <div className="form-group">
              <label>State</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                placeholder="Your state"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Identity Proof Type *</label>
            <select name="identityProofType" value={formData.identityProofType} onChange={handleInputChange}>
              <option value="aadhaar">Aadhaar Card</option>
              <option value="pan">PAN Card</option>
              <option value="driving_license">Driving License</option>
              <option value="voter_id">Voter ID</option>
              <option value="passport">Passport</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label>Upload Identity Proof * (Max 5MB)</label>
            <input
              type="file"
              name="identityProof"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              required
            />
            {files.identityProof && (
              <p className="file-info">✓ {files.identityProof.name}</p>
            )}
          </div>

          <div className="form-group">
            <label>Upload Signature (Optional, Max 5MB)</label>
            <input
              type="file"
              name="signature"
              accept="image/*"
              onChange={handleFileChange}
            />
            {files.signature && (
              <p className="file-info">✓ {files.signature.name}</p>
            )}
          </div>

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>

          <p className="login-link">
            Already have an account? <a href="/public/login">Login here</a>
          </p>
        </form>
      </div>
    </div>
  );
};

export default PublicUserRegister;
