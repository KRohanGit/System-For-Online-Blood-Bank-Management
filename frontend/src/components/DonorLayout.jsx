import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const DonorLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('donorInfo');
    navigate('/donor/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <div style={{ width: '200px', borderRight: '1px solid #ccc', padding: '20px' }}>
        <h3>Donor Portal</h3>
        <nav>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ marginBottom: '10px' }}>
              <Link
                to="/donor/dashboard"
                style={{
                  textDecoration: 'none',
                  fontWeight: isActive('/donor/dashboard') ? 'bold' : 'normal'
                }}
              >
                Dashboard
              </Link>
            </li>
            <li style={{ marginBottom: '10px' }}>
              <Link
                to="/donor/history"
                style={{
                  textDecoration: 'none',
                  fontWeight: isActive('/donor/history') ? 'bold' : 'normal'
                }}
              >
                History
              </Link>
            </li>
            <li style={{ marginBottom: '10px' }}>
              <Link
                to="/donor/certificates"
                style={{
                  textDecoration: 'none',
                  fontWeight: isActive('/donor/certificates') ? 'bold' : 'normal'
                }}
              >
                Certificates
              </Link>
            </li>
            <li style={{ marginBottom: '10px' }}>
              <Link
                to="/donor/messages"
                style={{
                  textDecoration: 'none',
                  fontWeight: isActive('/donor/messages') ? 'bold' : 'normal'
                }}
              >
                Messages
              </Link>
            </li>
            <li style={{ marginTop: '20px' }}>
              <button onClick={handleLogout} style={{ padding: '8px 15px' }}>
                Logout
              </button>
            </li>
          </ul>
        </nav>
      </div>
      <div style={{ flex: 1 }}>
        {children}
      </div>
    </div>
  );
};

export default DonorLayout;
