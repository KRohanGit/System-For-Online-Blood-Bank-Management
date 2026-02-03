import React, { useState, useEffect } from 'react';
import { getBloodRequests, validateBloodRequest } from '../../services/doctorApi';
import RequestCard from './cards/RequestCard';
import ValidationModal from './modals/ValidationModal';
import '../../styles/BloodRequestValidation.css';

const BloodRequestValidation = () => {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await getBloodRequests();
      setRequests(data);
      setFilteredRequests(data);
    } catch (error) {
      console.error('Load requests error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (filter) => {
    let filtered = [...requests];
    
    if (filter.priority === 'emergency') {
      filtered = filtered.filter(r => r.isEmergency);
    }
    
    if (filter.status) {
      filtered = filtered.filter(r => r.status === filter.status);
    }
    
    if (filter.bloodGroup) {
      filtered = filtered.filter(r => r.bloodGroup === filter.bloodGroup);
    }

    setFilteredRequests(filtered);
  };

  const handleValidate = async (requestId, validation) => {
    try {
      await validateBloodRequest(requestId, validation);
      setShowModal(false);
      setSelectedRequest(null);
      loadRequests();
    } catch (error) {
      console.error('Validation error:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading requests...</div>;
  }

  return (
    <div className="blood-request-validation">
      <div className="section-header">
        <h2>Blood Request Medical Validation</h2>
        <div className="actions">
          <button onClick={loadRequests} className="refresh-btn">
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="emergency-section">
        {filteredRequests.filter(r => r.isEmergency).length > 0 && (
          <>
            <h3 className="emergency-header">🚨 Emergency Requests</h3>
            <div className="requests-grid">
              {filteredRequests
                .filter(r => r.isEmergency)
                .map(request => (
                  <RequestCard
                    key={request._id}
                    request={request}
                    onValidate={() => {
                      setSelectedRequest(request);
                      setShowModal(true);
                    }}
                  />
                ))}
            </div>
          </>
        )}
      </div>

      <div className="regular-section">
        {filteredRequests.filter(r => !r.isEmergency).length > 0 && (
          <>
            <h3>Regular Requests</h3>
            <div className="requests-grid">
              {filteredRequests
                .filter(r => !r.isEmergency)
                .map(request => (
                  <RequestCard
                    key={request._id}
                    request={request}
                    onValidate={() => {
                      setSelectedRequest(request);
                      setShowModal(true);
                    }}
                  />
                ))}
            </div>
          </>
        )}
      </div>

      {filteredRequests.length === 0 && (
        <div className="no-data">No blood requests found</div>
      )}

      {showModal && selectedRequest && (
        <ValidationModal
          request={selectedRequest}
          onClose={() => setShowModal(false)}
          onSubmit={handleValidate}
          type="request"
        />
      )}
    </div>
  );
};

export default BloodRequestValidation;
