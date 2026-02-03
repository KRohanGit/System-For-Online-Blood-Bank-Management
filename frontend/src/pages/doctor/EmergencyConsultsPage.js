import React, { useState, useEffect } from 'react';
import ConsultRequestCard from '../../components/doctor/ConsultRequestCard';
import doctorClinicalAPI from '../../services/doctorClinicalAPI';
import './EmergencyConsultsPage.css';

/**
 * Emergency Consults Management Page
 * Doctor can accept/decline emergency consult requests
 */
const EmergencyConsultsPage = () => {
  const [consults, setConsults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [selectedConsult, setSelectedConsult] = useState(null);
  const [responseForm, setResponseForm] = useState({
    action: '',
    declineReason: '',
    medicalAdvisory: {
      advisoryNote: '',
      recommendedAction: '',
      criticalWarnings: [],
      followUpRequired: false
    }
  });

  useEffect(() => {
    fetchConsults();
  }, []);

  const fetchConsults = async () => {
    try {
      setLoading(true);
      const response = await doctorClinicalAPI.getEmergencyConsults({ status: 'pending' });
      if (response.success) {
        setConsults(response.data.consults || []);
      }
    } catch (error) {
      console.error('Error fetching consults:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRespondClick = (consultId, action) => {
    const consult = consults.find(c => c._id === consultId);
    setSelectedConsult(consult);
    setResponseForm({ ...responseForm, action });
    setShowResponseModal(true);
  };

  const handleSubmitResponse = async () => {
    if (responseForm.action === 'decline' && !responseForm.declineReason.trim()) {
      alert('Please provide a reason for declining');
      return;
    }

    if (responseForm.action === 'accept' && !responseForm.medicalAdvisory.advisoryNote.trim()) {
      alert('Please provide medical advisory notes');
      return;
    }

    try {
      setResponding(selectedConsult._id);
      const response = await doctorClinicalAPI.respondToConsult(selectedConsult._id, responseForm);
      
      if (response.success) {
        alert(`Consult ${responseForm.action}ed successfully`);
        setShowResponseModal(false);
        fetchConsults();
      }
    } catch (error) {
      console.error('Response error:', error);
      alert(error.response?.data?.message || 'Failed to respond to consult');
    } finally {
      setResponding(null);
    }
  };

  if (loading) {
    return <div className="loading-container"><div className="loading-spinner">Loading consults...</div></div>;
  }

  return (
    <div className="emergency-consults-page">
      <div className="page-header">
        <h1>🚑 Emergency Consults</h1>
        <p>Review and respond to emergency consultation requests</p>
      </div>

      <div className="consults-count">
        <span className="count-badge">{consults.length}</span>
        <span className="count-label">Pending Consults</span>
      </div>

      <div className="consults-list">
        {consults.length === 0 ? (
          <div className="no-consults">
            <p>✓ No pending consults at this time</p>
          </div>
        ) : (
          consults.map(consult => (
            <ConsultRequestCard
              key={consult._id}
              consult={consult}
              onRespond={handleRespondClick}
            />
          ))
        )}
      </div>

      {showResponseModal && selectedConsult && (
        <div className="response-modal-overlay" onClick={() => setShowResponseModal(false)}>
          <div className="response-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{responseForm.action === 'accept' ? 'Accept Consult' : 'Decline Consult'}</h2>
              <button className="close-btn" onClick={() => setShowResponseModal(false)}>×</button>
            </div>

            <div className="modal-body">
              <div className="consult-summary">
                <strong>Consult ID:</strong> {selectedConsult.consultId}<br />
                <strong>Hospital:</strong> {selectedConsult.requestingHospitalName}<br />
                <strong>Type:</strong> {selectedConsult.consultType}
              </div>

              {responseForm.action === 'accept' ? (
                <>
                  <div className="form-group">
                    <label>Medical Advisory Note *</label>
                    <textarea
                      value={responseForm.medicalAdvisory.advisoryNote}
                      onChange={(e) => setResponseForm({
                        ...responseForm,
                        medicalAdvisory: { ...responseForm.medicalAdvisory, advisoryNote: e.target.value }
                      })}
                      placeholder="Provide your medical advice..."
                      rows={4}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Recommended Action</label>
                    <input
                      type="text"
                      value={responseForm.medicalAdvisory.recommendedAction}
                      onChange={(e) => setResponseForm({
                        ...responseForm,
                        medicalAdvisory: { ...responseForm.medicalAdvisory, recommendedAction: e.target.value }
                      })}
                      placeholder="e.g., Immediate transfusion required"
                    />
                  </div>
                </>
              ) : (
                <div className="form-group">
                  <label>Decline Reason *</label>
                  <textarea
                    value={responseForm.declineReason}
                    onChange={(e) => setResponseForm({ ...responseForm, declineReason: e.target.value })}
                    placeholder="Please specify why you're declining this consult..."
                    rows={3}
                    required
                  />
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowResponseModal(false)} disabled={responding}>
                Cancel
              </button>
              <button className="btn-submit" onClick={handleSubmitResponse} disabled={responding}>
                {responding ? 'Submitting...' : 'Submit Response'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmergencyConsultsPage;
