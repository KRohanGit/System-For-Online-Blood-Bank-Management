import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DonorLayout from '../../components/DonorLayout';

const DonorDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/donor-dashboard/dashboard`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDashboard(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      setLoading(false);
    }
  };

  if (loading) return <DonorLayout><div style={{ padding: '20px' }}>Loading...</div></DonorLayout>;
  if (!dashboard) return <DonorLayout><div style={{ padding: '20px' }}>No data available</div></DonorLayout>;

  return (
    <DonorLayout>
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Donor Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ border: '1px solid #ccc', padding: '20px' }}>
          <h3>Credential Status</h3>
          <p style={{ fontSize: '24px', margin: '10px 0' }}>{dashboard.credentialStatus}</p>
        </div>

        <div style={{ border: '1px solid #ccc', padding: '20px' }}>
          <h3>Total Donations</h3>
          <p style={{ fontSize: '24px', margin: '10px 0' }}>{dashboard.totalDonations}</p>
        </div>

        <div style={{ border: '1px solid #ccc', padding: '20px' }}>
          <h3>Certificates</h3>
          <p style={{ fontSize: '24px', margin: '10px 0' }}>{dashboard.certificateCount}</p>
        </div>

        <div style={{ border: '1px solid #ccc', padding: '20px' }}>
          <h3>Unread Messages</h3>
          <p style={{ fontSize: '24px', margin: '10px 0' }}>{dashboard.unreadMessages}</p>
        </div>
      </div>

      <div style={{ border: '1px solid #ccc', padding: '20px', marginBottom: '20px' }}>
        <h3>Last Donation</h3>
        <p>
          {dashboard.lastDonationDate
            ? new Date(dashboard.lastDonationDate).toLocaleDateString()
            : 'No donations yet'}
        </p>
      </div>

      <div style={{ border: '1px solid #ccc', padding: '20px' }}>
        <h3>Next Eligible Date</h3>
        <p>
          {dashboard.nextEligibleDate
            ? new Date(dashboard.nextEligibleDate).toLocaleDateString()
            : 'N/A'}
        </p>
        <small>You can donate again after 90 days from your last donation</small>
      </div>
    </div>
    </DonorLayout>
  );
};

export default DonorDashboard;
