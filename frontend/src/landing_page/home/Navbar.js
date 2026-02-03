import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <>
      <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
        <div className="navbar-container">
          <div className="navbar-logo">
            <span className="logo-icon">🩸</span>
            <span className="logo-text">LifeLink Blood Bank</span>
          </div>

          <button 
            className="hamburger"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          <div className={`navbar-menu ${isMobileMenuOpen ? 'active' : ''}`}>
            <button onClick={() => scrollToSection('about')} className="nav-link">
              About
            </button>
            <Link to="/our-team" className="nav-link">
              Our Team
            </Link>
            <button onClick={() => scrollToSection('how-it-works')} className="nav-link">
              How It Works
            </button>
            <button onClick={() => scrollToSection('support')} className="nav-link">
              Support
            </button>
            <Link to="/signup" className="nav-btn signup-btn">
              Sign Up
            </Link>
          </div>
        </div>
      </nav>
    </>
  );
}

export default Navbar;
