import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import DashboardLayout from '../../components/layout/DashboardLayout';
import BloodStockChart from '../../components/charts/BloodStockChart';
import Loader from '../../components/common/Loader';
import UrgencyIndexCard from '../../components/common/UrgencyIndexCard';
import GeoTimeHeatmap from '../../components/common/GeoTimeHeatmap';
import WasteRiskIndicator from '../../components/bloodInventory/WasteRiskIndicator';
import { doctorAPI } from '../../services/api';
import '../../styles/admin.css';

function AdminDashboard() {
  const navigate = useNavigate();
  const pageRef = useRef(null);
  const headerRef = useRef(null);
  const statsRef = useRef(null);
  const cardsRef = useRef(null);
  const actionsRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBloodUnits: 450,
    lowStockAlerts: 3,
    activeDonors: 127,
    emergencyRequests: 2,
    todayRequests: 8,
    pendingRequests: 5
  });
  const [pendingDoctors, setPendingDoctors] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchDashboardData();
    
    // Update time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!loading && pageRef.current) {
      const ctx = gsap.context(() => {
        // Header animation
        gsap.fromTo(headerRef.current, 
          {
            y: -20,
            opacity: 0
          },
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
            ease: 'power3.out'
          }
        );
        
        // Stats cards animation with stagger
        gsap.fromTo('.stat-card', 
          {
            scale: 0.9,
            y: 30,
            opacity: 0
          },
          {
            scale: 1,
            y: 0,
            opacity: 1,
            duration: 0.7,
            stagger: 0.1,
            delay: 0.2,
            ease: 'back.out(1.4)'
          }
        );
        
        // Main cards animation
        gsap.fromTo('.dashboard-card', 
          {
            y: 40,
            opacity: 0
          },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            stagger: 0.15,
            delay: 0.6,
            ease: 'power3.out'
          }
        );
        
        // Quick actions animation
        gsap.fromTo('.quick-action-card', 
          {
            scale: 0.95,
            opacity: 0
          },
          {
            scale: 1,
            opacity: 1,
            duration: 0.6,
            stagger: 0.08,
            delay: 1,
            ease: 'power2.out'
          }
        );
      }, pageRef);
      
      return () => ctx.revert();
    }
  }, [loading]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch pending doctors
      const response = await doctorAPI.getPendingDoctors();
      const doctors = response.data?.doctors || [];
      setPendingDoctors(doctors);
      
      setStats({
        totalBloodUnits: 0,
        pendingVerifications: doctors.length,
        activeDonors: 0,
        emergencyRequests: 0
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return <Loader text="Loading dashboard..." />;
  }

  return (
    <DashboardLayout>
      <div className="admin-dashboard-page" ref={pageRef}>
        {/* Header Section */}
        <div className="dashboard-header" ref={headerRef}>
          <div className="header-content">
            <div className="header-text">
              <h1 className="dashboard-title">
                Welcome Back, Admin 👋
              </h1>
              <p className="dashboard-subtitle">
                {formatDate(currentTime)} • {formatTime(currentTime)}
              </p>
            </div>
            <div className="header-actions">
              <button className="btn-refresh" onClick={fetchDashboardData}>
                🔄 Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="stats-section" ref={statsRef}>
          <div className="stat-card stat-primary">
            <div className="stat-card-inner">
              <div className="stat-icon-wrapper">
                <div className="stat-icon">🩸</div>
              </div>
              <div className="stat-details">
                <p className="stat-label">Total Blood Units</p>
                <h3 className="stat-value">{stats.totalBloodUnits}</h3>
                <p className="stat-info">Available in inventory</p>
              </div>
            </div>
          </div>

          <div className="stat-card stat-warning">
            <div className="stat-card-inner">
              <div className="stat-icon-wrapper">
                <div className="stat-icon">⚠️</div>
              </div>
              <div className="stat-details">
                <p className="stat-label">Low Stock Alerts</p>
                <h3 className="stat-value">{stats.lowStockAlerts}</h3>
                <p className="stat-info">Blood groups low</p>
              </div>
            </div>
          </div>

          <div className="stat-card stat-success">
            <div className="stat-card-inner">
              <div className="stat-icon-wrapper">
                <div className="stat-icon">👥</div>
              </div>
              <div className="stat-details">
                <p className="stat-label">Active Donors</p>
                <h3 className="stat-value">{stats.activeDonors}</h3>
                <p className="stat-info">Available to donate</p>
              </div>
            </div>
          </div>

          <div className="stat-card stat-danger">
            <div className="stat-card-inner">
              <div className="stat-icon-wrapper">
                <div className="stat-icon">🚨</div>
              </div>
              <div className="stat-details">
                <p className="stat-label">Emergency Requests</p>
                <h3 className="stat-value">{stats.emergencyRequests}</h3>
                <p className="stat-info">Critical cases</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="dashboard-content-grid" ref={cardsRef}>
          {/* Blood Inventory Card */}
          <div className="dashboard-card inventory-card">
            <div className="card-header-modern">
              <div className="card-title-group">
                <h3 className="card-title">Blood Inventory</h3>
                <span className="card-badge">Live</span>
              </div>
              <button 
                className="btn-link-modern" 
                onClick={() => navigate('/admin/blood-inventory')}
              >
                View Details →
              </button>
            </div>
            <div className="card-body-modern">
              <BloodStockChart />
            </div>
          </div>

          {/* Recent Activities Card */}
          <div className="dashboard-card activities-card">
            <div className="card-header-modern">
              <div className="card-title-group">
                <h3 className="card-title">🚨 High Urgency Blood Requests</h3>
                <span className="card-count">{stats.todayRequests} today</span>
              </div>
              <button 
                className="btn-link-modern" 
                onClick={() => navigate('/admin/blood-requests')}
              >
                View All →
              </button>
            </div>
            <div className="card-body-modern">
              {stats.pendingRequests > 0 ? (
                <div className="activities-list-modern">
                  {/* Example: High urgency request with UrgencyIndexCard */}
                  <div className="activity-item-modern" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
                      <div className="activity-content-modern">
                        <p className="activity-title">Emergency Blood Request</p>
                        <p className="activity-description">City General Hospital • Patient: Emergency Case</p>
                      </div>
                      <span className="activity-time">10 min ago</span>
                    </div>
                    <UrgencyIndexCard 
                      request={{
                        bloodGroup: 'O-',
                        unitsRequired: 8,
                        expiryHours: 36,
                        nearbyStock: [
                          { hospital: 'Central Bank', units: 2 },
                          { hospital: 'Apollo', units: 1 }
                        ]
                      }}
                    />
                  </div>
                  
                  <div className="activity-item-modern">
                    <div className="activity-icon-modern">
                      <span>✅</span>
                    </div>
                    <div className="activity-content-modern">
                      <p className="activity-title">Donor Response - AB+</p>
                      <p className="activity-description">John Doe accepted donation</p>
                    </div>
                    <div className="activity-meta">
                      <span className="activity-time">25 min ago</span>
                      <span className="status-badge approved">Approved</span>
                    </div>
                  </div>

                  <div className="activity-item-modern">
                    <div className="activity-icon-modern">
                      <span>⚠️</span>
                    </div>
                    <div className="activity-content-modern">
                      <p className="activity-title">Low Stock Alert - B-</p>
                      <p className="activity-description">Only 3 units remaining</p>
                    </div>
                    <div className="activity-meta">
                      <span className="activity-time">1 hour ago</span>
                      <span className="status-badge warning">Alert</span>
                    </div>
                  </div>

                  <div className="activity-item-modern">
                    <div className="activity-icon-modern">
                      <span>🩸</span>
                    </div>
                    <div className="activity-content-modern">
                      <p className="activity-title">Blood Added - A+</p>
                      <p className="activity-description">5 units added to inventory</p>
                    </div>
                    <div className="activity-meta">
                      <span className="activity-time">2 hours ago</span>
                      <span className="status-badge success">Completed</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">📭</div>
                  <p className="empty-text">No recent activities</p>
                  <p className="empty-subtext">Activity will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions Section */}
        <div className="quick-actions-section" ref={actionsRef}>
          <h2 className="section-title">📊 Analytics & Insights</h2>
          
          {/* Geo-Time Heatmap */}
          <div className="dashboard-card" style={{ marginBottom: '24px' }}>
            <div className="card-header-modern">
              <div className="card-title-group">
                <h3 className="card-title">🗺️ Blood Demand Heatmap</h3>
                <span className="card-count">Geographic insights</span>
              </div>
            </div>
            <div className="card-body-modern">
              <GeoTimeHeatmap />
            </div>
          </div>

          {/* Waste Risk Alerts */}
          <div className="dashboard-card" style={{ marginBottom: '24px' }}>
            <div className="card-header-modern">
              <div className="card-title-group">
                <h3 className="card-title">⚠️ Blood Units at Risk</h3>
                <span className="card-count">Expiring soon</span>
              </div>
              <button 
                className="btn-link-modern" 
                onClick={() => navigate('/admin/blood-inventory')}
              >
                View Inventory →
              </button>
            </div>
            <div className="card-body-modern">
              <div style={{ display: 'grid', gap: '16px' }}>
                <WasteRiskIndicator 
                  unit={{
                    bloodUnitId: 'BU2026001234',
                    bloodGroup: 'B+',
                    expiryDate: new Date(Date.now() + 40 * 60 * 60 * 1000),
                    status: 'Available'
                  }}
                  showSuggestions={true}
                />
              </div>
            </div>
          </div>

          <h2 className="section-title">⚡ Quick Actions</h2>
          <div className="quick-actions-grid">
            <button 
              className="quick-action-card"
              onClick={() => navigate('/admin/blood-inventory')}
            >
              <div className="action-icon-wrapper">
                <span className="action-icon">🩸</span>
              </div>
              <div className="action-content">
                <h4 className="action-title">Blood Inventory</h4>
                <p className="action-description">Manage blood stock & units</p>
              </div>
              <div className="action-arrow">→</div>
            </button>

            <button 
              className="quick-action-card"
              onClick={() => navigate('/admin/blood-requests')}
            >
              <div className="action-icon-wrapper">
                <span className="action-icon">📋</span>
              </div>
              <div className="action-content">
                <h4 className="action-title">Blood Requests</h4>
                <p className="action-description">{stats.pendingRequests} pending requests</p>
              </div>
              <div className="action-arrow">→</div>
            </button>

            <button 
              className="quick-action-card"
              onClick={() => navigate('/admin/emergency')}
            >
              <div className="action-icon-wrapper">
                <span className="action-icon">🚨</span>
              </div>
              <div className="action-content">
                <h4 className="action-title">Emergency</h4>
                <p className="action-description">Inter-hospital coordination</p>
              </div>
              <div className="action-arrow">→</div>
            </button>

            <button 
              className="quick-action-card"
              onClick={() => navigate('/admin/donors')}
            >
              <div className="action-icon-wrapper">
                <span className="action-icon">👥</span>
              </div>
              <div className="action-content">
                <h4 className="action-title">Donors</h4>
                <p className="action-description">{stats.activeDonors} active donors</p>
              </div>
              <div className="action-arrow">→</div>
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default AdminDashboard;
