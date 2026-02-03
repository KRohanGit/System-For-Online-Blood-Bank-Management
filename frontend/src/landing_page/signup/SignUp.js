import React, { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import './SignUp.css';

function SignUp() {
  const navigate = useNavigate();
  const containerRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.signup-header', 
        {
          y: -50,
          opacity: 0
        },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'power3.out'
        }
      );

      gsap.fromTo('.role-card', 
        {
          y: 50,
          opacity: 0
        },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.2,
          ease: 'power3.out',
          delay: 0.3
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleRoleSelect = (role) => {
    navigate(`/auth/${role}`);
  };

  return (
    <div className="signup-page" ref={containerRef}>
      <div className="signup-nav">
        <Link to="/" className="back-home">
          ← Back to Home
        </Link>
        <div className="signin-link">
          Already have an account? <Link to="/signin">Sign In</Link>
        </div>
      </div>

      <div className="signup-container">
        <div className="signup-header">
          <h1>Join LifeLink Blood Bank</h1>
          <p>Choose your role to get started</p>
        </div>

        <div className="roles-grid">
          <div 
            className="role-card super-admin"
            onClick={() => handleRoleSelect('super-admin')}
          >
            <div className="role-icon">👑</div>
            <h2>Super Admin</h2>
            <p>
              Central authority managing the entire LifeLink platform. 
              Verify doctors, approve hospitals, and oversee system operations.
            </p>
            <ul className="role-features">
              <li>Verify doctor registrations</li>
              <li>Approve hospital accounts</li>
              <li>System-wide oversight</li>
              <li>Inter-hospital coordination</li>
            </ul>
            <button className="role-btn">Super Admin Login</button>
          </div>

          <div 
            className="role-card hospital"
            onClick={() => handleRoleSelect('hospital')}
          >
            <div className="role-icon">🏥</div>
            <h2>Hospital Admin</h2>
            <p>
              Manage your hospital's blood bank inventory, raise emergency 
              requests, and coordinate with donors and other hospitals.
            </p>
            <ul className="role-features">
              <li>Manage blood inventory</li>
              <li>Emergency coordination</li>
              <li>Donor management</li>
              <li>Requires hospital license</li>
            </ul>
            <button className="role-btn">Sign Up as Hospital</button>
          </div>

          <div 
            className="role-card doctor"
            onClick={() => handleRoleSelect('doctor')}
          >
            <div className="role-icon">🧑‍⚕️</div>
            <h2>Doctor</h2>
            <p>
              Verified medical professionals who approve donor eligibility, 
              validate blood requests, and provide medical oversight.
            </p>
            <ul className="role-features">
              <li>Verify donor eligibility</li>
              <li>Approve blood requests</li>
              <li>Medical validation</li>
              <li>Requires medical certificate</li>
            </ul>
            <button className="role-btn">Sign Up as Doctor</button>
          </div>

          <div 
            className="role-card donor"
            onClick={() => handleRoleSelect('donor')}
          >
            <div className="role-icon">🩸</div>
            <h2>Donor</h2>
            <p>
              Access your donor account using credentials provided by your 
              hospital. View requests and donation history.
            </p>
            <ul className="role-features">
              <li>View donation requests</li>
              <li>Track donation history</li>
              <li>Check eligibility status</li>
              <li>Hospital credentials required</li>
            </ul>
            <button className="role-btn">Sign In as Donor</button>
          </div>

          <div 
            className="role-card public-user"
            onClick={() => navigate('/public/register')}
          >
            <div className="role-icon">👤</div>
            <h2>Public User</h2>
            <p>
              Register as a verified citizen to search nearby blood banks, 
              view blood availability news, and receive donation certificates.
            </p>
            <ul className="role-features">
              <li>Search nearby blood banks</li>
              <li>View blood availability news</li>
              <li>Get donation certificates</li>
              <li>Identity verification required</li>
            </ul>
            <button className="role-btn">Sign Up as Public User</button>
          </div>
        </div>

        <div className="info-box">
          <h3>📋 Before You Start</h3>
          <div className="info-grid">
            <div>
              <strong>Super Admin:</strong> Central authority access - contact system administrators
            </div>
            <div>
              <strong>Hospital Admin:</strong> Prepare hospital license and official documentation
            </div>
            <div>
              <strong>Doctors:</strong> Have your medical certificate ready (PDF/JPG, max 2MB)
            </div>
            <div>
              <strong>Donors:</strong> Contact your hospital to receive login credentials
            </div>
            <div>
              <strong>Public Users:</strong> Identity proof required (Aadhaar/PAN, max 5MB)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignUp;
