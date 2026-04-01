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
  const [downloadingDocId, setDownloadingDocId] = useState(null);
  const [error, setError] = useState(null);
  const [adminName, setAdminName] = useState('Admin');
  const [secureDocuments, setSecureDocuments] = useState([]);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [verifyingDocumentId, setVerifyingDocumentId] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [nearbyBloodCamps, setNearbyBloodCamps] = useState([]);
  const [loadingBloodCamps, setLoadingBloodCamps] = useState(false);
  const [superAdminLocation, setSuperAdminLocation] = useState(null);
  const [documentForm, setDocumentForm] = useState({
    ownerUserId: '',
    ownerRole: '',
    documentType: 'registration_document',
    file: null
  });

  useEffect(() => {
    fetchDashboardData();
    fetchAdminName();
    getLocationAndFetchCamps();
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
        fetchRecentActivity(),
        fetchSecureDocuments()
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

  const fetchSecureDocuments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${config.API_URL.replace('/superadmin', '')}/documents?status=pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setSecureDocuments(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching secure documents:', error);
    }
  };

  const getLocationAndFetchCamps = async () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setSuperAdminLocation({ latitude, longitude });
          await fetchNearbyBloodCamps(latitude, longitude);
        },
        (error) => {
          console.warn('Geolocation error:', error);
          // Use default location (e.g., India center) if geolocation fails
          fetchNearbyBloodCamps(20.5937, 78.9629);
        }
      );
    } else {
      console.warn('Geolocation not supported');
      // Use default location if not supported
      fetchNearbyBloodCamps(20.5937, 78.9629);
    }
  };

  const fetchNearbyBloodCamps = async (latitude, longitude, maxDistance = 50) => {
    setLoadingBloodCamps(true);
    try {
      const response = await axios.get(`${config.API_URL.replace('/superadmin', '')}/blood-camps/nearby`, {
        params: {
          latitude,
          longitude,
          maxDistance
        }
      });
      if (response.data.success) {
        setNearbyBloodCamps(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching nearby blood camps:', error);
    } finally {
      setLoadingBloodCamps(false);
    }
  };

  const handleDocumentFormChange = (key, value) => {
    setDocumentForm((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleUploadDocument = async (e) => {
    e.preventDefault();
    setUploadError(null);
    
    if (!documentForm.ownerUserId || !documentForm.ownerRole || !documentForm.file) {
      setUploadError('Please select a target user and document file.');
      return;
    }

    // Validate file size (max 10MB)
    if (documentForm.file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be less than 10MB.');
      return;
    }

    // Validate file type
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg'];
    if (!validTypes.includes(documentForm.file.type)) {
      setUploadError('Only PDF, PNG, and JPG files are allowed.');
      return;
    }

    setUploadingDocument(true);
    try {
      const token = localStorage.getItem('token');
      const payload = new FormData();
      payload.append('ownerUserId', documentForm.ownerUserId);
      payload.append('ownerRole', documentForm.ownerRole);
      payload.append('documentType', documentForm.documentType);
      payload.append('file', documentForm.file);

      const response = await axios.post(
        `${config.API_URL.replace('/superadmin', '')}/documents/upload`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setUploadError(null);
        setDocumentForm({
          ownerUserId: '',
          ownerRole: '',
          documentType: 'registration_document',
          file: null
        });
        await fetchSecureDocuments();
      }
    } catch (error) {
      console.error('Error uploading secure document:', error);
      setUploadError(error.response?.data?.message || 'Failed to upload document. Please try again.');
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleVerifyDocument = async (documentId, action) => {
    if (action === 'reject') {
      const reason = window.prompt('Provide rejection reason:');
      if (!reason) {
        return;
      }
      setVerifyingDocumentId(documentId);
      try {
        const token = localStorage.getItem('token');
        const response = await axios.post(
          `${config.API_URL.replace('/superadmin', '')}/documents/verify`,
          { documentId, action, reason },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.data.success) {
          await fetchSecureDocuments();
        }
      } catch (error) {
        console.error('Error verifying secure document:', error);
        alert(error.response?.data?.message || 'Failed to verify document.');
      } finally {
        setVerifyingDocumentId(null);
      }
      return;
    }

    setVerifyingDocumentId(documentId);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${config.API_URL.replace('/superadmin', '')}/documents/verify`,
        { documentId, action },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        await fetchSecureDocuments();
      }
    } catch (error) {
      console.error('Error verifying secure document:', error);
      alert(error.response?.data?.message || 'Failed to verify document.');
    } finally {
      setVerifyingDocumentId(null);
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

  const handleViewDocument = async (user, documentType) => {
    const token = localStorage.getItem('token');
    const requestId = `${user._id}:${documentType}`;
    setDownloadingDocId(requestId);

    try {
      const endpoint = user.role === 'PUBLIC_USER'
        ? `${config.API_URL}/superadmin/public-users/${user._id}/documents/${documentType}/download`
        : `${config.API_URL}/superadmin/users/${user._id}/documents/${documentType}/download`;

      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const contentType = response.headers['content-type'] || 'application/octet-stream';
      const blobUrl = URL.createObjectURL(new Blob([response.data], { type: contentType }));
      window.open(blobUrl, '_blank', 'noopener,noreferrer');

      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 60000);
    } catch (error) {
      console.error('Error viewing document:', error);
      alert('Unable to open the document. Please try again.');
    } finally {
      setDownloadingDocId(null);
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
        <div id="pending-approvals" className="content-section pending-approvals-section">
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
                            <span className="detail-value">{[user.profile.city, user.profile.state].filter(Boolean).join(', ') || 'Not specified'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Identity Proof:</span>
                            <span className="detail-value">{user.profile.hasIdentityProof ? '✅ Uploaded' : '❌ Missing'}</span>
                          </div>
                        </>
                      )}

                      {Array.isArray(user.profile.documents) && user.profile.documents.length > 0 && (
                        <div className="documents-review">
                          <h4 className="documents-title">Submitted Documents</h4>
                          <div className="documents-list">
                            {user.profile.documents.map((doc) => {
                              const isDownloading = downloadingDocId === `${user._id}:${doc.type}`;
                              return (
                                <div key={doc.type} className="document-row">
                                  <div className="document-meta">
                                    <span className="document-name">{doc.label}</span>
                                    <span className="document-file">{doc.fileName || 'Encrypted file'}</span>
                                  </div>
                                  <button
                                    type="button"
                                    className="btn-view-document"
                                    disabled={!doc.uploaded || isDownloading}
                                    onClick={() => handleViewDocument(user, doc.type)}
                                  >
                                    {isDownloading ? 'Opening...' : 'View'}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
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

      <div className="content-section secure-documents-section">
        <div className="section-header">
          <h2 className="section-title">Secure Document Verification</h2>
        </div>

        {uploadError && (
          <div className="alert alert-error">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>{uploadError}</span>
            <button type="button" onClick={() => setUploadError(null)} className="alert-close">×</button>
          </div>
        )}

        <form className="secure-doc-upload-form" onSubmit={handleUploadDocument}>
          <select
            value={documentForm.ownerUserId}
            onChange={(e) => {
              const selectedUser = pendingUsers.find((user) => user._id === e.target.value);
              handleDocumentFormChange('ownerUserId', e.target.value);
              handleDocumentFormChange('ownerRole', selectedUser?.role || '');
            }}
          >
            <option value="">Select doctor/hospital user</option>
            {pendingUsers
              .filter((user) => user.role === 'doctor' || user.role === 'hospital_admin')
              .map((user) => (
                <option key={user._id} value={user._id}>
                  {user.name} ({user.role})
                </option>
              ))}
          </select>
          <input
            type="text"
            value={documentForm.documentType}
            onChange={(e) => handleDocumentFormChange('documentType', e.target.value)}
            placeholder="Document type"
          />
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(e) => handleDocumentFormChange('file', e.target.files?.[0] || null)}
          />
          <button type="submit" disabled={uploadingDocument}>
            {uploadingDocument ? 'Uploading...' : 'Upload & Analyze'}
          </button>
        </form>

        <div className="secure-doc-list">
          {secureDocuments.length === 0 ? (
            <div className="empty-state">
              <h3>No pending secure documents</h3>
            </div>
          ) : (
            secureDocuments.map((document) => (
              <div key={document.documentId} className="secure-doc-card">
                <div className="secure-doc-top">
                  <div>
                    <h3>
                      {document.documentType.replace(/_/g, ' ').charAt(0).toUpperCase() + document.documentType.replace(/_/g, ' ').slice(1)}
                      {document.originalName && <span className="doc-filename"> ({document.originalName.split('.').pop().toUpperCase()})</span>}
                    </h3>
                    <p className="doc-meta">
                      User: {document.ownerRole === 'doctor' ? '👨‍⚕️' : '🏥'} {document.ownerRole}
                    </p>
                  </div>
                  <span className={`status-badge ${document.validationStatus === 'valid' ? 'approved' : 'pending'}`}>
                    {document.validationStatus === 'valid' ? '✓ Valid' : '⚠ Suspicious'}
                  </span>
                </div>
                <p className="secure-doc-ai-text">{document.aiSuggestion}</p>
                <div className="secure-doc-fields">
                  <div className="detail-item">
                    <span className="detail-label">Name</span>
                    <span className="detail-value">{document.extractedFields?.name || 'Not detected'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">License</span>
                    <span className="detail-value">{document.extractedFields?.licenseNumber || 'Not detected'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Hospital</span>
                    <span className="detail-value">{document.extractedFields?.hospitalName || 'Not detected'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Date</span>
                    <span className="detail-value">{document.extractedFields?.date || 'Not detected'}</span>
                  </div>
                </div>
                <div className="approval-actions">
                  <button
                    className="btn-approve"
                    disabled={verifyingDocumentId === document.documentId}
                    onClick={() => handleVerifyDocument(document.documentId, 'approve')}
                  >
                    Approve
                  </button>
                  <button
                    className="btn-reject"
                    disabled={verifyingDocumentId === document.documentId}
                    onClick={() => handleVerifyDocument(document.documentId, 'reject')}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Nearby Blood Camps Section */}
      <div className="content-section blood-camps-section">
        <div className="section-header">
          <h2 className="section-title">
            Nearby Blood Camps
            {superAdminLocation && <span className="location-badge">📍 {superAdminLocation.latitude.toFixed(2)}, {superAdminLocation.longitude.toFixed(2)}</span>}
          </h2>
          <button 
            className="btn-refresh" 
            onClick={() => superAdminLocation && fetchNearbyBloodCamps(superAdminLocation.latitude, superAdminLocation.longitude)}
            disabled={loadingBloodCamps}
          >
            {loadingBloodCamps ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {loadingBloodCamps ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading nearby blood camps...</p>
          </div>
        ) : nearbyBloodCamps.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h3>No blood camps nearby</h3>
            <p>Check back later for upcoming camps in your area</p>
          </div>
        ) : (
          <div className="blood-camps-grid">
            {nearbyBloodCamps.map((camp) => (
              <div key={camp._id} className="blood-camp-card">
                <div className="camp-header">
                  <div className="camp-title">
                    <h3>{camp.campName}</h3>
                    <p className="camp-status">{camp.lifecycle?.status || 'Pre-Camp'}</p>
                  </div>
                  {camp.distance && (
                    <div className="distance-badge">
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="1" fill="currentColor"/>
                        <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2"/>
                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" opacity="0.5"/>
                      </svg>
                      {camp.distance.toFixed(1)} km
                    </div>
                  )}
                </div>

                <div className="camp-description">
                  <p>{camp.description}</p>
                </div>

                <div className="camp-organizer">
                  <div className="organizer-icon">
                    {camp.organizer?.type === 'Hospital' ? '🏥' : camp.organizer?.type === 'NGO' ? '🤝' : '👤'}
                  </div>
                  <div className="organizer-info">
                    <p className="organizer-name">{camp.organizer?.name || 'Unknown Organizer'}</p>
                    <p className="organizer-type">{camp.organizer?.type || 'Organization'}</p>
                    {camp.organizer?.contactPhone && (
                      <p className="organizer-contact">📞 {camp.organizer.contactPhone}</p>
                    )}
                  </div>
                </div>

                <div className="camp-details">
                  <div className="detail-row">
                    <span className="detail-label">📍 Venue:</span>
                    <span className="detail-value">{camp.venue?.name}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">📅 Date:</span>
                    <span className="detail-value">
                      {camp.schedule?.date ? new Date(camp.schedule.date).toLocaleDateString() : 'TBD'}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">⏰ Time:</span>
                    <span className="detail-value">
                      {camp.schedule?.startTime} - {camp.schedule?.endTime}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">👥 Capacity:</span>
                    <span className="detail-value">{camp.venue?.seatingCapacity} donors</span>
                  </div>
                  {camp.bloodGroupsNeeded && camp.bloodGroupsNeeded.length > 0 && (
                    <div className="detail-row">
                      <span className="detail-label">🩸 Blood Groups:</span>
                      <span className="detail-value">{camp.bloodGroupsNeeded.join(', ')}</span>
                    </div>
                  )}
                </div>

                <div className="camp-actions">
                  <button 
                    className="btn-view-camp"
                    onClick={() => navigate(`/blood-camps/${camp._id}`)}
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="quick-actions-section">
        <h2 className="section-title">Quick Actions</h2>
        <div className="quick-actions-grid">
          <button className="quick-action-card" onClick={() => { document.querySelector('#pending-approvals')?.scrollIntoView({ behavior: 'smooth' }) || window.scrollTo(0, 0); }}>
            <div className="action-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3>Manage All Users</h3>
            <p>View and manage all platform users</p>
          </button>

          <button className="quick-action-card" onClick={() => navigate('/hospitals')}>
            <div className="action-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3>Hospital Network</h3>
            <p>Monitor all registered hospitals</p>
          </button>

          <button className="quick-action-card" onClick={() => navigate('/admin/approvals')}>
            <div className="action-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3>Doctor Verification</h3>
            <p>Review doctor credentials</p>
          </button>

          <button className="quick-action-card" onClick={() => navigate('/emergency-intelligence')}>
            <div className="action-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3>Emergency Intelligence</h3>
            <p>Platform emergency analytics</p>
          </button>

        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
