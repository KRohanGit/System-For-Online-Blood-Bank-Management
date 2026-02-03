import React from 'react';
import { Link } from 'react-router-dom';
import './Sidebar.css';

export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose}></div>}
      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>🩸 Menu</h2>
          <button className="close-sidebar" onClick={onClose}>×</button>
        </div>
        <nav className="sidebar-nav">
          <Link to="/community" className="sidebar-link" onClick={onClose}>
            <span className="icon">💬</span>
            <span>Community</span>
          </Link>
          <Link to="/hospitals" className="sidebar-link" onClick={onClose}>
            <span className="icon">🏥</span>
            <span>Hospitals</span>
          </Link>
          <Link to="/organize-camp" className="sidebar-link" onClick={onClose}>
            <span className="icon">📅</span>
            <span>Organize Camp</span>
          </Link>
        </nav>
      </div>
    </>
  );
}
