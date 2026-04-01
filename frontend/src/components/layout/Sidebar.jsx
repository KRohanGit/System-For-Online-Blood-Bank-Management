import React, { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import gsap from 'gsap';
import '../../styles/admin.css';

function Sidebar({ isOpen, toggleSidebar }) {
  const sidebarRef = useRef(null);
  
  const menuItems = [
    { path: '/admin/dashboard', icon: '🏠', label: 'Dashboard', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { path: '/admin/blood-inventory', icon: '🩸', label: 'Blood Inventory', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
    { path: '/admin/blood-requests', icon: '📋', label: 'Blood Requests', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
    { path: '/admin/emergency', icon: '🚨', label: 'Emergency', gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
    { path: '/emergency-intelligence', icon: '🌊', label: 'Crisis Propagation', gradient: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)', badge: 'AI' },
    { path: '/geo-intelligence', icon: '🗺️', label: 'Geo Intelligence', gradient: 'linear-gradient(135deg, #56ab2f 0%, #a8e063 100%)', badge: 'NEW' },
    { path: '/admin/ml-intelligence', icon: '🧠', label: 'ML Intelligence', gradient: 'linear-gradient(135deg, #667eea 0%, #00d2ff 100%)', badge: 'ML' },
    { path: '/admin/digital-twin', icon: '🔬', label: 'Digital Twin', gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', badge: 'AI' },
    { path: '/admin/rl-agent', icon: '🤖', label: 'RL Agent', gradient: 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)', badge: 'AI' },
    { path: '/admin/graph-intelligence', icon: '🕸️', label: 'Graph Network', gradient: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)', badge: 'AI' },
    { path: '/admin/donors', icon: '👥', label: 'Donors', gradient: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)' },
    { path: '/admin/approvals', icon: '🧑‍⚕️', label: 'Doctor Approvals', gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' },
    { path: '/blood-camps', icon: '⛺', label: 'Blood Camps', gradient: 'linear-gradient(135deg, #fa8bff 0%, #2bd2ff 100%)' },
    { path: '/community', icon: '🤝', label: 'Community', gradient: 'linear-gradient(135deg, #fddb92 0%, #d1fdff 100%)' },
    { path: '/admin/logs', icon: '📊', label: 'Audit Logs', gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' },
    { path: '/admin/settings', icon: '⚙️', label: 'Settings', gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)' }
  ];
  
  useEffect(() => {
    if (sidebarRef.current) {
      const ctx = gsap.context(() => {
        gsap.fromTo('.sidebar-header',
          { x: -20, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }
        );
        
        gsap.fromTo('.nav-item',
          { x: -30, opacity: 0 },
          { 
            x: 0, 
            opacity: 1, 
            duration: 0.4, 
            stagger: 0.05, 
            delay: 0.2,
            ease: 'power2.out'
          }
        );
        
        gsap.fromTo('.sidebar-footer',
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, delay: 0.6, ease: 'power2.out' }
        );
      }, sidebarRef);
      
      return () => ctx.revert();
    }
  }, []);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}
      
      <aside ref={sidebarRef} className={`admin-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon-wrapper">
              <span className="logo-icon">🩸</span>
            </div>
            <div className="logo-content">
              <span className="logo-text">LifeLink</span>
              <span className="logo-subtitle">Hospital Admin</span>
            </div>
          </div>
          <button className="sidebar-toggle-mobile" onClick={toggleSidebar}>✕</button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => window.innerWidth < 768 && toggleSidebar()}
            >
              <div className="nav-indicator" style={{ background: item.gradient }}></div>
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">
                {item.label}
                {item.badge && <span className="nav-badge">{item.badge}</span>}
              </span>
              <span className="nav-arrow">›</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p className="version">Version 1.0.0</p>
          <p className="copyright">© 2026 LifeLink</p>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
