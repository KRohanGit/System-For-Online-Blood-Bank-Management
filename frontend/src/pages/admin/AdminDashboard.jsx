import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import config from '../../config/config';
import Loader from '../../components/common/Loader';
import UrgencyIndexCard from '../../components/common/UrgencyIndexCard';
import GeoTimeHeatmap from '../../components/common/GeoTimeHeatmap';
import WasteRiskIndicator from '../../components/bloodInventory/WasteRiskIndicator';
import { doctorAPI, authAPI } from '../../services/api';
import { connectSocket, disconnectSocket, getSocket, onEvent } from '../../services/socketService';
import { getMLHealth } from '../../services/mlAPI';
import '../../styles/admin.css';

function AdminDashboard() {
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [hospitalLocation, setHospitalLocation] = useState(null);
  const [stats, setStats] = useState({
    totalBloodUnits: 0,
    lowStockAlerts: 0,
    activeDonors: 0,
    emergencyRequests: 0
  });
  const [pendingDoctors, setPendingDoctors] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Blood inventory quick reference data
  const [bloodInventory, setBloodInventory] = useState([]);
  const [expiringUnits, setExpiringUnits] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [urgencyRequests, setUrgencyRequests] = useState([]);
  const [rlRecommendations, setRlRecommendations] = useState([]);
  const [rlMeta, setRlMeta] = useState({
    status: 'idle',
    updatedAt: null,
    computeMs: null,
    trigger: null
  });
  const [graphInsights, setGraphInsights] = useState({
    stabilityScore: 0,
    criticalHospitals: [],
    bottlenecks: [],
    weakRegions: [],
    status: 'idle',
    computeMs: null,
    updatedAt: null
  });
  const [systemHealth, setSystemHealth] = useState({
    backend: { status: 'unknown', detail: '' },
    ml: { status: 'unknown', detail: '' },
    socket: { status: 'disconnected', detail: '' },
    checking: false,
    checkedAt: null
  });

  const getBackendBaseUrl = () => {
    const apiBase = config?.API_BASE_URL || process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    return apiBase.replace(/\/api\/?$/, '');
  };

  const getStatusLabel = (status) => {
    if (status === 'healthy' || status === 'connected' || status === 'live') return 'Healthy';
    if (status === 'degraded') return 'Degraded';
    if (status === 'offline' || status === 'disconnected' || status === 'error') return 'Offline';
    return 'Unknown';
  };

  const statusColor = (status) => {
    if (status === 'healthy' || status === 'connected' || status === 'live') return '#10b981';
    if (status === 'degraded') return '#f59e0b';
    if (status === 'offline' || status === 'disconnected' || status === 'error') return '#ef4444';
    return '#64748b';
  };

  const fetchSystemHealth = async () => {
    setSystemHealth((prev) => ({ ...prev, checking: true }));
    const backendBase = getBackendBaseUrl();
    const socket = getSocket();

    const [backendResult, mlResult] = await Promise.allSettled([
      axios.get(`${backendBase}/health`),
      getMLHealth()
    ]);

    const backendStatus = backendResult.status === 'fulfilled'
      ? (backendResult.value?.data?.status || 'healthy')
      : 'offline';
    const backendDetail = backendResult.status === 'fulfilled'
      ? `DB ${backendResult.value?.data?.database?.status || 'unknown'}`
      : 'Backend health endpoint unavailable';

    const mlStatus = mlResult.status === 'fulfilled'
      ? (mlResult.value?.data?.status || 'live')
      : 'offline';
    const mlDetail = mlResult.status === 'fulfilled'
      ? 'ML service responding'
      : 'ML service unavailable';

    setSystemHealth({
      backend: { status: backendStatus, detail: backendDetail },
      ml: { status: mlStatus, detail: mlDetail },
      socket: {
        status: socket?.connected ? 'connected' : 'disconnected',
        detail: socket?.connected ? 'Realtime channel active' : 'Realtime channel disconnected'
      },
      checking: false,
      checkedAt: new Date().toISOString()
    });
  };

  const handleManualRefresh = async () => {
    await Promise.allSettled([fetchDashboardData(), fetchSystemHealth()]);
  };

  const getAuthContext = () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return { userId: null, role: null };
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        userId: payload.userId || payload.id || payload._id || null,
        role: payload.role || null
      };
    } catch {
      return { userId: null, role: null };
    }
  };

  const fetchRLRecommendations = async () => {
    try {
      const token = localStorage.getItem('token');
      const API_URL = config?.API_URL || process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const response = await axios.get(`${API_URL}/rl/recommendations`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const recommendations = response.data?.recommendations || [];
      const snapshot = response.data?.snapshot || null;

      setRlRecommendations(recommendations.slice(0, 5));
      setRlMeta({
        status: 'live',
        updatedAt: snapshot?.generatedAt || new Date().toISOString(),
        computeMs: snapshot?.computeMs || null,
        trigger: snapshot?.trigger || 'api_fetch'
      });
    } catch (error) {
      console.warn('Failed to load RL recommendations', error.message || error);
      setRlMeta((prev) => ({ ...prev, status: 'offline' }));
    }
  };

  const fetchGraphIntelligence = async () => {
    try {
      const token = localStorage.getItem('token');
      const API_URL = config?.API_URL || process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

      const [stabilityResp, centralityResp, bottleneckResp] = await Promise.all([
        axios.get(`${API_URL}/graph/stability`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/graph/centrality`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/graph/bottlenecks`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const stability = stabilityResp.data?.stability || {};
      const centralityRanking = centralityResp.data?.ranking || [];
      const bottlenecks = bottleneckResp.data?.bottlenecks || [];

      const weakRegions = [];
      if ((stability?.density || 0) < 0.18) weakRegions.push('Sparse inter-hospital connectivity');
      if ((stability?.largestComponentRatio || 0) < 0.75) weakRegions.push('Disconnected hospital clusters');
      if ((stability?.pathEfficiency || 0) < 0.35) weakRegions.push('Slow network reachability between nodes');
      if (!weakRegions.length) weakRegions.push('No structural weak region detected');

      setGraphInsights({
        stabilityScore: Number(stability.score || 0),
        criticalHospitals: centralityRanking.slice(0, 5),
        bottlenecks: bottlenecks.slice(0, 5),
        weakRegions,
        status: 'live',
        computeMs: stabilityResp.data?.computeMs || centralityResp.data?.computeMs || bottleneckResp.data?.computeMs || null,
        updatedAt: stabilityResp.data?.generatedAt || new Date().toISOString()
      });
    } catch (error) {
      console.warn('Failed to load Graph Intelligence', error.message || error);
      setGraphInsights((prev) => ({ ...prev, status: 'offline' }));
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchSystemHealth();
    fetchRLRecommendations();
    fetchGraphIntelligence();

    const { userId, role } = getAuthContext();
    const socket = connectSocket(userId, role);
    const handleSocketConnect = () => {
      setSystemHealth((prev) => ({
        ...prev,
        socket: { status: 'connected', detail: 'Realtime channel active' },
        checkedAt: new Date().toISOString()
      }));
    };
    const handleSocketDisconnect = () => {
      setSystemHealth((prev) => ({
        ...prev,
        socket: { status: 'disconnected', detail: 'Realtime channel disconnected' },
        checkedAt: new Date().toISOString()
      }));
    };
    if (socket) {
      socket.on('connect', handleSocketConnect);
      socket.on('disconnect', handleSocketDisconnect);
    }

    const offRLUpdate = onEvent('rl_allocation_update', (payload) => {
      const recommendations = payload?.recommendations || [];
      setRlRecommendations(recommendations.slice(0, 5));
      setRlMeta({
        status: payload?.error ? 'error' : 'live',
        updatedAt: payload?.generatedAt || new Date().toISOString(),
        computeMs: payload?.computeMs || null,
        trigger: payload?.trigger || 'socket_update'
      });
    });
    const offGraphUpdate = onEvent('graph_update', (payload) => {
      const criticalHospitals = payload?.criticalHospitals || [];
      const bottlenecks = payload?.bottlenecks || [];
      setGraphInsights((prev) => {
        const weakRegions = [...(prev.weakRegions || [])];
        if (!weakRegions.length) weakRegions.push('Realtime topology recalculation in progress');
        return {
          ...prev,
          criticalHospitals: criticalHospitals.slice(0, 5),
          bottlenecks: bottlenecks.slice(0, 5),
          stabilityScore: Number(payload?.stabilityScore ?? prev.stabilityScore ?? 0),
          computeMs: payload?.computeMs || prev.computeMs || null,
          updatedAt: payload?.generatedAt || new Date().toISOString(),
          status: payload?.error ? 'error' : 'live',
          weakRegions
        };
      });
    });
    
    // Update time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      fetchSystemHealth();
    }, 60000);
    
    return () => {
      clearInterval(timer);
      offRLUpdate();
      offGraphUpdate();
      if (socket) {
        socket.off('connect', handleSocketConnect);
        socket.off('disconnect', handleSocketDisconnect);
      }
      if (socket) {
        disconnectSocket();
      }
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const API_URL = config?.API_URL || process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      let inventoryForUrgency = [];

      // Get current user profile
      try {
        const profileResp = await authAPI.getProfile();
        const profile = profileResp.data?.data?.profile || null;
        const email = profileResp.data?.data?.email || '';
        const displayName = profile?.hospitalName || profile?.adminName || profile?.fullName || email || 'Hospital Team';
        setUserName(displayName);
        const coords = profile?.location?.coordinates;
        if (Array.isArray(coords) && coords.length === 2 && Number.isFinite(coords[0]) && Number.isFinite(coords[1])) {
          setHospitalLocation({ longitude: coords[0], latitude: coords[1] });
        } else {
          setHospitalLocation(null);
        }
      } catch (err) {
        console.warn('Failed to fetch profile for dashboard header', err.message || err);
        setUserName((prev) => prev || 'Hospital Team');
      }
      
      // Fetch pending doctors
      let doctors = [];
      try {
        const response = await doctorAPI.getPendingDoctors();
        doctors = response.data?.doctors || [];
        setPendingDoctors(doctors);
      } catch (err) {
        console.warn('Failed to fetch pending doctors', err.message || err);
      }

      // Fetch blood inventory stock overview
      let totalUnits = 0;
      let lowStockCount = 0;
      try {
        const invResp = await axios.get(`${API_URL}/blood-inventory/stock-overview`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const stockData = invResp.data?.data?.stockOverview || invResp.data?.stockOverview || invResp.data?.data || [];
        const invArr = (Array.isArray(stockData) ? stockData : []).map(s => {
          const avail = s.available || s.count || s.units || 0;
          const reserved = s.reserved || 0;
          const status = avail <= 5 ? 'critical' : avail <= 15 ? 'low' : 'good';
          totalUnits += avail;
          if (status === 'low' || status === 'critical') lowStockCount++;
          return { bloodGroup: s.bloodGroup || s._id, available: avail, reserved, status };
        });
        inventoryForUrgency = invArr;
        setBloodInventory(invArr);
      } catch (err) {
        console.warn('Failed to fetch blood inventory', err.message || err);
      }

      // Fetch donor count
      let donorCount = 0;
      try {
        const donorResp = await axios.get(`${API_URL}/donations/donors`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const donorData = donorResp.data?.data?.donors || donorResp.data?.donors || [];
        donorCount = Array.isArray(donorData) ? donorData.length : 0;
      } catch (err) {
        console.warn('Failed to fetch donors', err.message || err);
      }

      // Fetch expiring blood units (real data for waste risk)
      let emergencyCount = 0;
      try {
        const expiringResp = await axios.get(`${API_URL}/blood-inventory/expiring`, {
          params: { days: 7 },
          headers: { Authorization: `Bearer ${token}` }
        });
        const expData = expiringResp.data?.data || {};
        const criticalUnits = expData.categorized?.critical || [];
        const urgentUnits = expData.categorized?.urgent || [];
        const warningUnits = expData.categorized?.warning || [];
        const allExpiring = [...criticalUnits, ...urgentUnits, ...warningUnits];
        setExpiringUnits(allExpiring.slice(0, 5));
        emergencyCount = (expData.summary?.critical || 0) + (expData.summary?.urgent || 0);
      } catch (err) {
        console.warn('Failed to fetch expiring units', err.message || err);
      }

      // Build urgency requests from critical/low inventory
      try {
        const urgReqs = inventoryForUrgency
          .filter(g => g.status === 'critical' || g.status === 'low')
          .map(g => ({
            bloodGroup: g.bloodGroup,
            unitsRequired: g.status === 'critical' ? 10 : 5,
            expiryHours: g.status === 'critical' ? 24 : 72,
            nearbyStock: []
          }));
        setUrgencyRequests(urgReqs.slice(0, 3));
        if (urgReqs.length > emergencyCount) emergencyCount = urgReqs.length;
      } catch (err) {
        console.warn('Failed to compute urgency requests', err.message || err);
      }

      // Fetch recent activities from audit trail
      try {
        const auditResp = await axios.get(`${API_URL}/audit-trail/logs`, {
          params: { limit: 5, page: 1 },
          headers: { Authorization: `Bearer ${token}` }
        });
        const logs = auditResp.data?.data?.logs || [];
        const activities = logs.map(log => ({
          id: log._id,
          title: log.actionType || log.action || 'Activity',
          description: log.details || log.description || log.patientId || '',
          time: log.createdAt ? new Date(log.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '',
          type: (log.actionType || '').toLowerCase().includes('emergency') ? 'emergency' :
                (log.actionType || '').toLowerCase().includes('reject') ? 'warning' : 'success'
        }));
        setRecentActivities(activities);
      } catch (err) {
        console.warn('Failed to fetch audit trail', err.message || err);
      }
      
      setStats({
        totalBloodUnits: totalUnits,
        lowStockAlerts: lowStockCount,
        activeDonors: donorCount,
        emergencyRequests: emergencyCount
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
              <button className="btn-refresh" onClick={handleManualRefresh}>
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
                <span className="card-count">{stats.emergencyRequests || 0} today</span>
              </div>
              <button 
                className="btn-link-modern" 
                onClick={() => navigate('/admin/blood-requests')}
              >
                View All →
              </button>
            </div>
            <div className="card-body-modern">
              {(urgencyRequests.length > 0 || recentActivities.length > 0) ? (
                <div className="activities-list-modern">
                  {/* Real urgency requests from low/critical inventory */}
                  {urgencyRequests.map((req, idx) => (
                    <div key={`urgency-${idx}`} className="activity-item-modern" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
                        <div className="activity-content-modern">
                          <p className="activity-title">Low Stock: {req.bloodGroup}</p>
                          <p className="activity-description">{req.expiryHours <= 24 ? 'Critical shortage' : 'Low stock alert'}</p>
                        </div>
                        <span className="activity-time">{req.expiryHours <= 24 ? 'Critical' : 'Low'}</span>
                      </div>
                      <UrgencyIndexCard 
                        request={req}
                        showViewDetails={true}
                      />
                    </div>
                  ))}

                  {/* Real recent activities from audit trail */}
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="activity-item-modern">
                      <div className="activity-icon-modern">
                        <span>{activity.type === 'emergency' ? '🚨' : activity.type === 'warning' ? '⚠️' : '✅'}</span>
                      </div>
                      <div className="activity-content-modern">
                        <p className="activity-title">{activity.title}</p>
                        <p className="activity-description">{activity.description}</p>
                      </div>
                      <div className="activity-meta">
                        <span className="activity-time">{activity.time}</span>
                        <span className={`status-badge ${activity.type === 'warning' ? 'warning' : activity.type === 'emergency' ? 'critical' : 'success'}`}>
                          {activity.type === 'emergency' ? 'Alert' : activity.type === 'warning' ? 'Warning' : 'Done'}
                        </span>
                      </div>
                    </div>
                  ))}

                  {urgencyRequests.length === 0 && recentActivities.length === 0 && (
                    <div className="empty-state">
                      <div className="empty-icon">✅</div>
                      <p className="empty-text">All systems nominal</p>
                      <p className="empty-subtext">No critical alerts at this time</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">✅</div>
                  <p className="empty-text">No critical alerts</p>
                  <p className="empty-subtext">Blood inventory levels are normal</p>
                </div>
              )}
            </div>
          </div>

          <div className="dashboard-card">
            <div className="card-header-modern">
              <div className="card-title-group">
                <h3 className="card-title">AI Allocation Suggestions</h3>
                <span className="card-count">{rlRecommendations.length} live recommendations</span>
              </div>
              <button
                className="btn-link-modern"
                onClick={fetchRLRecommendations}
              >
                Refresh →
              </button>
            </div>
            <div className="card-body-modern">
              <div style={{ fontSize: '12px', marginBottom: '10px', color: '#64748b' }}>
                Status: {rlMeta.status === 'live' ? 'Live' : rlMeta.status === 'error' ? 'Error' : 'Offline'}
                {rlMeta.computeMs ? ` | Compute ${rlMeta.computeMs} ms` : ''}
              </div>

              {rlRecommendations.length > 0 ? (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {rlRecommendations.map((item, index) => (
                    <div
                      key={`${item.emergencyId || 'em'}-${item.sourceHospitalId || 'src'}-${item.targetHospitalId || 'dst'}-${index}`}
                      style={{
                        border: '1px solid rgba(148, 163, 184, 0.25)',
                        borderRadius: '10px',
                        padding: '10px',
                        background: 'rgba(248, 250, 252, 0.5)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                        <strong>{item.sourceHospitalName || 'Source Hospital'} → {item.targetHospitalName || 'Target Hospital'}</strong>
                        <span style={{ fontSize: '12px', color: '#334155' }}>Confidence {(Number(item.confidence || 0) * 100).toFixed(0)}%</span>
                      </div>
                      <div style={{ marginTop: '6px', fontSize: '13px', color: '#1f2937' }}>
                        Send {item.units} unit(s) of {item.bloodGroup} | Priority #{item.routingPriority}
                      </div>
                      <div style={{ marginTop: '6px', fontSize: '12px', color: '#475569' }}>
                        {item.explanation}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '18px 8px', color: '#64748b' }}>
                  No active allocation suggestion yet. Recommendations appear automatically during emergency/inventory updates.
                </div>
              )}
            </div>
          </div>

          <div className="dashboard-card">
            <div className="card-header-modern">
              <div className="card-title-group">
                <h3 className="card-title">Network Intelligence</h3>
                <span className="card-count">Stability {graphInsights.stabilityScore.toFixed(1)}</span>
              </div>
              <button
                className="btn-link-modern"
                onClick={fetchGraphIntelligence}
              >
                Refresh →
              </button>
            </div>
            <div className="card-body-modern">
              <div style={{ fontSize: '12px', marginBottom: '10px', color: '#64748b' }}>
                Status: {graphInsights.status === 'live' ? 'Live' : graphInsights.status === 'error' ? 'Error' : 'Offline'}
                {graphInsights.computeMs ? ` | Compute ${graphInsights.computeMs} ms` : ''}
              </div>

              <div style={{ display: 'grid', gap: '12px' }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '6px' }}>Top Critical Hospitals</div>
                  {graphInsights.criticalHospitals.length ? (
                    <div style={{ display: 'grid', gap: '6px' }}>
                      {graphInsights.criticalHospitals.map((item, idx) => (
                        <div key={`${item.hospitalId || item.sourceHospitalId || 'h'}-${idx}`} style={{ fontSize: '13px', color: '#1f2937' }}>
                          {idx + 1}. {item.hospitalName || item.sourceHospitalName || item.hospitalId || 'Unknown Hospital'}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '13px', color: '#64748b' }}>No critical node data yet.</div>
                  )}
                </div>

                <div>
                  <div style={{ fontWeight: 600, marginBottom: '6px' }}>Weak Regions</div>
                  <div style={{ display: 'grid', gap: '6px' }}>
                    {(graphInsights.weakRegions || []).map((region, idx) => (
                      <div key={`weak-${idx}`} style={{ fontSize: '13px', color: '#475569' }}>
                        • {region}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontWeight: 600, marginBottom: '6px' }}>Bottlenecks</div>
                  {graphInsights.bottlenecks.length ? (
                    <div style={{ display: 'grid', gap: '6px' }}>
                      {graphInsights.bottlenecks.map((item, idx) => (
                        <div key={`${item.hospitalId || 'b'}-${idx}`} style={{ fontSize: '13px', color: '#1f2937' }}>
                          {item.hospitalName || item.hospitalId || 'Unknown'} ({item.riskLevel || 'moderate'})
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '13px', color: '#64748b' }}>No bottleneck data yet.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Section */}
        <div className="quick-actions-section">
          <h2 className="section-title">🛡️ Service Health</h2>
          <div className="dashboard-card" style={{ marginBottom: '24px' }}>
            <div className="card-header-modern">
              <div className="card-title-group">
                <h3 className="card-title">Operational Status</h3>
                <span className="card-count">
                  {systemHealth.checking ? 'Checking...' : `Updated ${systemHealth.checkedAt ? new Date(systemHealth.checkedAt).toLocaleTimeString() : 'just now'}`}
                </span>
              </div>
              <button className="btn-link-modern" onClick={fetchSystemHealth}>Check Now →</button>
            </div>
            <div className="card-body-modern">
              <div style={{ display: 'grid', gap: '10px' }}>
                {[
                  { label: 'Backend API', data: systemHealth.backend },
                  { label: 'ML Service', data: systemHealth.ml },
                  { label: 'Realtime Socket', data: systemHealth.socket }
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      border: '1px solid rgba(148, 163, 184, 0.25)',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      background: 'rgba(248, 250, 252, 0.5)'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{item.label}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{item.data.detail}</div>
                    </div>
                    <span style={{ fontWeight: 700, color: statusColor(item.data.status) }}>
                      {getStatusLabel(item.data.status)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

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
              <GeoTimeHeatmap hospitalLocation={hospitalLocation} />
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
                {expiringUnits.length > 0 ? (
                  expiringUnits.map((unit, idx) => (
                    <WasteRiskIndicator 
                      key={unit.bloodUnitId || unit._id || idx}
                      unit={{
                        bloodUnitId: unit.bloodUnitId || unit.unitId || unit._id || `Unit-${idx + 1}`,
                        bloodGroup: unit.bloodGroup || 'Unknown',
                        expiryDate: unit.expiryDate ? new Date(unit.expiryDate) : new Date(Date.now() + 48 * 60 * 60 * 1000),
                        status: unit.status || 'Available'
                      }}
                      showSuggestions={true}
                    />
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '24px', color: '#10b981' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
                    <p style={{ fontWeight: '600' }}>No units at risk</p>
                    <p style={{ fontSize: '13px', color: '#6b7280' }}>All blood units are well within expiry dates</p>
                  </div>
                )}
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
                <p className="action-description">Manage blood requests</p>
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
                <span className="action-icon">🚑</span>
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
                <p className="action-description">{pendingDoctors.length} pending</p>
              </div>
              <div className="action-arrow">→</div>
            </button>

            <button 
              className="quick-action-card ml-card"
              onClick={() => navigate('/admin/ml-intelligence')}
            >
              <div className="action-icon-wrapper">
                <span className="action-icon">🤖</span>
              </div>
              <div className="action-content">
                <h4 className="action-title">ML Intelligence</h4>
                <p className="action-description">AI-powered analytics</p>
              </div>
              <div className="action-arrow">→</div>
            </button>

            <button 
              className="quick-action-card appointments-card"
              onClick={() => navigate('/admin/appointments')}
            >
              <div className="action-icon-wrapper">
                <span className="action-icon">📅</span>
              </div>
              <div className="action-content">
                <h4 className="action-title">Appointments</h4>
                <p className="action-description">View hospital appointments</p>
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
