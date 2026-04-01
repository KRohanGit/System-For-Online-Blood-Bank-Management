import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import config from '../../config/config';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Modal from '../../components/common/Modal';
import Loader from '../../components/common/Loader';
import '../../styles/admin.css';

function BloodRequestsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [requests, setRequests] = useState([]);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const API_URL = config?.API_URL || process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchBloodRequests();
  }, [activeTab]);

  const fetchBloodRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/appointments/hospital`, {
        params: { status: activeTab !== 'all' ? activeTab : undefined },
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = response.data;
      const appointments = data.data?.appointments || data.appointments || data.data || [];
      const mapped = appointments.map((appt) => ({
        id: appt._id,
        patientName: appt.userName || appt.patientName || 'Unknown',
        bloodGroup: appt.bloodGroup || appt.preferredBloodGroup || 'N/A',
        units: appt.units || 1,
        urgency: appt.urgency || appt.priority || 'Regular',
        requestDate: appt.appointmentDate || appt.createdAt,
        status: appt.status || 'pending',
        hospital: appt.hospitalName || 'This Hospital',
        contact: appt.userPhone || appt.contactNumber || 'N/A',
        reason: appt.reason || appt.notes || appt.type || 'Donation'
      }));
      setRequests(mapped);
    } catch (error) {
      console.error('Error fetching blood requests:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request) => {
    if (!window.confirm(`Approve blood request for ${request.patientName} (${request.bloodGroup} - ${request.units} units)?`)) {
      return;
    }

    try {
      // Call API to approve appointment
      const token = localStorage.getItem('token');
      await axios.patch(`${API_URL}/appointments/${request.id}/status`, 
        { status: 'confirmed' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert(`✅ Blood request approved for ${request.patientName}`);
      
      // Update local state
      setRequests(prevRequests => 
        prevRequests.map(r => 
          r.id === request.id ? { ...r, status: 'approved' } : r
        )
      );
      
      fetchBloodRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Failed to approve request. Please try again.');
    }
  };

  const handleReject = (request) => {
    setSelectedRequest(request);
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    try {
      // Call API to reject/cancel appointment
      const token = localStorage.getItem('token');
      await axios.patch(`${API_URL}/appointments/${selectedRequest.id}/status`, 
        { status: 'cancelled', reason: rejectionReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert(`❌ Blood request rejected for ${selectedRequest.patientName}`);
      
      // Update local state
      setRequests(prevRequests => 
        prevRequests.map(r => 
          r.id === selectedRequest.id ? { ...r, status: 'rejected', rejectionReason } : r
        )
      );
      
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedRequest(null);
      
      fetchBloodRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Failed to reject request. Please try again.');
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency.toLowerCase()) {
      case 'emergency': return '#dc3545';
      case 'urgent': return '#fd7e14';
      case 'regular': return '#28a745';
      default: return '#6c757d';
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Loader text="Loading blood requests..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="blood-requests-page">
        <div className="page-header">
          <button className="back-button" onClick={() => navigate('/admin/dashboard')}>
            ← Back
          </button>
          <div className="page-title-section">
            <h1 className="page-title">Blood Requests Management</h1>
            <p className="page-subtitle">Manage and process blood donation requests</p>
          </div>
        </div>

        <div className="tabs-container">
          <button
            className={`tab-button ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            Pending
            <span className="tab-badge">{requests.filter(r => r.status === 'pending').length}</span>
          </button>
          <button
            className={`tab-button ${activeTab === 'approved' ? 'active' : ''}`}
            onClick={() => setActiveTab('approved')}
          >
            Approved
          </button>
          <button
            className={`tab-button ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            Completed
          </button>
          <button
            className={`tab-button ${activeTab === 'rejected' ? 'active' : ''}`}
            onClick={() => setActiveTab('rejected')}
          >
            Rejected
          </button>
        </div>

        <div className="requests-container">
          {requests.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h3>No {activeTab} requests</h3>
              <p>There are currently no {activeTab} blood requests</p>
            </div>
          ) : (
            <div className="requests-grid">
              {requests.map((request) => (
                <div key={request.id} className="request-card">
                  <div className="request-header">
                    <div className="blood-group-badge">{request.bloodGroup}</div>
                    <span 
                      className="urgency-badge"
                      style={{ backgroundColor: getUrgencyColor(request.urgency) }}
                    >
                      {request.urgency}
                    </span>
                  </div>

                  <div className="request-body">
                    <h3 className="patient-name">{request.patientName}</h3>
                    
                    <div className="request-details">
                      <div className="detail-row">
                        <span className="detail-label">🏥 Hospital:</span>
                        <span className="detail-value">{request.hospital}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">💉 Units Needed:</span>
                        <span className="detail-value">{request.units} units</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">📋 Reason:</span>
                        <span className="detail-value">{request.reason}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">📞 Contact:</span>
                        <span className="detail-value">{request.contact}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">⏰ Requested:</span>
                        <span className="detail-value">{formatDateTime(request.requestDate)}</span>
                      </div>
                    </div>
                  </div>

                  {activeTab === 'pending' && (
                    <div className="request-actions">
                      <button
                        className="btn-approve"
                        onClick={() => handleApprove(request)}
                      >
                        ✓ Approve
                      </button>
                      <button
                        className="btn-reject"
                        onClick={() => handleReject(request)}
                      >
                        ✕ Reject
                      </button>
                    </div>
                  )}

                  {activeTab === 'approved' && (
                    <div className="status-indicator approved">
                      ✓ Approved - Processing
                    </div>
                  )}

                  {activeTab === 'completed' && (
                    <div className="status-indicator completed">
                      ✓ Completed Successfully
                    </div>
                  )}

                  {activeTab === 'rejected' && request.rejectionReason && (
                    <div className="status-indicator rejected">
                      ❌ Rejected: {request.rejectionReason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rejection Modal */}
        {showRejectModal && (
          <Modal
            isOpen={showRejectModal}
            onClose={() => {
              setShowRejectModal(false);
              setRejectionReason('');
              setSelectedRequest(null);
            }}
            size="small"
          >
            <div className="modal-header">
              <h2>Reject Blood Request</h2>
              <button 
                className="modal-close"
                onClick={() => setShowRejectModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>Provide a reason for rejecting the blood request for <strong>{selectedRequest?.patientName}</strong>:</p>
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label>Rejection Reason *</label>
                <textarea
                  className="form-textarea"
                  rows="4"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter detailed reason for rejection..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-secondary"
                onClick={() => setShowRejectModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-danger"
                onClick={confirmReject}
                disabled={!rejectionReason.trim()}
              >
                Confirm Rejection
              </button>
            </div>
          </Modal>
        )}
      </div>
    </DashboardLayout>
  );
}

export default BloodRequestsPage;
