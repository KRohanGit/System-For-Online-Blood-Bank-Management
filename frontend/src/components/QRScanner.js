import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import bloodApi from '../services/bloodApi';
import './QRScanner.css';

const QRScanner = () => {
  const [unitId, setUnitId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scanned, setScanned] = useState(null);
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [isScanningActive, setIsScanningActive] = useState(false);

  useEffect(() => {
    if (isScanningActive) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isScanningActive]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setHasPermission(true);
      }
    } catch (err) {
      setHasPermission(false);
      setError('Unable to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
  };

  const handleManualSearch = async (e) => {
    e.preventDefault();
    if (!unitId.trim()) {
      setError('Please enter a unit ID');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await bloodApi.traceBloodUnit(unitId);
      setScanned(result);
      navigate(`/trace/${unitId}`);
    } catch (err) {
      setError(err.message || 'Blood unit not found');
      setScanned(null);
    } finally {
      setLoading(false);
    }
  };

  const handleUnitIdChange = (e) => {
    setUnitId(e.target.value);
    setError(null);
  };

  const toggleScanner = () => {
    setIsScanningActive(!isScanningActive);
  };

  return (
    <div className="qr-scanner-container">
      <div className="scanner-header">
        <h1>🔍 Blood Unit Tracing</h1>
        <p>Scan QR code or enter unit ID to track blood unit lifecycle</p>
      </div>

      <div className="scanner-content">
        <div className="scanner-section">
          <h2>Method 1: Enter Unit ID</h2>
          
          <form onSubmit={handleManualSearch} className="search-form">
            <div className="form-group">
              <input
                type="text"
                placeholder="Enter blood unit ID (e.g., BU-2024-001)"
                value={unitId}
                onChange={handleUnitIdChange}
                disabled={loading}
                className="search-input"
              />
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Searching...' : 'Search Unit'}
              </button>
            </div>
          </form>

          {error && !unitId && (
            <div className="alert alert-error">{error}</div>
          )}
        </div>

        <div className="scanner-divider">
          <span>OR</span>
        </div>

        <div className="scanner-section">
          <h2>Method 2: Scan QR Code</h2>
          
          <button 
            className={`btn btn-secondary ${isScanningActive ? 'active' : ''}`}
            onClick={toggleScanner}
          >
            {isScanningActive ? 'Stop Camera' : 'Start Camera'}
          </button>

          {isScanningActive && (
            <div className="camera-container">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline
                className="camera-feed"
              />
              <div className="scanner-frame">
                <div className="frame-corner top-left"></div>
                <div className="frame-corner top-right"></div>
                <div className="frame-corner bottom-left"></div>
                <div className="frame-corner bottom-right"></div>
              </div>
              <p className="scanner-hint">Position QR code within frame</p>
            </div>
          )}

          {hasPermission === false && (
            <div className="alert alert-error">
              Camera access denied. Please check browser permissions.
            </div>
          )}
        </div>

        {scanned && (
          <div className="scanner-result">
            <div className="alert alert-success">
              ✓ Blood unit found! Redirecting...
            </div>
          </div>
        )}
      </div>

      <div className="scanner-info">
        <h3>About Blood Unit Tracing</h3>
        <ul>
          <li>🩸 Complete lifecycle tracking from collection to transfusion</li>
          <li>✓ Test results and safety certifications</li>
          <li>📍 Real-time location updates</li>
          <li>🔗 Blockchain-verified integrity</li>
          <li>📊 AI-powered anomaly detection</li>
        </ul>
      </div>

      <div className="scanner-footer">
        <p>
          Blood unit tracing is available to all donors, hospitals, and healthcare workers.
          No authentication required for public querying.
        </p>
      </div>
    </div>
  );
};

export default QRScanner;
