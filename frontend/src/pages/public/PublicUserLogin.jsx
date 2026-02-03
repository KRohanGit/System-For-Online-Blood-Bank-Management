import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../../services/publicUserApi';
import './PublicUserLogin.css';

const PublicUserLogin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(formData.email, formData.password);

      if (result.success) {
        // Store token and user data with consistent keys
        localStorage.setItem('token', result.data.token);
        localStorage.setItem('user', JSON.stringify(result.data.user));

        if (result.data.user.verificationStatus === 'pending') {
          navigate('/public/verification-pending');
        } else if (result.data.user.verificationStatus === 'rejected') {
          setError('Your account has been rejected. Please contact support.');
        } else if (result.data.user.verificationStatus === 'verified') {
          navigate('/public/dashboard');
        }
      } else {
        setError(result.message || 'Login failed');
      }
    } catch (error) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="public-login-container">
      <div className="login-card">
        <h2>Public User Login</h2>
        <p className="subtitle">Access blood availability & news</p>

        {error && (
          <div className="error-box">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
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
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter your password"
              required
            />
          </div>

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>

          <p className="register-link">
            Don't have an account? <a href="/public/register">Register here</a>
          </p>
        </form>
      </div>
    </div>
  );
};

export default PublicUserLogin;
