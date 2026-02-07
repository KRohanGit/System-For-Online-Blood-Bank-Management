import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { authAPI, auth } from '../../services/api';
import './SignIn.css';

function SignIn() {
  const navigate = useNavigate();
  const formRef = useRef(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'hospital_admin'
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handlePublicUserLogin = () => {
    navigate('/public/login');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();

    if (Object.keys(newErrors).length === 0) {
      setIsSubmitting(true);
      setApiError('');
      setSuccessMessage('');
      
      try {
        const response = await authAPI.login(formData.email, formData.password, formData.role);
        
        // Save token
        if (response.data && response.data.token) {
          auth.setToken(response.data.token);
        }
        
        setSuccessMessage('Login successful!');
        
        // Get user role from response
        const userRole = response.data?.user?.role || formData.role;
        const isVerified = response.data?.user?.isVerified;
        const profileData = response.data?.profile;
        
        // Navigate based on role and verification status
        setTimeout(() => {
          // Super Admin goes to super admin dashboard
          if (userRole === 'super_admin') {
            navigate('/superadmin/dashboard');
          }
          // Hospital Admin goes to admin dashboard
          else if (userRole === 'hospital_admin') {
            navigate('/admin/dashboard');
          }
          // Doctor navigation logic
          else if (userRole === 'doctor') {
            console.log('🔍 Doctor login - Full response data:', {
              isVerified,
              profileData,
              userRole,
              hasProfile: !!profileData
            });
            
            // Check if doctor profile exists and is approved
            // Allow login if either user.isVerified is true OR profile.verificationStatus is 'approved'
            
            // If profile exists and is rejected, block login
            if (profileData && profileData.verificationStatus === 'rejected') {
              console.log('❌ Doctor application rejected');
              setApiError('Your doctor application has been rejected. Please contact support.');
              setIsSubmitting(false);
              return;
            }
            
            // Doctor can login if EITHER condition is true:
            // 1. User.isVerified === true (approved at user level)
            // 2. DoctorProfile.verificationStatus === 'approved'
            const isApproved = (isVerified === true) || (profileData?.verificationStatus === 'approved');
            
            console.log('🔍 Doctor approval check:', {
              isVerified: isVerified === true,
              profileStatus: profileData?.verificationStatus,
              isProfileApproved: profileData?.verificationStatus === 'approved',
              finalDecision: isApproved
            });
            
            if (isApproved) {
              console.log('✅ Doctor approved, navigating to dashboard');
              navigate('/doctor/dashboard');
            } else {
              console.log('⏳ Doctor still pending approval');
              navigate('/doctor/pending-approval');
            }
          }
          // Donor goes to donor dashboard
          else if (userRole === 'donor') {
            navigate('/donor/dashboard');
          }
          // Default fallback
          else {
            navigate(`/${userRole}/dashboard`);
          }
        }, 1000);
      } catch (error) {
        setApiError(error.message || 'Login failed. Please check your credentials.');
        console.error('Login error:', error);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setErrors(newErrors);
    }
  };

  return (
    <div className="auth-page signin-page" ref={formRef}>
      <div className="auth-nav">
        <Link to="/" className="back-link">
          ← Back to Home
        </Link>
        <div className="signin-link">
          Don't have an account? <Link to="/signup">Sign Up</Link>
        </div>
      </div>

      <div className="form-container">
        <div className="form-header">
          <div className="role-icon">🩸</div>
          <h1>Sign In</h1>
          <p>Access your LifeLink account</p>
        </div>

        <div className="role-selector">
          <label>Select Your Role:</label>
          <div className="role-buttons">
            <button
              type="button"
              className={`role-select-btn ${formData.role === 'super_admin' ? 'active' : ''}`}
              onClick={() => setFormData({ ...formData, role: 'super_admin' })}
            >
              👑 Super Admin
            </button>
            <button
              type="button"
              className={`role-select-btn ${formData.role === 'hospital_admin' ? 'active' : ''}`}
              onClick={() => setFormData({ ...formData, role: 'hospital_admin' })}
            >
              🏥 Hospital Admin
            </button>
            <button
              type="button"
              className={`role-select-btn ${formData.role === 'doctor' ? 'active' : ''}`}
              onClick={() => setFormData({ ...formData, role: 'doctor' })}
            >
              🧑‍⚕️ Doctor
            </button>
            <button
              type="button"
              className={`role-select-btn ${formData.role === 'donor' ? 'active' : ''}`}
              onClick={() => setFormData({ ...formData, role: 'donor' })}
            >
              🩸 Donor
            </button>
            <button
              type="button"
              className="role-select-btn public-user-btn"
              onClick={handlePublicUserLogin}
            >
              👤 Public User
            </button>
          </div>
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
            <label htmlFor="email">Email Address *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? 'error' : ''}
              placeholder="your@email.com"
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

        <div className="form-footer">
          <p>
            By signing in, you agree to our{' '}
            <a href="#">Terms of Service</a> and{' '}
            <a href="#">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SignIn;
