import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import EmergencyRequestCard from '../../components/emergency/EmergencyRequestCard';
import NewEmergencyRequestModal from '../../components/emergency/NewEmergencyRequestModal';
import SendMessageModal from '../../components/emergency/SendMessageModal';
import config from '../../config/config';
import {
  createEmergencyRequest,
  getEmergencyRequests,
  acceptEmergencyRequest,
  declineEmergencyRequest
} from '../../services/emergencyCoordinationApi';
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
      const data = await getEmergencyRequests();

      // Backend returns { requests } (flat list). Older shape used { incoming, outgoing }.
      if (Array.isArray(data.requests)) {
        setIncomingRequests(data.requests);
        setOutgoingRequests([]);
      } else {
        setIncomingRequests(data.incoming || []);
        setOutgoingRequests(data.outgoing || []);
      }
    } catch (error) {
      console.error('Error loading emergency requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadNearbyHospitals = async () => {
    try {
      // Reuse existing hospital listing endpoint for partner selection in modals.
      const response = await fetch(`${config.API_URL}/hospital/list`);
      if (!response.ok) return;

      const data = await response.json();
      setNearbyHospitals(data.hospitals || []);
    } catch (error) {
      console.error('Error loading nearby hospitals:', error);
    }
  };

  const handleCreateRequest = async (formData) => {
    try {
      const severityLevel = formData.urgencyLevel === 'MEDIUM' ? 'MODERATE' : formData.urgencyLevel;
      const requestPayload = {
        bloodGroup: formData.bloodGroup,
        unitsRequired: Number(formData.unitsRequired),
        severityLevel,
        medicalJustification: `${formData.patientCriticality || 'Emergency case'}${formData.notes ? ` - ${formData.notes}` : ''}`,
        patientDetails: {
          age: 30,
          gender: 'Male',
          diagnosis: formData.patientCriticality || 'Emergency transfusion required'
        },
        requiredBy: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
      };

      await createEmergencyRequest(requestPayload);
      setShowNewRequestModal(false);
      loadEmergencyRequests();
      alert('Emergency request created successfully');
    } catch (error) {
      console.error('Error creating request:', error);
      alert('Failed to create emergency request');
    }
  };

  const handleSendMessage = async (formData) => {
    try {
      console.log('Inter-hospital message payload:', formData);
      setShowMessageModal(false);
      alert('Messaging endpoint is not enabled yet in backend; use emergency requests for coordination.');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await acceptEmergencyRequest(requestId, {
        unitsCommitted: 1,
        estimatedDeliveryTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        notes: 'Accepted from coordination dashboard'
      });
      loadEmergencyRequests();
      alert('Request accepted successfully');
    } catch (error) {
      console.error('Error accepting request:', error);
      alert('Failed to accept request');
    }
  };

  const handleRejectRequest = async (requestId) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      await declineEmergencyRequest(requestId, reason);
      loadEmergencyRequests();
      alert('Request rejected');
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
