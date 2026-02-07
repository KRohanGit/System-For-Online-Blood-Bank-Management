import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DonorLayout from '../../components/DonorLayout';

const DonationHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/donor-dashboard/history`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setHistory(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching history:', error);
      setLoading(false);
    }
  };

  if (loading) return <DonorLayout><div style={{ padding: '20px' }}>Loading...</div></DonorLayout>;

  return (
    <DonorLayout>
    <div style={{ padding: '20px' }}>
      <h2>Donation History</h2>

      {history.length === 0 ? (
        <p>No donation history found</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #000' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Date</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Blood Group</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Units</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {history.map((donation) => (
              <tr key={donation._id} style={{ borderBottom: '1px solid #ccc' }}>
                <td style={{ padding: '10px' }}>
                  {new Date(donation.donationDate).toLocaleDateString()}
                </td>
                <td style={{ padding: '10px' }}>{donation.bloodGroup}</td>
                <td style={{ padding: '10px' }}>{donation.units}</td>
                <td style={{ padding: '10px' }}>{donation.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
    </DonorLayout>
  );
};

export default DonationHistory;
