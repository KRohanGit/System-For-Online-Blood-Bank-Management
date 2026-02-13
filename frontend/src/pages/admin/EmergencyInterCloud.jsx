import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import {
  createEmergencyRequest,
  getEmergencyRequests,
  acceptEmergencyRequest,
  declineEmergencyRequest
} from '../../services/emergencyCoordinationApi';
import '../../styles/admin.css';
import './EmergencyInterCloud.css';

function EmergencyInterCloud() {
  const navigate = useNavigate();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showMatchesModal, setShowMatchesModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [matchingHospitals, setMatchingHospitals] = useState([]);
  const [activeRequests, setActiveRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [messageForm, setMessageForm] = useState({
    recipientHospital: '',
    messageType: 'URGENT_REQUEST',
    subject: '',
    message: '',
    bloodGroup: '',
    unitsNeeded: ''
  });
  
  const [emergencyRequest, setEmergencyRequest] = useState({
    bloodGroup: '',
    unitsRequired: '',
    severityLevel: 'HIGH',
    medicalJustification: '',
    patientDetails: {
      age: '',
      gender: 'MALE',
      diagnosis: '',
      bloodPressure: '',
      hemoglobin: ''
    },
    requiredBy: ''
  });

  // Load active requests on component mount
  useEffect(() => {
    loadEmergencyRequests();
  }, []);

  const loadEmergencyRequests = async () => {
    try {
      const data = await getEmergencyRequests();
      setActiveRequests(data.requests || []);
    } catch (err) {
      console.error('Error loading requests:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEmergencyRequest(prev => ({ ...prev, [name]: value }));
  };

  const handlePatientDetailsChange = (e) => {
    const { name, value } = e.target;
    setEmergencyRequest(prev => ({
      ...prev,
      patientDetails: {
        ...prev.patientDetails,
        [name]: value
      }
    }));
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Calculate required by time (2 hours from now as default)
      const requiredByDate = emergencyRequest.requiredBy || 
        new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

      const requestData = {
        ...emergencyRequest,
        unitsRequired: parseInt(emergencyRequest.unitsRequired),
        requiredBy: requiredByDate,
        patientDetails: {
          ...emergencyRequest.patientDetails,
          age: parseInt(emergencyRequest.patientDetails.age)
        }
      };

      const response = await createEmergencyRequest(requestData);
      
      setSuccess(`Emergency request created successfully! Urgency Score: ${response.urgencyScore}`);
      setMatchingHospitals(response.matchingHospitals || []);
      setShowMatchesModal(true);
      setShowRequestModal(false);
      
      // Reload requests
      await loadEmergencyRequests();
      
      // Reset form
      setEmergencyRequest({
        bloodGroup: '',
        unitsRequired: '',
        severityLevel: 'HIGH',
        medicalJustification: '',
        patientDetails: {
          age: '',
          gender: 'MALE',
          diagnosis: '',
          bloodPressure: '',
          hemoglobin: ''
        },
        requiredBy: ''
      });

    } catch (err) {
      setError(err.message || 'Failed to create emergency request');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      const unitsCommitted = prompt('Enter units to commit:');
      if (!unitsCommitted) return;

      const estimatedDeliveryTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      
      await acceptEmergencyRequest(requestId, {
        unitsCommitted: parseInt(unitsCommitted),
        estimatedDeliveryTime,
        notes: 'Request accepted via dashboard'
      });

      setSuccess('Request accepted successfully!');
      await loadEmergencyRequests();
    } catch (err) {
      setError(err.message || 'Failed to accept request');
    }
  };

  const handleDeclineRequest = async (requestId) => {
    try {
      const reason = prompt('Enter decline reason:');
      if (!reason) return;

      await declineEmergencyRequest(requestId, reason);
      setSuccess('Request declined');
      await loadEmergencyRequests();
    } catch (err) {
      setError(err.message || 'Failed to decline request');
    }
  };

  const handleMessageInputChange = (e) => {
    const { name, value } = e.target;
    setMessageForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // TODO: Implement actual API call when backend is ready
      console.log('Sending message:', messageForm);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess(`Message sent successfully to ${messageForm.recipientHospital}!`);
      setShowMessageModal(false);
      
      // Reset form
      setMessageForm({
        recipientHospital: '',
        messageType: 'URGENT_REQUEST',
        subject: '',
        message: '',
        bloodGroup: '',
        unitsNeeded: ''
      });
    } catch (err) {
      setError(err.message || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      'CRITICAL': 'red',
      'HIGH': 'orange',
      'MODERATE': 'yellow'
    };
    return colors[severity] || 'blue';
  };

  const getStatusColor = (status) => {
    const colors = {
      'CREATED': 'blue',
      'PARTNER_ACCEPTED': 'green',
      'LOGISTICS_DISPATCH': 'purple',
      'IN_TRANSIT': 'orange',
      'DELIVERED': 'success',
      'COMPLETED': 'gray'
    };
    return colors[status] || 'blue';
  };

  // Mock data - Inter-hospital network
  const nearbyHospitals = [
    {
      id: 1,
      name: 'St. Mary Medical Center',
      distance: '2.3 km',
      availability: {
        'A+': 15, 'A-': 3, 'B+': 12, 'B-': 2, 
        'AB+': 5, 'AB-': 1, 'O+': 18, 'O-': 4
      },
      lastDonation: '15 mins ago',
      responseTime: '< 10 mins',
      status: 'online',
      contact: '+1 234-567-1001'
    },
    {
      id: 2,
      name: 'Hope Healthcare',
      distance: '3.8 km',
      availability: {
        'A+': 8, 'A-': 1, 'B+': 10, 'B-': 0, 
        'AB+': 3, 'AB-': 0, 'O+': 14, 'O-': 2
      },
      lastDonation: '1 hour ago',
      responseTime: '< 15 mins',
      status: 'online',
      contact: '+1 234-567-1002'
    },
    {
      id: 3,
      name: 'Metro Health Center',
      distance: '5.1 km',
      availability: {
        'A+': 20, 'A-': 5, 'B+': 15, 'B-': 3, 
        'AB+': 8, 'AB-': 2, 'O+': 25, 'O-': 6
      },
      lastDonation: '30 mins ago',
      responseTime: '< 20 mins',
      status: 'online',
      contact: '+1 234-567-1003'
    },
    {
      id: 4,
      name: 'Community Hospital',
      distance: '7.5 km',
      availability: {
        'A+': 5, 'A-': 0, 'B+': 4, 'B-': 1, 
        'AB+': 2, 'AB-': 0, 'O+': 8, 'O-': 1
      },
      lastDonation: '3 hours ago',
      responseTime: '< 30 mins',
      status: 'busy',
      contact: '+1 234-567-1004'
    }
  ];

  return (
    <DashboardLayout>
      <div className="emergency-intercloud">
        {/* Header */}
        <div className="page-header">
          <button className="back-button" onClick={() => navigate('/admin/dashboard')}>
            ← Back
          </button>
          <div className="page-title-section">
            <h1>🚨 Emergency Inter-Hospital Coordination</h1>
            <p>Real-time blood availability and emergency request management</p>
          </div>
          <div className="header-actions">
            <button 
              className="btn-primary"
              onClick={() => setShowMessageModal(true)}
            >
              ✉️ Send Message
            </button>
            <button 
              className="btn-emergency"
              onClick={() => setShowRequestModal(true)}
            >
              🚨 New Emergency Request
            </button>
          </div>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="alert alert-error">
            ❌ {error}
            <button onClick={() => setError('')}>✖</button>
          </div>
        )}
        {success && (
          <div className="alert alert-success">
            ✅ {success}
            <button onClick={() => setSuccess('')}>✖</button>
          </div>
        )}

        {/* Active Emergency Requests */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>🚨 Active Emergency Requests</h3>
            <button 
              className="btn-secondary"
              onClick={loadEmergencyRequests}
            >
              🔄 Refresh
            </button>
          </div>
          <div className="card-body">
            {activeRequests.length === 0 ? (
              <p className="empty-state">No active emergency requests</p>
            ) : (
              <div className="requests-list">
                {activeRequests.map(request => (
                  <div key={request._id} className="request-item">
                    <div className="request-header">
                      <div>
                        <h4>
                          {request.bloodGroup} - {request.unitsRequired} units
                          <StatusBadge 
                            status={getSeverityColor(request.severityLevel)} 
                            text={request.severityLevel}
                          />
                        </h4>
                        <p>From: {request.requestingHospital?.hospitalName}</p>
                      </div>
                      <StatusBadge 
                        status={getStatusColor(request.status)} 
                        text={request.status.replace(/_/g, ' ')}
                      />
                    </div>
                    
                    <div className="request-details">
                      <div className="detail-item">
                        <strong>Urgency Score:</strong> {request.urgencyScore}/100
                      </div>
                      <div className="detail-item">
                        <strong>Created:</strong> {new Date(request.createdAt).toLocaleString()}
                      </div>
                      <div className="detail-item">
                        <strong>Patient:</strong> {request.patientDetails?.age}y, {request.patientDetails?.gender}
                      </div>
                      {request.escalationLevel > 0 && (
                        <div className="detail-item escalation">
                          🚨 <strong>Escalation Level:</strong> {request.escalationLevel}
                        </div>
                      )}
                    </div>

                    {request.status === 'CREATED' && (
                      <div className="request-actions">
                        <button 
                          className="btn-success"
                          onClick={() => handleAcceptRequest(request._id)}
                        >
                          ✅ Accept Request
                        </button>
                        <button 
                          className="btn-danger"
                          onClick={() => handleDeclineRequest(request._id)}
                        >
                          ❌ Decline
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Create Emergency Request Modal */}
        {showRequestModal && (
          <Modal
            title="🚨 Create Emergency Blood Request"
            onClose={() => setShowRequestModal(false)}
          >
            <form onSubmit={handleCreateRequest} className="emergency-request-form">
              <div className="form-section">
                <h4>Blood Requirements</h4>
                
                <div className="form-group">
                  <label>Blood Group *</label>
                  <select
                    name="bloodGroup"
                    value={emergencyRequest.bloodGroup}
                    onChange={handleInputChange}
                    required
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

                <div className="form-group">
                  <label>Units Required *</label>
                  <input
                    type="number"
                    name="unitsRequired"
                    value={emergencyRequest.unitsRequired}
                    onChange={handleInputChange}
                    min="1"
                    max="20"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Severity Level *</label>
                  <select
                    name="severityLevel"
                    value={emergencyRequest.severityLevel}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="CRITICAL">🔴 CRITICAL - Life-threatening</option>
                    <option value="HIGH">🟠 HIGH - Urgent surgery</option>
                    <option value="MODERATE">🟡 MODERATE - Planned procedure</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Required By</label>
                  <input
                    type="datetime-local"
                    name="requiredBy"
                    value={emergencyRequest.requiredBy}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-section">
                <h4>Patient Details</h4>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Age *</label>
                    <input
                      type="number"
                      name="age"
                      value={emergencyRequest.patientDetails.age}
                      onChange={handlePatientDetailsChange}
                      min="0"
                      max="120"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Gender *</label>
                    <select
                      name="gender"
                      value={emergencyRequest.patientDetails.gender}
                      onChange={handlePatientDetailsChange}
                      required
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Diagnosis *</label>
                  <input
                    type="text"
                    name="diagnosis"
                    value={emergencyRequest.patientDetails.diagnosis}
                    onChange={handlePatientDetailsChange}
                    placeholder="e.g., Severe trauma, Surgery complication"
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Blood Pressure</label>
                    <input
                      type="text"
                      name="bloodPressure"
                      value={emergencyRequest.patientDetails.bloodPressure}
                      onChange={handlePatientDetailsChange}
                      placeholder="e.g., 120/80"
                    />
                  </div>

                  <div className="form-group">
                    <label>Hemoglobin (g/dL)</label>
                    <input
                      type="text"
                      name="hemoglobin"
                      value={emergencyRequest.patientDetails.hemoglobin}
                      onChange={handlePatientDetailsChange}
                      placeholder="e.g., 8.5"
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h4>Medical Justification</h4>
                <div className="form-group">
                  <textarea
                    name="medicalJustification"
                    value={emergencyRequest.medicalJustification}
                    onChange={handleInputChange}
                    placeholder="Provide medical justification for this emergency request..."
                    rows="4"
                    required
                  />
                </div>
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => setShowRequestModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-emergency"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : '🚨 Create Emergency Request'}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* Matching Hospitals Modal */}
        {showMatchesModal && (
          <Modal
            title="🎯 Matching Partner Hospitals"
            onClose={() => setShowMatchesModal(false)}
          >
            <div className="matching-hospitals">
              <p className="modal-description">
                Top {matchingHospitals.length} matching hospitals based on distance, 
                availability, and trust score:
              </p>
              
              {matchingHospitals.map((match, index) => (
                <div key={match.hospitalId} className="match-card">
                  <div className="match-rank">#{index + 1}</div>
                  <div className="match-details">
                    <h4>{match.hospitalName}</h4>
                    <div className="match-stats">
                      <span>📊 Match Score: {match.matchScore}/100</span>
                      <span>📍 Distance: {match.distance} km</span>
                      <span>🩸 Available: {match.availableUnits} units</span>
                      <span>⏱️ Response: ~{match.responseTime} min</span>
                    </div>
                    <StatusBadge 
                      status={match.confidenceLevel === 'HIGH' ? 'success' : 
                             match.confidenceLevel === 'MEDIUM' ? 'warning' : 'danger'} 
                      text={`${match.confidenceLevel} Confidence`}
                    />
                  </div>
                </div>
              ))}
              
              <div className="modal-actions">
                <button 
                  type="button"
                  className="btn-primary"
                  onClick={() => setShowMatchesModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Send Message Modal */}
        {showMessageModal && (
          <Modal
            title="✉️ Send Message to Partner Hospital"
            onClose={() => setShowMessageModal(false)}
          >
            <form onSubmit={handleSendMessage} className="emergency-form">
              <div className="form-section">
                <h4>Message Details</h4>
                
                <div className="form-group">
                  <label>Recipient Hospital *</label>
                  <select
                    name="recipientHospital"
                    value={messageForm.recipientHospital}
                    onChange={handleMessageInputChange}
                    required
                  >
                    <option value="">Select Hospital</option>
                    {nearbyHospitals.map(hospital => (
                      <option key={hospital.id} value={hospital.name}>
                        {hospital.name} ({hospital.distance})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Message Type *</label>
                  <select
                    name="messageType"
                    value={messageForm.messageType}
                    onChange={handleMessageInputChange}
                    required
                  >
                    <option value="URGENT_REQUEST">🚨 Urgent Blood Request</option>
                    <option value="INQUIRY">❓ Availability Inquiry</option>
                    <option value="COORDINATION">🤝 Coordination</option>
                    <option value="UPDATE">📢 Status Update</option>
                    <option value="THANKS">🙏 Acknowledgment/Thanks</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Subject *</label>
                  <input
                    type="text"
                    name="subject"
                    value={messageForm.subject}
                    onChange={handleMessageInputChange}
                    placeholder="Brief subject of your message"
                    required
                  />
                </div>

                {(messageForm.messageType === 'URGENT_REQUEST' || messageForm.messageType === 'INQUIRY') && (
                  <div className="form-row">
                    <div className="form-group">
                      <label>Blood Group</label>
                      <select
                        name="bloodGroup"
                        value={messageForm.bloodGroup}
                        onChange={handleMessageInputChange}
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

                    <div className="form-group">
                      <label>Units Needed</label>
                      <input
                        type="number"
                        name="unitsNeeded"
                        value={messageForm.unitsNeeded}
                        onChange={handleMessageInputChange}
                        min="1"
                        placeholder="Number of units"
                      />
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label>Message *</label>
                  <textarea
                    name="message"
                    value={messageForm.message}
                    onChange={handleMessageInputChange}
                    placeholder="Enter your message here..."
                    rows="5"
                    required
                  />
                </div>
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => setShowMessageModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Sending...' : '✉️ Send Message'}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </DashboardLayout>
  );
}

export default EmergencyInterCloud;
