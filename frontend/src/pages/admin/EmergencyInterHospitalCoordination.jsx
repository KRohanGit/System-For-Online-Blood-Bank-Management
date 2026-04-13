import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import EmergencyRequestCard from '../../components/emergency/EmergencyRequestCard';
import NewEmergencyRequestModal from '../../components/emergency/NewEmergencyRequestModal';
import SendMessageModal from '../../components/emergency/SendMessageModal';
import DeliveryPlanningMap from '../../components/emergency/DeliveryPlanningMap';
import DeliveryLiveTrackingMap from '../../components/emergency/DeliveryLiveTrackingMap';
import config from '../../config/config';
import axios from 'axios';
import {
  createEmergencyRequest,
  getEmergencyRequests,
  getNearbyCoordinationHospitals,
  getHospitalCoordinationSummary,
  getHospitalInsights,
  getDeliverySession,
  acceptEmergencyRequest,
  declineEmergencyRequest,
  dispatchBloodTransfer
} from '../../services/emergencyCoordinationApi';
import { connectSocket, disconnectSocket, joinHospitalRoom, onEmergencyNew, onEmergencyUpdate, onEvent } from '../../services/socketService';
import './EmergencyInterHospitalCoordination.css';

const EmergencyInterHospitalCoordination = () => {
  const [searchParams] = useSearchParams();
  const hospitalIdFromUrl = searchParams.get('hospitalId');
  
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [nearbyHospitals, setNearbyHospitals] = useState([]);
  const [coordinationSourceHospital, setCoordinationSourceHospital] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [activeTab, setActiveTab] = useState('incoming');
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [preselectedHospitalId, setPreselectedHospitalId] = useState('');
  const [expandedHospitalId, setExpandedHospitalId] = useState('');
  const [aiRecommendation, setAiRecommendation] = useState(null);
  const [coordinationError, setCoordinationError] = useState('');
  const [trackingRequestId, setTrackingRequestId] = useState('');
  const [activeDeliverySession, setActiveDeliverySession] = useState(null);

  const normalizeRequestForCard = useCallback((request) => {
    const coordinationStatus = request.coordinationStatus || 'PENDING';
    const lifecycleStatus = request.lifecycleStatus || 'CREATED';
    const uiStatus = coordinationStatus === 'REJECTED'
      ? 'REJECTED'
      : coordinationStatus === 'ACCEPTED'
        ? 'ACCEPTED'
        : lifecycleStatus;

    return {
      ...request,
      status: uiStatus,
      urgencyLevel: request.urgency || (request.severityLevel === 'MODERATE' ? 'MEDIUM' : request.severityLevel) || 'HIGH',
      requestingHospital: {
        name: request.requestingHospitalName || request.fromHospitalId?.hospitalName || request.requestingHospitalId?.hospitalName || 'Unknown Hospital'
      },
      receivingHospital: {
        name: request.toHospitalId?.hospitalName || request.assignedHospitalName || request.assignedHospitalId?.hospitalName || 'Partner Hospital'
      },
      componentType: request.componentType || 'Whole Blood',
      patientCriticality: request.patientInfo?.diagnosis || request.medicalJustification || '',
      requiredWithin: request.requiredWithin ? new Date(request.requiredWithin).toLocaleString() : ''
    };
  }, []);

  const loadEmergencyRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEmergencyRequests();
      const incoming = Array.isArray(data.incoming) ? data.incoming.map(normalizeRequestForCard) : [];
      const outgoing = Array.isArray(data.outgoing) ? data.outgoing.map(normalizeRequestForCard) : [];
      setIncomingRequests(incoming);
      setOutgoingRequests(outgoing);
    } catch (error) {
      console.error('Error loading emergency requests:', error);
    } finally {
      setLoading(false);
    }
  }, [normalizeRequestForCard]);

  const loadNearbyHospitals = useCallback(async () => {
    try {
      const response = await getNearbyCoordinationHospitals({ radius: 50 });
      setNearbyHospitals(response.data || []);
      setCoordinationSourceHospital(response.sourceHospital || null);
    } catch (error) {
      console.error('Error loading nearby hospitals:', error);
    }
  }, []);

  const loadDeliverySession = useCallback(async (requestId) => {
    if (!requestId) {
      setActiveDeliverySession(null);
      return;
    }

    try {
      const response = await getDeliverySession(requestId);
      setActiveDeliverySession(response?.data?.deliverySession || null);
    } catch (error) {
      if (error?.message !== 'Delivery session not started') {
        console.error('Error loading delivery session:', error);
      }
      setActiveDeliverySession(null);
    }
  }, []);

  const setupRealtime = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }

      const profileResponse = await axios.get(`${config.API_URL}/hospital/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const profile = profileResponse?.data?.data;
      if (!profile?._id || !profile?.userId?._id) {
        return;
      }

      connectSocket(profile.userId._id, 'hospital_admin');
      joinHospitalRoom(profile._id);

      const onCreated = onEmergencyNew(() => {
        loadEmergencyRequests();
      });
      const onUpdated = onEmergencyUpdate(() => {
        loadEmergencyRequests();
      });
      const onHospitalOnline = onEvent('hospital.online', () => {
        loadNearbyHospitals();
      });
      const onHospitalOffline = onEvent('hospital.offline', () => {
        loadNearbyHospitals();
      });
      const onHospitalCreated = onEvent('hospital.created', () => {
        loadNearbyHospitals();
      });
      const onDeliveryTracking = onEvent('delivery:tracking', (payload) => {
        if (payload?.requestId && String(payload.requestId) === String(trackingRequestId)) {
          setActiveDeliverySession(payload);
        } else if (payload?.deliverySession?.requestId && String(payload.deliverySession.requestId) === String(trackingRequestId)) {
          setActiveDeliverySession(payload.deliverySession);
        }
      });
      const onTransferUpdateEvent = onEvent('transfer:update', (payload) => {
        if (payload?.deliverySession?.requestId && String(payload.deliverySession.requestId) === String(trackingRequestId)) {
          setActiveDeliverySession(payload.deliverySession);
        }
      });

      return () => {
        onCreated();
        onUpdated();
        onHospitalOnline();
        onHospitalOffline();
        onHospitalCreated();
        onDeliveryTracking();
        onTransferUpdateEvent();
      };
    } catch (error) {
      console.warn('Realtime setup skipped:', error?.message || error);
    }
  }, [loadEmergencyRequests, loadNearbyHospitals, trackingRequestId]);

  useEffect(() => {
    let realtimeCleanup = null;

    loadEmergencyRequests();
    loadNearbyHospitals();
    (async () => {
      realtimeCleanup = await setupRealtime();
    })();

    return () => {
      if (typeof realtimeCleanup === 'function') {
        realtimeCleanup();
      }
      disconnectSocket();
    };
  }, [loadEmergencyRequests, loadNearbyHospitals, setupRealtime]);

  useEffect(() => {
    const activeRequest = [...incomingRequests, ...outgoingRequests].find((request) => {
      const lifecycle = String(request.lifecycleStatus || request.status || '').toUpperCase();
      return ['PARTNER_ACCEPTED', 'LOGISTICS_DISPATCH', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED'].includes(lifecycle);
    });

    if (activeRequest?._id && !trackingRequestId) {
      setTrackingRequestId(String(activeRequest._id));
    }
  }, [incomingRequests, outgoingRequests, trackingRequestId]);

  useEffect(() => {
    if (trackingRequestId) {
      loadDeliverySession(trackingRequestId);
    }
  }, [trackingRequestId, loadDeliverySession]);

  const openCoordinationPanel = useCallback(async (hospitalId) => {
    try {
      setCoordinationError('');
      const summaryResponse = await getHospitalCoordinationSummary(hospitalId);
      setSelectedHospital(summaryResponse.data || null);

      if (summaryResponse?.data?.availableBloodGroups?.length) {
        const insightsResponse = await getHospitalInsights({
          bloodGroup: summaryResponse.data.availableBloodGroups[0],
          urgency: 'HIGH',
          distance: nearbyHospitals.find((h) => String(h.hospitalId) === String(hospitalId))?.distanceKm || 0,
          historicalDemand: 65
        });
        setAiRecommendation(insightsResponse.data || null);
      } else {
        setAiRecommendation(null);
      }
    } catch (error) {
      console.error('Error loading coordination panel:', error);
      setCoordinationError(error?.message || 'Failed to load coordination details');
    }
  }, [nearbyHospitals]);

  const handleToggleHospitalDetails = useCallback(async (hospital) => {
    const hospitalId = String(hospital.hospitalId);

    if (expandedHospitalId === hospitalId) {
      setExpandedHospitalId('');
      setSelectedHospital(null);
      setAiRecommendation(null);
      return;
    }

    setExpandedHospitalId(hospitalId);
    await openCoordinationPanel(hospitalId);
  }, [expandedHospitalId, openCoordinationPanel]);

  // Auto-select hospital from URL parameter
  useEffect(() => {
    if (hospitalIdFromUrl && nearbyHospitals.length > 0) {
      const hospital = nearbyHospitals.find(h => String(h.hospitalId) === String(hospitalIdFromUrl));
      if (hospital) {
        // Open the coordination panel for this hospital
        openCoordinationPanel(hospital.hospitalId);
        // Set it as preselected for new request modal
        setPreselectedHospitalId(String(hospital.hospitalId));
      }
    }
  }, [hospitalIdFromUrl, nearbyHospitals, openCoordinationPanel]);

  const handleCreateRequest = async (formData) => {
    try {
      const parsedRequiredWithin = formData.requiredWithin
        ? new Date(formData.requiredWithin)
        : null;
      const requiredWithinIso = parsedRequiredWithin && !Number.isNaN(parsedRequiredWithin.getTime())
        ? parsedRequiredWithin.toISOString()
        : null;

      const requestPayload = {
        toHospitalId: formData.receivingHospital,
        bloodGroup: formData.bloodGroup,
        unitsRequired: Number(formData.unitsRequired) || 1,
        urgency: formData.urgencyLevel || 'HIGH',
        message: formData.notes || '',
        requiredWithin: requiredWithinIso,
        medicalJustification: formData.patientCriticality || 'Emergency case',
        patientDetails: {
          age: 30,
          gender: 'Male',
          diagnosis: formData.patientCriticality || 'Emergency transfusion required'
        },
        requiredBy: requiredWithinIso || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
      };

      await createEmergencyRequest(requestPayload);
      setShowNewRequestModal(false);
      setPreselectedHospitalId('');
      loadEmergencyRequests();
      alert('Emergency request created successfully');
    } catch (error) {
      console.error('Error creating request:', error);
      alert('Failed to create emergency request');
    }
  };

  const handleSendMessage = async (formData) => {
    try {
      setCoordinationError('Direct chat API is not enabled yet. Use Request Blood to send auditable coordination requests.');
      setShowMessageModal(false);
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

  const handleDispatchRequest = async (request) => {
    if (!request?._id) {
      return;
    }

    const confirmed = window.confirm('Dispatch blood transfer now and start the live tracking session?');
    if (!confirmed) {
      return;
    }

    try {
      const response = await dispatchBloodTransfer(request._id, {
        vehicleDetails: {
          vehicleType: 'AMBULANCE',
          vehicleNumber: request?.logisticsDetails?.vehicleInfo?.number || 'AMB-001'
        },
        driverDetails: {
          name: 'Assigned Ambulance Driver',
          phone: 'N/A',
          license: 'N/A'
        },
        dispatchChecklist: [
          'Blood bags secured',
          'Temperature maintained',
          'Route verified',
          'Hospital notified'
        ]
      });

      const deliverySession = response?.deliverySession || response?.data?.deliverySession || null;
      if (deliverySession) {
        setActiveDeliverySession(deliverySession);
      }
      setTrackingRequestId(String(request._id));
      setActiveTab('incoming');
      loadEmergencyRequests();
      alert('Transfer dispatched successfully and live tracking has started');
    } catch (error) {
      console.error('Error dispatching request:', error);
      alert(error?.message || 'Failed to dispatch transfer');
    }
  };

  const handleTrackRequest = useCallback((request) => {
    if (!request?._id) {
      return;
    }

    setTrackingRequestId(String(request._id));
    loadDeliverySession(String(request._id));
    setActiveTab('incoming');
  }, [loadDeliverySession]);

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
              onClick={() => {
                setPreselectedHospitalId('');
                setShowNewRequestModal(true);
              }}
            >
              New Emergency Request
            </button>
          </div>
        </div>

        <div className="dashboard-card" style={{ marginBottom: '24px' }}>
          <div className="card-header" style={{ marginBottom: '16px' }}>
            <h3>Delivery Intelligence</h3>
          </div>
          {coordinationError && (
            <div className="empty-state" style={{ padding: '16px', color: '#b91c1c', textAlign: 'left' }}>
              {coordinationError}
            </div>
          )}
          <div className="requests-grid">
            {nearbyHospitals.length === 0 ? (
              <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                <h3>No nearby hospitals available</h3>
                <p>Try refreshing after location update or widening radius.</p>
              </div>
            ) : (
              nearbyHospitals.map((hospital) => (
                <div key={hospital.hospitalId} className={`delivery-hospital-card ${expandedHospitalId === String(hospital.hospitalId) ? 'expanded' : ''}`}>
                  <div className="delivery-hospital-summary">
                    <div className="hospital-name-block">
                      <h3>{hospital.hospitalName}</h3>
                      <div className="delivery-metrics">
                        <span className="metric-pill">Distance: {hospital.distanceKm} km</span>
                        <span className="metric-pill accent">ETA: {hospital.etaMinutes || hospital.deliveryEstimate?.final_eta || '--'} mins</span>
                      </div>
                    </div>
                    <button className="btn-refresh compact" onClick={() => handleToggleHospitalDetails(hospital)}>
                      {expandedHospitalId === String(hospital.hospitalId) ? 'Hide Details' : 'View Details'}
                    </button>
                  </div>

                  {expandedHospitalId === String(hospital.hospitalId) && (
                    <div className="delivery-intelligence-panel">
                      <div className="delivery-intelligence-grid">
                        <div className="intelligence-tile">
                          <span className="tile-label">Distance</span>
                          <strong>{hospital.deliveryEstimate?.distance_km ?? hospital.distanceKm} km</strong>
                        </div>
                        <div className="intelligence-tile">
                          <span className="tile-label">Base ETA</span>
                          <strong>{hospital.deliveryEstimate?.base_eta ?? '--'} mins</strong>
                        </div>
                        <div className="intelligence-tile">
                          <span className="tile-label">ML ETA</span>
                          <strong>{hospital.deliveryEstimate?.ml_eta ?? '--'} mins</strong>
                        </div>
                        <div className="intelligence-tile highlight">
                          <span className="tile-label">Final ETA</span>
                          <strong>{hospital.deliveryEstimate?.final_eta ?? hospital.etaMinutes ?? '--'} mins</strong>
                        </div>
                        <div className="intelligence-tile">
                          <span className="tile-label">Traffic</span>
                          <strong>{hospital.deliveryEstimate?.traffic || 'Unknown'}</strong>
                        </div>
                        <div className="intelligence-tile">
                          <span className="tile-label">Route</span>
                          <strong>{hospital.deliveryEstimate?.route || 'Direct route'}</strong>
                        </div>
                      </div>

                      <div className="delivery-extra-row">
                        <div><strong>Blood Groups:</strong> {hospital.availableBloodGroups?.join(', ') || 'Unknown'}</div>
                        <div><strong>Priority Score:</strong> {hospital.deliveryScore ?? '--'}</div>
                        <div><strong>Data Source:</strong> {hospital.deliveryEstimate?.provider || 'Fallback'}</div>
                      </div>

                      {selectedHospital?.hospitalId === hospital.hospitalId && aiRecommendation && (
                        <div className="delivery-ai-box">
                          <h4>AI Recommendation</h4>
                          <p><strong>Suggested Action:</strong> {aiRecommendation.suggestedAction}</p>
                          <p><strong>Priority Score:</strong> {aiRecommendation.priorityScore}</p>
                          <p><strong>Risk Level:</strong> {aiRecommendation.riskLevel}</p>
                          <p><strong>Reason:</strong> {aiRecommendation.reason}</p>
                        </div>
                      )}

                      <div style={{ marginTop: '1rem' }}>
                        <DeliveryPlanningMap
                          sourceHospital={coordinationSourceHospital}
                          targetHospital={{
                            hospitalName: hospital.hospitalName
                          }}
                          estimate={hospital.deliveryEstimate}
                        />
                      </div>

                      <div className="delivery-actions-row">
                        <button
                          className="btn-new-request"
                          onClick={() => {
                            setPreselectedHospitalId(String(hospital.hospitalId));
                            setShowNewRequestModal(true);
                          }}
                        >
                          Request Blood
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="dashboard-card" style={{ marginBottom: '24px' }}>
          <div className="card-header" style={{ marginBottom: '16px' }}>
            <h3>Live Delivery Tracking</h3>
          </div>
          {activeDeliverySession ? (
            <DeliveryLiveTrackingMap session={activeDeliverySession} />
          ) : (
            <div className="empty-state" style={{ padding: '20px' }}>
              <h3>No active delivery session</h3>
              <p>Track a request that has moved into transit to see the moving ambulance marker and live ETA.</p>
            </div>
          )}
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
                  onTrack={handleTrackRequest}
                  onDispatch={handleDispatchRequest}
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
                onClick={() => {
                  setPreselectedHospitalId('');
                  setShowNewRequestModal(true);
                }}
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
                  onTrack={handleTrackRequest}
                  onDispatch={handleDispatchRequest}
                />
              ))}
            </div>
          )}
        </div>

        <NewEmergencyRequestModal
          isOpen={showNewRequestModal}
          onClose={() => {
            setShowNewRequestModal(false);
            setPreselectedHospitalId('');
          }}
          onSubmit={handleCreateRequest}
          initialHospitalId={preselectedHospitalId}
          nearbyHospitals={nearbyHospitals.map((h) => ({
            _id: h.hospitalId,
            hospitalName: h.hospitalName,
            distance: h.distanceKm
          }))}
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
