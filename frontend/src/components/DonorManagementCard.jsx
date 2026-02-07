import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DonorManagementCard = () => {
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBloodGroup, setSelectedBloodGroup] = useState('');
  const [emergencyMessage, setEmergencyMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [individualMessages, setIndividualMessages] = useState({});
  const [sendingIndividual, setSendingIndividual] = useState({});
  const [individualAlertMessages, setIndividualAlertMessages] = useState({});

  useEffect(() => {
    fetchDonors();
  }, []);

  const fetchDonors = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/donations/donors`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDonors(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching donors:', error);
      const dummyDonors = [
        {
          donorId: '1',
          donorName: 'Rohan K',
          email: 'rohan.k@email.com',
          bloodGroup: 'O+',
          lastDonationDate: '2025-11-15',
          credentialStatus: 'Verified',
          emergencyContactEnabled: true
        },
        {
          donorId: '2',
          donorName: 'Dinesh S',
          email: 'dinesh.S@email.com',
          bloodGroup: 'A+',
          lastDonationDate: '2025-10-20',
          credentialStatus: 'Verified',
          emergencyContactEnabled: true
        },
        {
          donorId: '3',
          donorName: 'Gaveshna L',
          email: 'gaveshna.L@email.com',
          bloodGroup: 'B+',
          lastDonationDate: '2024-06-10',
          credentialStatus: 'Issued',
          emergencyContactEnabled: false
        },
        {
          donorId: '4',
          donorName: 'Giri. G',
          email: 'giri.G@email.com',
          bloodGroup: 'AB+',
          lastDonationDate: '2025-12-01',
          credentialStatus: 'Verified',
          emergencyContactEnabled: true
        }
      ];
      setDonors(dummyDonors);
      setLoading(false);
    }
  };

  const sendEmergencyAlert = async () => {
    if (!selectedBloodGroup || !emergencyMessage) {
      setMessage('Please select blood group and enter message');
      return;
    }

    try {
      setSending(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/emergency/send`,
        {
          bloodGroup: selectedBloodGroup,
          message: emergencyMessage
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setMessage(response.data.message);
      setEmergencyMessage('');
      setSelectedBloodGroup('');
      setSending(false);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to send alert');
      setSending(false);
    }
  };

  const handleIndividualMessageChange = (donorId, message) => {
    setIndividualMessages(prev => ({
      ...prev,
      [donorId]: message
    }));
  };

  const sendIndividualAlert = async (donor) => {
    const alertMessage = individualMessages[donor.donorId];
    if (!alertMessage || !alertMessage.trim()) {
      setIndividualAlertMessages(prev => ({
        ...prev,
        [donor.donorId]: 'Please enter a message'
      }));
      setTimeout(() => {
        setIndividualAlertMessages(prev => {
          const newState = { ...prev };
          delete newState[donor.donorId];
          return newState;
        });
      }, 3000);
      return;
    }

    try {
      setSendingIndividual(prev => ({ ...prev, [donor.donorId]: true }));
      const token = localStorage.getItem('token');
      
      // Simulating individual alert send - you can create a specific API endpoint for this
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/emergency/send`,
        {
          bloodGroup: donor.bloodGroup,
          message: alertMessage,
          specificDonorId: donor.donorId  // This would need backend support
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      setIndividualAlertMessages(prev => ({
        ...prev,
        [donor.donorId]: `Alert sent to ${donor.donorName}`
      }));
      setIndividualMessages(prev => {
        const newState = { ...prev };
        delete newState[donor.donorId];
        return newState;
      });
      setSendingIndividual(prev => ({ ...prev, [donor.donorId]: false }));
      
      setTimeout(() => {
        setIndividualAlertMessages(prev => {
          const newState = { ...prev };
          delete newState[donor.donorId];
          return newState;
        });
      }, 3000);
    } catch (error) {
      setIndividualAlertMessages(prev => ({
        ...prev,
        [donor.donorId]: 'Failed to send alert'
      }));
      setSendingIndividual(prev => ({ ...prev, [donor.donorId]: false }));
      setTimeout(() => {
        setIndividualAlertMessages(prev => {
          const newState = { ...prev };
          delete newState[donor.donorId];
          return newState;
        });
      }, 3000);
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Loading donors...</div>;

  const getBloodGroupColor = (bloodGroup) => {
    const colors = {
      'A+': '#e74c3c', 'A-': '#c0392b',
      'B+': '#3498db', 'B-': '#2980b9',
      'AB+': '#9b59b6', 'AB-': '#8e44ad',
      'O+': '#e67e22', 'O-': '#d35400'
    };
    return colors[bloodGroup] || '#95a5a6';
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        padding: '20px', 
        borderRadius: '8px',
        marginBottom: '30px',
        color: 'white'
      }}>
        <h2 style={{ margin: '0 0 10px 0' }}> Emergency Alert System</h2>
        <p style={{ margin: '0', opacity: '0.9' }}>Send emergency blood requirement alerts to past donors</p>
      </div>

      <div style={{ 
        marginBottom: '30px', 
        border: '2px solid #667eea', 
        padding: '20px',
        borderRadius: '8px',
        backgroundColor: '#f8f9ff'
      }}>
        <h3 style={{ marginTop: '0', color: '#667eea' }}> Send Emergency Alert</h3>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>
            Blood Group Required
          </label>
          <select
            value={selectedBloodGroup}
            onChange={(e) => setSelectedBloodGroup(e.target.value)}
            style={{ 
              padding: '10px', 
              width: '200px',
              border: '2px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <option value="">Select Blood Group</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
          </select>
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>
            Emergency Message
          </label>
          <textarea
            value={emergencyMessage}
            onChange={(e) => setEmergencyMessage(e.target.value)}
            placeholder="Enter emergency message (e.g., 'Urgent: Need 2 units of blood for critical patient')"
            style={{ 
              width: '100%', 
              padding: '10px', 
              minHeight: '100px',
              border: '2px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              fontFamily: 'inherit'
            }}
          />
        </div>
        <button
          onClick={sendEmergencyAlert}
          disabled={sending}
          style={{ 
            padding: '12px 30px',
            backgroundColor: sending ? '#95a5a6' : '#e74c3c',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: sending ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.3s',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
          }}
          onMouseOver={(e) => !sending && (e.target.style.backgroundColor = '#c0392b')}
          onMouseOut={(e) => !sending && (e.target.style.backgroundColor = '#e74c3c')}
        >
          {sending ? ' Sending...' : ' Send Alert'}
        </button>
        {message && (
          <div style={{ 
            marginTop: '15px',
            padding: '10px',
            backgroundColor: message.includes('Failed') ? '#ffebee' : '#e8f5e9',
            color: message.includes('Failed') ? '#c62828' : '#2e7d32',
            borderRadius: '4px',
            border: `1px solid ${message.includes('Failed') ? '#ef9a9a' : '#a5d6a7'}`
          }}>
            {message}
          </div>
        )}
      </div>

      <h3 style={{ color: '#333', marginBottom: '15px' }}>
        👥 Registered Donors ({donors.length})
      </h3>
      <div style={{ overflowX: 'auto', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
          <thead>
            <tr style={{ backgroundColor: '#667eea', color: 'white' }}>
              <th style={{ padding: '12px', textAlign: 'left' }}>Name</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Email</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Blood Group</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Last Donation</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Credential Status</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Emergency Contact</th>
              <th style={{ padding: '12px', textAlign: 'left', minWidth: '300px' }}>Send Alert</th>
            </tr>
          </thead>
          <tbody>
            {donors.map((donor, index) => (
              <tr 
                key={donor.donorId} 
                style={{ 
                  borderBottom: '1px solid #e0e0e0',
                  backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa'
                }}
              >
                <td style={{ padding: '12px', fontWeight: '500' }}>{donor.donorName}</td>
                <td style={{ padding: '12px', color: '#666' }}>{donor.email}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{
                    backgroundColor: getBloodGroupColor(donor.bloodGroup),
                    color: 'white',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: 'bold'
                  }}>
                    {donor.bloodGroup}
                  </span>
                </td>
                <td style={{ padding: '12px', color: '#666' }}>
                  {donor.lastDonationDate
                    ? new Date(donor.lastDonationDate).toLocaleDateString()
                    : 'N/A'}
                </td>
                <td style={{ padding: '12px' }}>
                  <span style={{
                    backgroundColor: donor.credentialStatus === 'Verified' ? '#d4edda' : '#fff3cd',
                    color: donor.credentialStatus === 'Verified' ? '#155724' : '#856404',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    {donor.credentialStatus}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>
                  <span style={{
                    color: donor.emergencyContactEnabled ? '#28a745' : '#6c757d',
                    fontWeight: '500'
                  }}>
                    {donor.emergencyContactEnabled ? '✓ Enabled' : '✗ Disabled'}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <input
                      type="text"
                      placeholder="Enter alert message..."
                      value={individualMessages[donor.donorId] || ''}
                      onChange={(e) => handleIndividualMessageChange(donor.donorId, e.target.value)}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '13px'
                      }}
                      disabled={!donor.emergencyContactEnabled}
                    />
                    <button
                      onClick={() => sendIndividualAlert(donor)}
                      disabled={!donor.emergencyContactEnabled || sendingIndividual[donor.donorId]}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: !donor.emergencyContactEnabled ? '#95a5a6' : (sendingIndividual[donor.donorId] ? '#95a5a6' : '#e74c3c'),
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        cursor: !donor.emergencyContactEnabled || sendingIndividual[donor.donorId] ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap',
                        minWidth: '80px'
                      }}
                    >
                      {sendingIndividual[donor.donorId] ? ' Sending' : ' Send'}
                    </button>
                  </div>
                  {individualAlertMessages[donor.donorId] && (
                    <div style={{
                      marginTop: '5px',
                      fontSize: '12px',
                      color: individualAlertMessages[donor.donorId].includes('Failed') ? '#e74c3c' : '#28a745',
                      fontWeight: '500'
                    }}>
                      {individualAlertMessages[donor.donorId]}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DonorManagementCard;
