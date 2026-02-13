import React, { useState, useEffect } from 'react';
import { getNearbyCampsInventory, requestBloodFromCamp } from '../../services/bloodInventoryApi';
import './NearbyCampsModal.css';

const NearbyCampsModal = ({ onClose, onSuccess }) => {
  const [camps, setCamps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCamp, setSelectedCamp] = useState(null);
  const [requestForm, setRequestForm] = useState({
    bloodGroup: '',
    units: '',
    reason: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchNearbyCamps();
  }, []);

  const fetchNearbyCamps = async () => {
    try {
      setLoading(true);
      const response = await getNearbyCampsInventory(50);
      setCamps(response.data.nearbyCamps || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestBlood = async (e) => {
    e.preventDefault();
    if (!selectedCamp || !requestForm.bloodGroup || !requestForm.units || !requestForm.reason) {
      alert('Please fill all fields');
      return;
    }

    try {
      setSubmitting(true);
      await requestBloodFromCamp(
        selectedCamp._id,
        requestForm.bloodGroup,
        parseInt(requestForm.units),
        requestForm.reason
      );
      onSuccess('Blood request sent to camp successfully!');
      onClose();
    } catch (err) {
      alert(`Failed to send request: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="nearby-camps-modal">
        <div className="modal-header">
          <h2>Nearby Blood Camps</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="loading-spinner">Loading nearby camps...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="nearby-camps-modal">
        <div className="modal-header">
          <h2>Nearby Blood Camps</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="error-message">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="nearby-camps-modal">
      <div className="modal-header">
        <h2>Nearby Blood Camps</h2>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
      <div className="modal-body">
        {camps.length === 0 ? (
          <div className="no-camps">
            <p>No blood camps with available inventory found nearby.</p>
            <p>Try expanding your search radius or check back later.</p>
          </div>
        ) : (
          <>
            <div className="camps-list">
              {camps.map((camp) => (
                <div
                  key={camp._id}
                  className={`camp-card ${selectedCamp?._id === camp._id ? 'selected' : ''}`}
                  onClick={() => setSelectedCamp(camp)}
                >
                  <div className="camp-header">
                    <h3>{camp.campName}</h3>
                    <span className="distance-badge">{camp.distance} km</span>
                  </div>
                  <div className="camp-details">
                    <p className="venue">{camp.venue.name}, {camp.venue.city}</p>
                    <p className="units">Total Units: {camp.totalUnitsCollected}</p>
                    <p className="transfer-time">Est. Transfer: {camp.estimatedTransferTime} min</p>
                  </div>
                  <div className="blood-inventory">
                    {Object.entries(camp.bloodInventory).map(([group, units]) => (
                      units > 0 && (
                        <div key={group} className="inventory-item">
                          <span className="blood-group">{group}</span>
                          <span className="units">{units}u</span>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {selectedCamp && (
              <div className="request-section">
                <h3>Request Blood from {selectedCamp.campName}</h3>
                <form onSubmit={handleRequestBlood}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Blood Group</label>
                      <select
                        value={requestForm.bloodGroup}
                        onChange={(e) => setRequestForm({ ...requestForm, bloodGroup: e.target.value })}
                        required
                      >
                        <option value="">Select Blood Group</option>
                        {Object.entries(selectedCamp.bloodInventory).map(([group, units]) => (
                          units > 0 && <option key={group} value={group}>{group} ({units} units available)</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Units Needed</label>
                      <input
                        type="number"
                        min="1"
                        value={requestForm.units}
                        onChange={(e) => setRequestForm({ ...requestForm, units: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Reason for Request</label>
                    <textarea
                      value={requestForm.reason}
                      onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                      placeholder="e.g., Emergency surgery, Critical shortage, etc."
                      rows="3"
                      required
                    />
                  </div>
                  <button type="submit" className="submit-btn" disabled={submitting}>
                    {submitting ? 'Sending Request...' : 'Send Request'}
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default NearbyCampsModal;
