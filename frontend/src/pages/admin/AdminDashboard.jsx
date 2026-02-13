import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BloodStockChart from '../../components/charts/BloodStockChart';
import Loader from '../../components/common/Loader';
import UrgencyIndexCard from '../../components/common/UrgencyIndexCard';
import GeoTimeHeatmap from '../../components/common/GeoTimeHeatmap';
import WasteRiskIndicator from '../../components/bloodInventory/WasteRiskIndicator';
import { doctorAPI, authAPI } from '../../services/api';
import '../../styles/admin.css';

function AdminDashboard() {
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('Admin');
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
  
  // Blood inventory quick reference data
  const [bloodInventory, setBloodInventory] = useState([
    { bloodGroup: 'A+', available: 45, reserved: 8, status: 'good' },
    { bloodGroup: 'A-', available: 12, reserved: 3, status: 'low' },
    { bloodGroup: 'B+', available: 38, reserved: 5, status: 'good' },
    { bloodGroup: 'B-', available: 7, reserved: 2, status: 'critical' },
    { bloodGroup: 'AB+', available: 15, reserved: 4, status: 'low' },
    { bloodGroup: 'AB-', available: 5, reserved: 1, status: 'critical' },
    { bloodGroup: 'O+', available: 62, reserved: 12, status: 'good' },
    { bloodGroup: 'O-', available: 9, reserved: 3, status: 'low' }
  ]);

  useEffect(() => {
    fetchDashboardData();
    
    // Update time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Get current user profile to show admin name
      try {
        const profileResp = await authAPI.getProfile();
        const profile = profileResp.data?.profile;
        const email = profileResp.data?.email;
        const displayName = profile?.adminName || profile?.fullName || email || 'Admin';
        setUserName(displayName);
      } catch (err) {
        console.warn('Failed to fetch profile for dashboard header', err.message || err);
      }
      
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
    <div className="admin-dashboard-container">
      <div className="admin-dashboard-page">
        {/* Header Section */}
        <div className="dashboard-header">
          <div className="header-content">
            <div className="header-text">
              <h1 className="dashboard-title">
                Welcome Back, {userName} 👋
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
        <div className="stats-section">
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
        <div className="dashboard-content-grid">
          {/* Blood Inventory Card */}
          <div className="dashboard-card inventory-card">
            <div className="card-header-modern">
              <div className="card-title-group">
                <h3 className="card-title">Blood Inventory Quick View</h3>
              </div>
              <button 
                className="btn-link-modern" 
                onClick={() => navigate('/admin/blood-inventory')}
              >
                View Details →
              </button>
            </div>
            <div className="card-body-modern">
              <div className="blood-inventory-quick-grid">
                {bloodInventory.map((stock) => (
                  <div key={stock.bloodGroup} className={`blood-stock-mini-card status-${stock.status}`}>
                    <div className="blood-group-badge">{stock.bloodGroup}</div>
                    <div className="stock-info">
                      <div className="stock-main">
                        <span className="stock-available">{stock.available}</span>
                        <span className="stock-label">units</span>
                      </div>
                      <div className="stock-reserved">
                        <span className="reserved-count">{stock.reserved} reserved</span>
                      </div>
                    </div>
                    <div className={`status-indicator status-${stock.status}`}>
                      {stock.status === 'critical' && '🔴'}
                      {stock.status === 'low' && '🟡'}
                      {stock.status === 'good' && '🟢'}
                      <span className="status-text">{stock.status}</span>
                    </div>
                  </div>
                ))}
              </div>
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
                      showViewDetails={true}
                    />
                  </div>

                  {/* Second urgency request - AB- with lower score */}
                  <div className="activity-item-modern" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
                      <div className="activity-content-modern">
                        <p className="activity-title">Surgical Blood Requirement</p>
                        <p className="activity-description">Apollo Hospital • Patient: Scheduled Surgery</p>
                      </div>
                      <span className="activity-time">45 min ago</span>
                    </div>
                    <UrgencyIndexCard 
                      request={{
                        bloodGroup: 'AB-',
                        unitsRequired: 3,
                        expiryHours: 72,
                        nearbyStock: [
                          { hospital: 'Central Bank', units: 4 },
                          { hospital: 'City Hospital', units: 2 }
                        ]
                      }}
                      showViewDetails={true}
                    />
                  </div>
                  
                  <div className="activity-item-modern">
                    <div className="activity-icon-modern">
                      <span>✅</span>
                    </div>
                    <div className="activity-content-modern">
                      <p className="activity-title">Donor Response - AB+</p>
                      <p className="activity-description">Rohan accepted donation</p>
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
        <div className="quick-actions-section">
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

            <button 
              className="quick-action-card"
              onClick={() => navigate('/admin/donor-management')}
            >
              <div className="action-icon-wrapper">
                <span className="action-icon">�</span>
              </div>
              <div className="action-content">
                <h4 className="action-title">Emergency Alerts</h4>
                <p className="action-description">Send alerts to past donors</p>
              </div>
              <div className="action-arrow">→</div>
            </button>

            <button 
              className="quick-action-card crisis-card"
              onClick={() => navigate('/emergency-intelligence')}
            >
              <div className="action-icon-wrapper">
                <span className="action-icon">🌊</span>
              </div>
              <div className="action-content">
                <h4 className="action-title">Crisis Propagation</h4>
                <p className="action-description"> emergency intelligence</p>
              </div>
              <div className="action-arrow">→</div>
            </button>

            <button 
              className="quick-action-card geo-card"
              onClick={() => navigate('/geo-intelligence')}
            >
              <div className="action-icon-wrapper">
                <span className="action-icon">🗺️</span>
              </div>
              <div className="action-content">
                <h4 className="action-title">Geo Intelligence</h4>
                <p className="action-description">Location-based insights</p>
              </div>
              <div className="action-arrow">→</div>
            </button>

            <button 
              className="quick-action-card camp-card"
              onClick={() => navigate('/blood-camps')}
            >
              <div className="action-icon-wrapper">
                <span className="action-icon">⛺</span>
              </div>
              <div className="action-content">
                <h4 className="action-title">Blood Camps</h4>
                <p className="action-description">Organize & manage camps</p>
              </div>
              <div className="action-arrow">→</div>
            </button>

            <button 
              className="quick-action-card community-card"
              onClick={() => navigate('/community')}
            >
              <div className="action-icon-wrapper">
                <span className="action-icon">🤝</span>
              </div>
              <div className="action-content">
                <h4 className="action-title">Community</h4>
                <p className="action-description">Connect with donors</p>
              </div>
              <div className="action-arrow">→</div>
            </button>

            <button 
              className="quick-action-card hospital-card"
              onClick={() => navigate('/hospitals')}
            >
              <div className="action-icon-wrapper">
                <span className="action-icon">🏥</span>
              </div>
              <div className="action-content">
                <h4 className="action-title">Hospitals</h4>
                <p className="action-description">View all hospitals</p>
              </div>
              <div className="action-arrow">→</div>
            </button>

            <button 
              className="quick-action-card approvals-card"
              onClick={() => navigate('/admin/approvals')}
            >
              <div className="action-icon-wrapper">
                <span className="action-icon">🧑‍⚕️</span>
              </div>
              <div className="action-content">
                <h4 className="action-title">Doctor Approvals</h4>
                <p className="action-description">{stats.pendingVerifications || 0} pending</p>
              </div>
              <div className="action-arrow">→</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
