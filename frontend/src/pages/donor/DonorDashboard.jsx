import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import DonorLayout from '../../components/DonorLayout';
import DonorStatsCard from '../../components/donor/DonorStatsCard';
import DonorEligibilityInfo from '../../components/donor/DonorEligibilityInfo';
import DonationHistoryTable from '../../components/donor/DonationHistoryTable';
import CertificatesList from '../../components/donor/CertificatesList';
import bloodApi from '../../services/bloodApi';
import { connectSocket, onEvent } from '../../services/socketService';
import './DonorDashboard.css';

const DonorDashboard = () => {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [donationHistory, setDonationHistory] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [donorBloodUnits, setDonorBloodUnits] = useState([]);
  const [traceLoading, setTraceLoading] = useState(true);
  const [traceError, setTraceError] = useState('');
  const [traceUnitIdInput, setTraceUnitIdInput] = useState('');
  const [liveUpdateMessage, setLiveUpdateMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [userName, setUserName] = useState('Donor');

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const role = String(user.role || localStorage.getItem('role') || 'donor').toLowerCase();
    const userId = user.id || user._id;
    if (!userId) return;

    connectSocket(userId, role);

    const refreshOnRealtime = async (message) => {
      if (message) {
        setLiveUpdateMessage(message);
      }
      await fetchAllData();
    };

    const offTraceUpdate = onEvent('blood_trace_update', async (payload) => {
      await refreshOnRealtime(payload?.message || 'Blood trace updated in realtime.');
    });

    const offDonorChainUpdate = onEvent('donor_chain_update', async () => {
      await refreshOnRealtime('Emergency donor chain update received.');
    });

    return () => {
      offTraceUpdate();
      offDonorChainUpdate();
    };
  }, []);

  const fetchAllData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const API_URL = process.env.REACT_APP_API_URL || '/api';

      const [dashboardRes, historyRes, certificatesRes] = await Promise.all([
        axios.get(`${API_URL}/donor-dashboard/dashboard`, { headers }),
        axios.get(`${API_URL}/donor-dashboard/history`, { headers }),
        axios.get(`${API_URL}/donor-dashboard/certificates`, { headers })
      ]);

      setDashboard(dashboardRes.data.data);
      setDonationHistory(historyRes.data.data || []);
      setCertificates(certificatesRes.data.data || []);
      
      // Get user name from dashboard or profile
      if (dashboardRes.data.data?.donorProfile?.fullName) {
        setUserName(dashboardRes.data.data.donorProfile.fullName);
      }

      try {
        const donorTraceRes = await bloodApi.getDonorBloodUnits();
        setDonorBloodUnits(donorTraceRes?.data || []);
      } catch (traceFetchError) {
        console.error('Error fetching donor trace data:', traceFetchError);
        setTraceError(traceFetchError?.message || 'Unable to load blood trace data right now.');
      } finally {
        setTraceLoading(false);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setTraceLoading(false);
      setLoading(false);
    }
  };

  const openTraceScanner = () => {
    navigate('/trace');
  };

  const openTraceByUnit = (unitId) => {
    if (!unitId) return;
    navigate(`/trace/${encodeURIComponent(unitId)}`);
  };

  const submitTraceLookup = (e) => {
    e.preventDefault();
    if (!traceUnitIdInput.trim()) return;
    openTraceByUnit(traceUnitIdInput.trim());
  };

  if (loading) return <DonorLayout><div className="loading-state">Loading dashboard...</div></DonorLayout>;
  if (!dashboard) return <DonorLayout><div className="error-state">No data available</div></DonorLayout>;

  return (
    <DonorLayout>
    <div className="donor-dashboard-container">
      <h1>Welcome Back, {userName} 👋</h1>

      {/* Stats Cards */}
      <div className="stats-grid">
        <DonorStatsCard 
          icon="✅" 
          title="Credential Status" 
          value={dashboard.credentialStatus} 
        />
        <DonorStatsCard 
          icon="🩸" 
          title="Total Donations" 
          value={dashboard.totalDonations} 
        />
        <DonorStatsCard 
          icon="🏆" 
          title="Certificates" 
          value={dashboard.certificateCount} 
        />
        <DonorStatsCard 
          icon="💬" 
          title="Unread Messages" 
          value={dashboard.unreadMessages} 
        />
      </div>

      {/* Donation Eligibility Info */}
      <DonorEligibilityInfo 
        lastDonationDate={dashboard.lastDonationDate}
        nextEligibleDate={dashboard.nextEligibleDate}
      />

      {/* Tabs */}
      <div className="tabs-section">
        <div className="tabs-header">
          <button
            className={activeTab === 'overview' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('overview')}
          >
            📊 Overview
          </button>
          <button
            className={activeTab === 'history' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('history')}
          >
            📋 Donation History
          </button>
          <button
            className={activeTab === 'certificates' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('certificates')}
          >
            🏆 Certificates
          </button>
          <button
            className={activeTab === 'trace' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('trace')}
          >
            🔎 Blood Trace & QR
          </button>
        </div>

        <div className="tabs-content">
          {activeTab === 'overview' && (
            <div className="overview-tab">
              <p className="welcome-message">
                Track your donations, view certificates, check eligibility status, and trace blood usage through QR.
              </p>
              <div className="overview-actions">
                <button className="trace-action-btn" onClick={openTraceScanner}>
                  Scan Blood QR
                </button>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="history-tab">
              <h2>Donation History</h2>
              <DonationHistoryTable donations={donationHistory} />
            </div>
          )}

          {activeTab === 'certificates' && (
            <div className="certificates-tab">
              <h2>Your Certificates</h2>
              <CertificatesList certificates={certificates} />
            </div>
          )}

          {activeTab === 'trace' && (
            <div className="trace-tab">
              <h2>Blood Trace & QR Verification</h2>
              <p className="trace-subtitle">
                Verify where your donated blood went, whether it was used, and the emergency context.
              </p>

              <div className="trace-actions-row">
                <button className="trace-action-btn" onClick={openTraceScanner}>
                  Open QR Scanner
                </button>
              </div>

              {liveUpdateMessage && <p className="trace-live-message">{liveUpdateMessage}</p>}

              <form className="trace-lookup-form" onSubmit={submitTraceLookup}>
                <input
                  type="text"
                  placeholder="Enter blood unit ID (e.g., BU-...)"
                  value={traceUnitIdInput}
                  onChange={(e) => setTraceUnitIdInput(e.target.value)}
                />
                <button type="submit">View Trace</button>
              </form>

              {traceLoading && <p className="trace-loading">Loading your blood trace records...</p>}
              {!traceLoading && traceError && <p className="trace-error">{traceError}</p>}

              {!traceLoading && !traceError && donorBloodUnits.length === 0 && (
                <p className="trace-empty">No blood unit traces found yet for your profile.</p>
              )}

              {!traceLoading && !traceError && donorBloodUnits.length > 0 && (
                <div className="trace-list">
                  {donorBloodUnits.map((unit) => (
                    <div key={unit.unitId} className="trace-card">
                      <div className="trace-card-header">
                        <h3>{unit.unitId}</h3>
                        <span className={`trace-status trace-status-${String(unit.status || '').toLowerCase()}`}>
                          {unit.status || 'UNKNOWN'}
                        </span>
                      </div>
                      <p><strong>Blood Group:</strong> {unit.bloodGroup || 'N/A'}</p>
                      <p>
                        <strong>Collection Date:</strong>{' '}
                        {unit.collectionDate ? new Date(unit.collectionDate).toLocaleDateString() : 'N/A'}
                      </p>
                      <p className="trace-impact-message">{unit.donationMessage || 'Trace details available from timeline.'}</p>
                      {unit.impactInfo?.wasUsed && (
                        <div className="trace-usage-context">
                          <span>Used for: {unit.impactInfo?.procedureType || 'transfusion'}</span>
                        </div>
                      )}
                      <button className="trace-view-btn" onClick={() => openTraceByUnit(unit.unitId)}>
                        View Full Timeline
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
    </DonorLayout>
  );
};

export default DonorDashboard;
