import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DonationList = () => {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDonations();
  }, []);

  const fetchDonations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/donations/list`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDonations(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching donations:', error);
      setLoading(false);
    }
  };

  const completeDonation = async (donationId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${process.env.REACT_APP_API_URL}/api/donations/complete/${donationId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchDonations();
    } catch (error) {
      console.error('Error completing donation:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h3>Donations</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #000' }}>
            <th style={{ padding: '10px', textAlign: 'left' }}>Donor</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Blood Group</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Units</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
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
              <td style={{ padding: '10px' }}>{donation.status}</td>
              <td style={{ padding: '10px' }}>
                {new Date(donation.donationDate).toLocaleDateString()}
              </td>
              <td style={{ padding: '10px' }}>
                {donation.status === 'PENDING' && (
                  <button
                    onClick={() => completeDonation(donation._id)}
                    style={{ padding: '5px 10px' }}
                  >
                    Complete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DonationList;
