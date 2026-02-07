import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DonorLayout from '../../components/DonorLayout';

const EmergencyMessages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/emergency/messages`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setLoading(false);
    }
  };

  const markAsRead = async (messageId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${process.env.REACT_APP_API_URL}/api/emergency/messages/${messageId}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchMessages();
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  if (loading) return <DonorLayout><div style={{ padding: '20px' }}>Loading...</div></DonorLayout>;

  return (
    <DonorLayout>
    <div style={{ padding: '20px' }}>
      <h2>Emergency Messages</h2>

      {messages.length === 0 ? (
        <p>No emergency messages</p>
      ) : (
        <div style={{ marginTop: '20px' }}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                border: msg.readStatus ? '1px solid #ccc' : '2px solid #000',
                padding: '15px',
                marginBottom: '15px',
                backgroundColor: msg.readStatus ? '#fff' : '#f5f5f5'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <strong>{msg.hospitalName}</strong>
                <span>{new Date(msg.createdAt).toLocaleString()}</span>
              </div>
              <p>Blood Group: {msg.bloodGroup}</p>
              <p style={{ margin: '10px 0' }}>{msg.message}</p>
              {!msg.readStatus && (
                <button
                  onClick={() => markAsRead(msg.id)}
                  style={{ padding: '5px 15px' }}
                >
                  Mark as Read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
    </DonorLayout>
  );
};

export default EmergencyMessages;
