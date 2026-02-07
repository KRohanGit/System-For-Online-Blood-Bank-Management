import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const DonorLogin = () => {
  const navigate = useNavigate();
  const [loginType, setLoginType] = useState('otp');
  const [formData, setFormData] = useState({
    email: '',
    otp: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = loginType === 'otp'
        ? '/api/donor-auth/login/otp'
        : '/api/donor-auth/login/password';

      const payload = loginType === 'otp'
        ? { email: formData.email, otp: formData.otp }
        : { email: formData.email, password: formData.password };

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}${endpoint}`,
        payload
      );

      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('donorInfo', JSON.stringify(response.data.data.donor));

      if (response.data.data.mustChangePassword) {
        navigate('/donor/change-password');
      } else {
        navigate('/donor/dashboard');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Login failed');
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px' }}>
      <h2>Donor Login</h2>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => setLoginType('otp')}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            border: loginType === 'otp' ? '2px solid #000' : '1px solid #ccc'
          }}
        >
          Login with OTP
        </button>
        <button
          onClick={() => setLoginType('password')}
          style={{
            padding: '10px 20px',
            border: loginType === 'password' ? '2px solid #000' : '1px solid #ccc'
          }}
        >
          Login with Password
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        {loginType === 'otp' ? (
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>OTP</label>
            <input
              type="text"
              name="otp"
              value={formData.otp}
              onChange={handleChange}
              required
              maxLength="6"
              style={{ width: '100%', padding: '8px' }}
            />
            <small>Check your email for the 6-digit OTP</small>
          </div>
        ) : (
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '8px' }}
            />
          </div>
        )}

        {error && (
          <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '10px' }}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
};

export default DonorLogin;
