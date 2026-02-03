import React, { useState, useEffect } from 'react';
import { getEmergencyRequests, fastTrackApproval } from '../../services/doctorApi';
import EmergencyCard from './cards/EmergencyCard';
import EmergencyApprovalModal from './modals/EmergencyApprovalModal';
import '../../styles/EmergencyActions.css';

const EmergencyActions = () => {
  const [emergencies, setEmergencies] = useState([]);
  const [selectedEmergency, setSelectedEmergency] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEmergencies();
    const interval = setInterval(loadEmergencies, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadEmergencies = async () => {
    try {
      setLoading(true);
      const data = await getEmergencyRequests();
      setEmergencies(data);
    } catch (error) {
      console.error('Load emergencies error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFastTrack = async (requestId, approval) => {
    try {
      await fastTrackApproval(requestId, approval);
      setShowModal(false);
      setSelectedEmergency(null);
      loadEmergencies();
    } catch (error) {
      console.error('Fast track error:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading emergency requests...</div>;
  }

  return (
    <div className="emergency-actions">
      <div className="section-header emergency">
        <h2>🚨 Emergency Protocol Actions</h2>
        <div className="actions">
          <button onClick={loadEmergencies} className="refresh-btn">
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="alert-banner">
        ⚠️ All emergency actions are logged and auditable. Fast-track approvals are time-sensitive.
      </div>

      <div className="emergencies-list">
        {emergencies.map(emergency => (
          <EmergencyCard
            key={emergency._id}
            emergency={emergency}
            onFastTrack={() => {
              setSelectedEmergency(emergency);
              setShowModal(true);
            }}
          />
        ))}
      </div>

      {emergencies.length === 0 && (
        <div className="no-data success">✓ No active emergencies</div>
      )}

      {showModal && selectedEmergency && (
        <EmergencyApprovalModal
          emergency={selectedEmergency}
          onClose={() => setShowModal(false)}
          onSubmit={handleFastTrack}
        />
      )}
    </div>
  );
};

export default EmergencyActions;
