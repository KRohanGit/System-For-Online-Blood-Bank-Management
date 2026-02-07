import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DonorLayout from '../../components/DonorLayout';

const Certificates = () => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/donor-dashboard/certificates`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCertificates(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching certificates:', error);
      setLoading(false);
    }
  };

  if (loading) return <DonorLayout><div style={{ padding: '20px' }}>Loading...</div></DonorLayout>;

  return (
    <DonorLayout>
    <div style={{ padding: '20px' }}>
      <h2>Donation Certificates</h2>

      {certificates.length === 0 ? (
        <p>No certificates found</p>
      ) : (
        <div style={{ marginTop: '20px' }}>
          {certificates.map((cert) => (
            <div
              key={cert._id}
              style={{
                border: '1px solid #ccc',
                padding: '15px',
                marginBottom: '15px'
              }}
            >
              <h3>Certificate: {cert.certificateNumber}</h3>
              <p>Donor: {cert.donorName}</p>
              <p>Blood Group: {cert.bloodGroup}</p>
              <p>Donation Date: {new Date(cert.donationDate).toLocaleDateString()}</p>
              <p>Units: {cert.units}</p>
              <p>Verified: {cert.isVerified ? 'Yes' : 'No'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
    </DonorLayout>
  );
};

export default Certificates;
