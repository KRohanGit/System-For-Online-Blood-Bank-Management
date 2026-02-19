import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import config from '../../config/config';
import '../../styles/superadmin.css';

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingApprovals: 0,
    totalHospitals: 0,
    totalDoctors: 0,
    totalDonors: 0,
    verifiedHospitals: 0,
    verifiedDoctors: 0
  });
  const [pendingUsers, setPendingUsers] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState(null);
  const [error, setError] = useState(null);
  const [adminName, setAdminName] = useState('Admin');

  useEffect(() => {
    fetchDashboardData();
    fetchAdminName();
    // Refresh pending users every 10 seconds for live updates
    const interval = setInterval(fetchPendingUsers, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchAdminName = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${config.API_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success && response.data.data?.email) {
        const email = response.data.data.email;
        const name = email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1);
        setAdminName(name);
      }
    } catch (error) {
      console.error('Error fetching admin name:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setError(null);
      await Promise.all([
        fetchStats(),
        fetchPendingUsers(),
        fetchRecentActivity()
      ]);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please check your connection and try again.');
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('📤 Frontend: Fetching stats...');
      const response = await axios.get(`${config.API_URL}/superadmin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        console.log('📊 Frontend: Stats received:', response.data.data);
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('❌ Frontend: Error fetching stats:', error);
    }
  };

  const fetchPendingUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('📤 Frontend: Fetching pending users...');
      const response = await axios.get(`${config.API_URL}/superadmin/users/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('📥 Frontend: Received response:', response.data);
      if (response.data.success) {
        console.log(`📊 Frontend: Setting ${response.data.data.length} pending users in state`);
        setPendingUsers(response.data.data || []);
      } else {
        console.warn('⚠️ Frontend: Response was not successful');
      }
    } catch (error) {
      console.error('❌ Frontend: Error fetching pending users:', error);
      console.error('Error details:', error.response?.data);
      // Don't clear the pending users on error - keep the existing state
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${config.API_URL}/superadmin/activity?limit=8`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setRecentActivity(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  const handleApprove = async (userId, userName, role) => {
    if (!window.confirm(`Are you sure you want to approve ${userName} as ${role}?`)) {
      return;
    }

    setApprovingId(userId);
    try {
      const token = localStorage.getItem('token');
      const endpoint = role === 'PUBLIC_USER' 
        ? `${config.API_URL}/superadmin/public-users/${userId}/approve`
        : `${config.API_URL}/superadmin/users/${userId}/approve`;
      
      const response = await axios.put(
        endpoint,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        // Show success message
        alert(`✅ ${userName} has been approved successfully!`);
        
        // Refresh data
        await fetchDashboardData();
      }
    } catch (error) {
      console.error('Error approving user:', error);
      alert('Failed to approve user. Please try again.');
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (userId, userName, role) => {
    const reason = window.prompt(`Provide a reason for rejecting ${userName}:`);
    if (!reason) return;

    setApprovingId(userId);
    try {
      const token = localStorage.getItem('token');
      
      let response;
      if (role === 'PUBLIC_USER') {
        // For PUBLIC_USER, use PUT method to update status to rejected
        response = await axios.put(
          `${config.API_URL}/superadmin/public-users/${userId}/reject`,
          { reason },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        // For regular users, use DELETE to remove
        response = await axios.delete(
          `${config.API_URL}/superadmin/users/${userId}/reject`,
          {
            headers: { Authorization: `Bearer ${token}` },
            data: { reason }
          }
        );
      }

      if (response.data.success) {
        alert(`❌ ${userName} has been rejected.`);
        await fetchDashboardData();
      }
    } catch (error) {
      console.error('Error rejecting user:', error);
      alert('Failed to reject user. Please try again.');
    } finally {
      setApprovingId(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="super-admin-dashboard loading">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="super-admin-dashboard loading">
        <div className="error-state">
          <h2>⚠️ Error Loading Dashboard</h2>
          <p>{error}</p>
          <button onClick={fetchDashboardData} className="btn-retry">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="super-admin-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="dashboard-title">Welcome, {adminName} 👋</h1>
            <p className="dashboard-subtitle">Central Admin - Platform Administration & User Management</p>
          </div>
          <div className="header-actions">
            <button 
              className="quick-nav-btn"
              onClick={() => navigate('/emergency-intelligence')}
              title="Crisis Propagation Engine"
            >
              <span className="btn-icon">🌊</span>
              <span className="btn-label">Crisis Intelligence</span>
            </button>
            <button 
              className="quick-nav-btn"
              onClick={() => navigate('/geo-intelligence')}
              title="Geolocation Intelligence"
            >
              <span className="btn-icon">🗺️</span>
              <span className="btn-label">Geo Intelligence</span>
            </button>
            <button 
              className="quick-nav-btn"
              onClick={() => navigate('/blood-camps')}
              title="Blood Camps & Community"
            >
              <span className="btn-icon">⛺</span>
              <span className="btn-label">Blood Camps</span>
            </button>
            <div className="live-indicator">
              <span className="live-pulse"></span>
              <span className="live-text">LIVE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="stat-details">
            <h3 className="stat-value">{stats.totalUsers}</h3>
            <p className="stat-label">Total Users</p>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="stat-details">
            <h3 className="stat-value">{stats.pendingApprovals}</h3>
            <p className="stat-label">Pending Approvals</p>
            {stats.pendingApprovals > 0 && <span className="stat-badge pulse">Action Required</span>}
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="stat-details">
            <h3 className="stat-value">{stats.verifiedHospitals}/{stats.totalHospitals}</h3>
            <p className="stat-label">Verified Hospitals</p>
          </div>
        </div>

        <div className="stat-card info">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="stat-details">
            <h3 className="stat-value">{stats.verifiedDoctors}/{stats.totalDoctors}</h3>
            <p className="stat-label">Verified Doctors</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="content-grid">
        {/* Pending Approvals Section */}
        <div className="content-section pending-approvals-section">
          <div className="section-header">
            <h2 className="section-title">
              Pending Approvals
              {pendingUsers.length > 0 && (
                <span className="count-badge">{pendingUsers.length}</span>
              )}
            </h2>
            {pendingUsers.length > 0 && (
              <span className="live-update-indicator">
                <span className="pulse-dot"></span>
                Auto-refreshing
              </span>
            )}
          </div>

          <div className="approvals-list">
            {pendingUsers.length === 0 ? (
              <div className="empty-state">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <h3>All Clear! 🎉</h3>
                <p>No pending approvals at this time</p>
              </div>
            ) : (
              pendingUsers.map((user) => (
                <div key={user._id} className="approval-card">
                  <div className="approval-header">
                    <div className="user-avatar">
                      {user.role === 'hospital_admin' ? '🏥' : user.role === 'doctor' ? '👨‍⚕️' : '👤'}
                    </div>
                    <div className="user-info">
                      <h3 className="user-name">{user.name}</h3>
                      <p className="user-email">{user.email}</p>
                      <span className={`role-badge ${user.role}`}>
                        {user.role === 'hospital_admin' ? 'Hospital Admin' : user.role === 'doctor' ? 'Doctor' : 'Public User'}
                      </span>
                    </div>
                    <div className="approval-time">
                      <span className="time-text">{formatDate(user.createdAt)}</span>
                    </div>
                  </div>

                  {user.profile && (
                    <div className="profile-details">
                      {user.role === 'hospital_admin' ? (
                        <>
                          <div className="detail-item">
                            <span className="detail-label">Hospital:</span>
                            <span className="detail-value">{user.profile.hospitalName}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">License:</span>
                            <span className="detail-value">{user.profile.licenseNumber}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Email:</span>
                            <span className="detail-value">{user.profile.adminEmail}</span>
                          </div>
                        </>
                      ) : user.role === 'doctor' ? (
                        <>
                          <div className="detail-item">
                            <span className="detail-label">Full Name:</span>
                            <span className="detail-value">{user.profile.fullName}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Hospital:</span>
                            <span className="detail-value">{user.profile.hospitalName}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Status:</span>
                            <span className="detail-value">{user.profile.verificationStatus}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="detail-item">
                            <span className="detail-label">Phone:</span>
                            <span className="detail-value">{user.profile.phone}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Blood Group:</span>
                            <span className="detail-value">{user.profile.bloodGroup || 'Not specified'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Location:</span>
                            <span className="detail-value">{user.profile.city}, {user.profile.state}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Identity Proof:</span>
                            <span className="detail-value">{user.profile.hasIdentityProof ? '✅ Uploaded' : '❌ Missing'}</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <div className="approval-actions">
                    <button
                      className="btn-approve"
                      onClick={() => handleApprove(user._id, user.name, user.role)}
                      disabled={approvingId === user._id}
                    >
                      {approvingId === user._id ? (
                        <>
                          <span className="btn-spinner"></span>
                          Approving...
                        </>
                      ) : (
                        <>
                          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Approve
                        </>
                      )}
                    </button>
                    <button
                      className="btn-reject"
                      onClick={() => handleReject(user._id, user.name, user.role)}
                      disabled={approvingId === user._id}
                    >
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="content-section activity-section">
          <div className="section-header">
            <h2 className="section-title">Recent Activity</h2>
          </div>

          <div className="activity-list">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="activity-item">
                <div className={`activity-icon ${activity.status}`}>
                  {activity.status === 'approved' ? (
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <div className="activity-content">
                  <p className="activity-text">
                    <strong>{activity.user}</strong> registered as{' '}
                    <span className={`role-tag ${activity.role}`}>
                      {activity.role === 'hospital_admin' ? 'Hospital Admin' : activity.role}
                    </span>
                  </p>
                  <span className="activity-time">{formatDate(activity.timestamp)}</span>
                </div>
                <span className={`status-badge ${activity.status}`}>
                  {activity.status === 'approved' ? 'Approved' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions-section">
        <h2 className="section-title">Quick Actions</h2>
        <div className="quick-actions-grid">
          <button className="quick-action-card" onClick={() => navigate('/superadmin/users')}>
            <div className="action-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3>Manage All Users</h3>
            <p>View and manage all platform users</p>
          </button>

          <button className="quick-action-card" onClick={() => navigate('/superadmin/hospitals')}>
            <div className="action-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3>Hospital Network</h3>
            <p>Monitor all registered hospitals</p>
          </button>

          <button className="quick-action-card" onClick={() => navigate('/superadmin/doctors')}>
            <div className="action-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3>Doctor Verification</h3>
            <p>Review doctor credentials</p>
          </button>

          <button className="quick-action-card" onClick={() => navigate('/superadmin/reports')}>
            <div className="action-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3>System Reports</h3>
            <p>Generate platform analytics</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
