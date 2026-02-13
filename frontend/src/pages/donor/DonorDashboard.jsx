import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DonorLayout from '../../components/DonorLayout';
import DonorStatsCard from '../../components/donor/DonorStatsCard';
import DonorEligibilityInfo from '../../components/donor/DonorEligibilityInfo';
import DonationHistoryTable from '../../components/donor/DonationHistoryTable';
import CertificatesList from '../../components/donor/CertificatesList';
import './DonorDashboard.css';

const DonorDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [donationHistory, setDonationHistory] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [userName, setUserName] = useState('Donor');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const API_URL = process.env.REACT_APP_API_URL;

      // Fetch dashboard, history, and certificates in parallel
      const [dashboardRes, historyRes, certificatesRes] = await Promise.all([
        axios.get(`${API_URL}/api/donor-dashboard/dashboard`, { headers }),
        axios.get(`${API_URL}/api/donor-dashboard/history`, { headers }),
        axios.get(`${API_URL}/api/donor-dashboard/certificates`, { headers })
      ]);

      setDashboard(dashboardRes.data.data);
      setDonationHistory(historyRes.data.data || []);
      setCertificates(certificatesRes.data.data || []);
      
      // Get user name from dashboard or profile
      if (dashboardRes.data.data?.donorProfile?.fullName) {
        setUserName(dashboardRes.data.data.donorProfile.fullName);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
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
        </div>

        <div className="tabs-content">
          {activeTab === 'overview' && (
            <div className="overview-tab">
              <p className="welcome-message">
                Track your donations, view certificates, and check your eligibility status.
              </p>
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
        </div>
      </div>
    </div>
    </DonorLayout>
  );
};

export default DonorDashboard;
