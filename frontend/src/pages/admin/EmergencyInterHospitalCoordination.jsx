import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import EmergencyRequestCard from '../../components/emergency/EmergencyRequestCard';
import NewEmergencyRequestModal from '../../components/emergency/NewEmergencyRequestModal';
import SendMessageModal from '../../components/emergency/SendMessageModal';
import './EmergencyInterHospitalCoordination.css';

const EmergencyInterHospitalCoordination = () => {
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [nearbyHospitals, setNearbyHospitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [activeTab, setActiveTab] = useState('incoming');

  useEffect(() => {
    loadEmergencyRequests();
    loadNearbyHospitals();
  }, []);

  const loadEmergencyRequests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/emergency-coordination/requests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Backend returns { requests } (flat list). Older shape used { incoming, outgoing }.
        if (Array.isArray(data.requests)) {
          // For now show all returned requests as incoming to surface seeded demo data
          setIncomingRequests(data.requests);
          setOutgoingRequests([]);
        } else {
          setIncomingRequests(data.incoming || []);
          setOutgoingRequests(data.outgoing || []);
        }
      }
    } catch (error) {
      console.error('Error loading emergency requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadNearbyHospitals = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/emergency-coordination/nearby-hospitals', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        // backend may return an array or an object with `hospitals`
        if (Array.isArray(data)) setNearbyHospitals(data);
        else setNearbyHospitals(data.hospitals || []);
      }
    } catch (error) {
      console.error('Error loading nearby hospitals:', error);
    }
  };

  const handleCreateRequest = async (formData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/emergency-coordination/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowNewRequestModal(false);
        loadEmergencyRequests();
        alert('Emergency request created successfully');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to create request');
      }
    } catch (error) {
      console.error('Error creating request:', error);
      alert('Failed to create emergency request');
    }
  };

  const handleSendMessage = async (formData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/emergency-coordination/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowMessageModal(false);
        alert('Message sent successfully');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/emergency-coordination/requests/${requestId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'ACCEPT' })
      });

      if (response.ok) {
        loadEmergencyRequests();
        alert('Request accepted successfully');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to accept request');
      }
    } catch (error) {
      console.error('Error accepting request:', error);
      alert('Failed to accept request');
    }
  };

  const handleRejectRequest = async (requestId) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/emergency-coordination/requests/${requestId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'REJECT', reason })
      });

      if (response.ok) {
        loadEmergencyRequests();
        alert('Request rejected');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to reject request');
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Failed to reject request');
    }
  };

  const allRequests = [...incomingRequests, ...outgoingRequests];

  return (
    <DashboardLayout role="hospital_admin">
      <div className="emergency-coordination-page">
        <div className="page-header">
          <div className="header-title">
            <h1>Emergency Inter-Hospital Coordination</h1>
            <p>Real-time blood emergency coordination with partner hospitals</p>
          </div>
          <div className="header-actions">
            <button 
              className="btn-refresh"
              onClick={loadEmergencyRequests}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <button 
              className="btn-message"
              onClick={() => setShowMessageModal(true)}
            >
              Send Message
            </button>
            <button 
              className="btn-new-request"
              onClick={() => setShowNewRequestModal(true)}
            >
              New Emergency Request
            </button>
          </div>
        </div>

        <div className="tabs-container">
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'incoming' ? 'active' : ''}`}
              onClick={() => setActiveTab('incoming')}
            >
              Incoming Requests ({incomingRequests.length})
            </button>
            <button 
              className={`tab ${activeTab === 'outgoing' ? 'active' : ''}`}
              onClick={() => setActiveTab('outgoing')}
            >
              Outgoing Requests ({outgoingRequests.length})
            </button>
          </div>
        </div>

        <div className="requests-container">
          {loading && <div className="loading">Loading emergency requests...</div>}

          {!loading && activeTab === 'incoming' && incomingRequests.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h3>No Incoming Emergency Requests</h3>
              <p>When nearby hospitals send blood requests, they will appear here</p>
            </div>
          )}

          {!loading && activeTab === 'incoming' && incomingRequests.length > 0 && (
            <div className="requests-grid">
              {incomingRequests.map(request => (
                <EmergencyRequestCard
                  key={request._id}
                  request={request}
                  isOutgoing={false}
                  onAccept={handleAcceptRequest}
                  onReject={handleRejectRequest}
                />
              ))}
            </div>
          )}

          {!loading && activeTab === 'outgoing' && outgoingRequests.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📤</div>
              <h3>No Outgoing Emergency Requests</h3>
              <p>Create a new emergency request to coordinate with partner hospitals</p>
              <button 
                className="btn-create-first"
                onClick={() => setShowNewRequestModal(true)}
              >
                Create Your First Request
              </button>
            </div>
          )}

          {!loading && activeTab === 'outgoing' && outgoingRequests.length > 0 && (
            <div className="requests-grid">
              {outgoingRequests.map(request => (
                <EmergencyRequestCard
                  key={request._id}
                  request={request}
                  isOutgoing={true}
                />
              ))}
            </div>
          )}
        </div>

        <NewEmergencyRequestModal
          isOpen={showNewRequestModal}
          onClose={() => setShowNewRequestModal(false)}
          onSubmit={handleCreateRequest}
          nearbyHospitals={nearbyHospitals}
        />

        <SendMessageModal
          isOpen={showMessageModal}
          onClose={() => setShowMessageModal(false)}
          onSubmit={handleSendMessage}
          nearbyHospitals={nearbyHospitals}
          emergencyRequests={allRequests}
        />
      </div>
    </DashboardLayout>
  );
};

export default EmergencyInterHospitalCoordination;
