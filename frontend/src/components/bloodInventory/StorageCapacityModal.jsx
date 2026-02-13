import React, { useState, useEffect } from 'react';
import { getStorageCapacity } from '../../services/bloodInventoryApi';
import './StorageCapacityModal.css';

const StorageCapacityModal = ({ onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStorageCapacity();
  }, []);

  const fetchStorageCapacity = async () => {
    try {
      setLoading(true);
      const response = await getStorageCapacity();
      setData(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="storage-capacity-modal">
        <div className="modal-header">
          <h2>Storage Capacity Details</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="loading-spinner">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="storage-capacity-modal">
        <div className="modal-header">
          <h2>Storage Capacity Details</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="error-message">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="storage-capacity-modal">
      <div className="modal-header">
        <h2>Storage Capacity Details</h2>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
      <div className="modal-body">
        <div className={`status-badge ${data.overflowRisk ? 'overflow-risk' : 'safe'}`}>
          {data.status}
        </div>

        <div className="capacity-grid">
          <div className="capacity-item">
            <div className="capacity-label">Total Storage Capacity</div>
            <div className="capacity-value">{data.totalCapacity} units</div>
          </div>

          <div className="capacity-item">
            <div className="capacity-label">Currently Used Storage</div>
            <div className="capacity-value">{data.usedCapacity} units</div>
          </div>

          <div className="capacity-item">
            <div className="capacity-label">Available Storage</div>
            <div className="capacity-value available">{data.availableStorage} units</div>
          </div>

          <div className="capacity-item">
            <div className="capacity-label">Expected Incoming Units</div>
            <div className="capacity-value">{data.expectedIncomingUnits} units</div>
          </div>

          {data.excessUnits > 0 && (
            <div className="capacity-item excess">
              <div className="capacity-label">Excess Units</div>
              <div className="capacity-value danger">{data.excessUnits} units</div>
            </div>
          )}
        </div>

        {data.overflowRisk && data.temporaryStorageCenter && (
          <div className="overflow-section">
            <h3>Recommended Temporary Storage</h3>
            <div className="storage-center-card">
              <div className="center-name">{data.temporaryStorageCenter.name}</div>
              <div className="center-details">
                <div className="detail-item">
                  <span className="detail-label">Distance:</span>
                  <span className="detail-value">{data.temporaryStorageCenter.distance} km</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Estimated Retrieval Time:</span>
                  <span className="detail-value">{data.temporaryStorageCenter.estimatedRetrievalTime} minutes</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StorageCapacityModal;
