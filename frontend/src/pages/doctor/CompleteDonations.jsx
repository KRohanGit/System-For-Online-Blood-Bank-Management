import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CompleteDonations = () => {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchPendingDonations();
  }, []);

  const fetchPendingDonations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/donations/list`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const pending = response.data.data.filter(d => d.status === 'PENDING');
      setDonations(pending);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching donations:', error);
      setLoading(false);
    }
  };

  const completeDonation = async (donationId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${process.env.REACT_APP_API_URL}/api/donations/complete/${donationId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage(response.data.message);
      fetchPendingDonations();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to complete donation');
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2>Complete Donations</h2>

      {message && (
        <div style={{ padding: '10px', marginBottom: '20px', border: '1px solid #000' }}>
          {message}
        </div>
      )}

      {donations.length === 0 ? (
        <p>No pending donations</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #000' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Donor</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Blood Group</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Units</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Date</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {donations.map((donation) => (
              <tr key={donation._id} style={{ borderBottom: '1px solid #ccc' }}>
                <td style={{ padding: '10px' }}>
                  {donation.donorId?.fullName || 'N/A'}
                </td>
                <td style={{ padding: '10px' }}>{donation.bloodGroup}</td>
                <td style={{ padding: '10px' }}>{donation.units}</td>
                <td style={{ padding: '10px' }}>
                  {new Date(donation.createdAt).toLocaleDateString()}
                </td>
                <td style={{ padding: '10px' }}>
                  <button
                    onClick={() => completeDonation(donation._id)}
                    style={{ padding: '8px 15px' }}
                  >
                    Complete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default CompleteDonations;
