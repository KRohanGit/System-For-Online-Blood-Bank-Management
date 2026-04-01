import React, { useState, useRef, useEffect } from 'react';
import './BloodQRScanner.css';

/**
 * Blood QR Scanner Component
 * 
 * Allows scanning QR codes of blood units to view:
 * - Real-time location tracking
 * - Lifecycle timeline
 * - Usage information
 * - Impact information (lives saved)
 */

const BloodQRScanner = () => {
  const [scanning, setScanning] = useState(false);
  const [traceData, setTraceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [unitId, setUnitId] = useState('');
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Manual input: Search by unit ID
  const handleManualInput = async (e) => {
    e.preventDefault();
    if (!unitId.trim()) {
      setError('Please enter a valid unit ID');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/blood/trace/${unitId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();
      if (result.success) {
        setTraceData(result.data);
      } else {
        setError(result.message || 'Blood unit not found');
      }
    } catch (err) {
      setError('Error retrieving blood trace: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Start camera scanning
  const startScanning = async () => {
    try {
      setCameraError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setScanning(true);
        processVideoFrame();
      }
    } catch (err) {
      setCameraError('Cannot access camera: ' + err.message);
      setScanning(false);
    }
  };

  // Process video frames for QR code detection
  const processVideoFrame = () => {
    if (!videoRef.current || !videoRef.current.srcObject) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const video = videoRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Note: In production, use a QR code library like 'qrcode-reader' or 'jsQR'
    // For now, we'll simulate with text input fallback

    if (scanning) {
      setTimeout(processVideoFrame, 500);
    }
  };

  const stopScanning = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setScanning(false);
    setTraceData(null);
  };

  return (
    <div className="blood-qr-scanner">
      <div className="scanner-container">
        <h1>🩸 Blood Unit Trace & Lifecycle</h1>
        <p className="subtitle">Scan QR code or enter unit ID to track blood unit journey</p>

        {/* Manual Input Form */}
        <div className="manual-input-section">
          <form onSubmit={handleManualInput} className="input-form">
            <input
              type="text"
              placeholder="Enter Blood Unit ID (e.g., BU-1234567890-ABC)"
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              className="unit-input"
              disabled={scanning}
            />
            <button
              type="submit"
              className="btn btn-search"
              disabled={loading || scanning}
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>
        </div>

        {/* QR Scanner */}
        <div className="scanner-section">
          <button
            className="btn btn-camera"
            onClick={scanning ? stopScanning : startScanning}
          >
            {scanning ? '📹 Stop Scanning' : '📱 Scan QR Code'}
          </button>

          {scanning && (
            <div className="camera-container">
              <video
                ref={videoRef}
                className="camera-feed"
                autoPlay
                playsInline
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              <div className="scan-overlay">
                <div className="scan-box"></div>
              </div>
            </div>
          )}

          {cameraError && <div className="error-message">{cameraError}</div>}
        </div>

        {/* Error Display */}
        {error && <div className="error-message">{error}</div>}

        {/* Trace Data Display */}
        {traceData && (
          <div className="trace-display">
            <BloodTraceCard traceData={traceData} />
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Blood Trace Card Component
 * Displays all information about a blood unit trace
 */
const BloodTraceCard = ({ traceData }) => {
  const [expandedEvent, setExpandedEvent] = useState(null);

  const getStatusIcon = (status) => {
    const icons = {
      'COLLECTED': '💉',
      'TESTING': '🧪',
      'PROCESSING': '⚙️',
      'STORED': '❄️',
      'RESERVED': '📋',
      'IN_TRANSIT': '🚚',
      'TRANSFUSED': '❤️',
      'EXPIRED': '⏰',
      'DISCARDED': '🗑️'
    };
    return icons[status] || '📦';
  };

  const getEventIcon = (eventType) => {
    const icons = {
      'DONATION': '🩸',
      'TESTING': '🧪',
      'TEST_PASSED': '✅',
      'PROCESSING': '⚙️',
      'STORAGE_RECEIVED': '❄️',
      'TRANSFER_INITIATED': '🚚',
      'TRANSFER_RECEIVED': '✋',
      'TRANSFUSED': '❤️',
      'EXPIRY_REACHED': '⏰',
      'DISCARDED': '🗑️'
    };
    return icons[eventType] || '📝';
  };

  const calculateDaysInInventory = () => {
    const collection = new Date(traceData.collectionDate);
    const now = new Date();
    return Math.floor((now - collection) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="trace-card">
      {/* Header */}
      <div className="trace-header">
        <div className="unit-info">
          <h2>{traceData.unitId}</h2>
          <p className="blood-group">{traceData.bloodGroup} • {traceData.component}</p>
        </div>
        <div className="status-badge">
          <span className="status-icon">{getStatusIcon(traceData.status)}</span>
          <span className="status-text">{traceData.status}</span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="quick-stats">
        <div className="stat">
          <span className="stat-label">Volume</span>
          <span className="stat-value">{traceData.volume.amount} {traceData.volume.unit}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Days in Inventory</span>
          <span className="stat-value">{calculateDaysInInventory()}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Scans</span>
          <span className="stat-value">{traceData.scans?.totalScans || 0}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Days to Expiry</span>
          <span className={`stat-value ${traceData.daysToExpiry <= 7 ? 'warning' : ''}`}>
            {traceData.daysToExpiry > 0 ? `${traceData.daysToExpiry}d` : 'Expired'}
          </span>
        </div>
      </div>

      {/* Current Location */}
      <div className="location-section">
        <h3>📍 Current Location</h3>
        <div className="location-info">
          <span className="location-type">{traceData.currentLocation?.type}</span>
          <span className="location-facility">{traceData.currentLocation?.facilityName || 'Unknown'}</span>
          <span className="location-updated">
            Updated: {new Date(traceData.currentLocation?.updatedAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Impact Information */}
      {traceData.impactInfo?.wasUsed && (
        <div className="impact-section">
          <div className="impact-badge">
            <span className="impact-icon">❤️</span>
            <span className="impact-text">{traceData.impactInfo.outcomeMessage}</span>
          </div>
          {traceData.impactInfo.lifesSaved > 0 && (
            <p className="lives-saved">✨ This unit helped save {traceData.impactInfo.lifesSaved} life</p>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="timeline-section">
        <h3>📅 Lifecycle Timeline</h3>
        <div className="timeline">
          {traceData.timeline && traceData.timeline.length > 0 ? (
            traceData.timeline.map((event, index) => (
              <div key={index} className="timeline-item">
                <div className="timeline-marker">
                  <span className="timeline-icon">{getEventIcon(event.eventType)}</span>
                  {index < traceData.timeline.length - 1 && <div className="timeline-line" />}
                </div>
                <div
                  className="timeline-content"
                  onClick={() => setExpandedEvent(expandedEvent === index ? null : index)}
                >
                  <div className="timeline-header">
                    <span className="event-type">{event.eventType}</span>
                    <span className="event-date">{new Date(event.timestamp).toLocaleDateString()}</span>
                  </div>
                  <p className="event-description">{event.description}</p>
                  
                  {expandedEvent === index && (
                    <div className="event-details">
                      {event.location && <p><strong>Location:</strong> {event.location}</p>}
                      {event.facilityName && <p><strong>Facility:</strong> {event.facilityName}</p>}
                      {event.procedure && <p><strong>Procedure:</strong> {event.procedure}</p>}
                      {event.urgency && <p><strong>Urgency:</strong> {event.urgency}</p>}
                      {event.timestamp && (
                        <p><strong>Time:</strong> {new Date(event.timestamp).toLocaleTimeString()}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="no-events">No lifecycle events recorded yet</p>
          )}
        </div>
      </div>

      {/* Collection & Expiry */}
      <div className="dates-section">
        <div className="date-info">
          <span className="date-label">Collection Date</span>
          <span className="date-value">{new Date(traceData.collectionDate).toLocaleDateString()}</span>
        </div>
        <div className="date-info">
          <span className="date-label">Expiry Date</span>
          <span className={`date-value ${traceData.daysToExpiry <= 7 ? 'warning' : ''}`}>
            {new Date(traceData.expiryDate).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="trace-footer">
        <p className="transparency-note">
          ✅ <strong>Privacy Protected:</strong> No personal patient information is displayed. 
          This trace system ensures complete transparency while maintaining anonymity.
        </p>
      </div>
    </div>
  );
};

export default BloodQRScanner;
