import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';
import bloodApi from '../services/bloodApi';
import './QRScanner.css';

const QRScanner = () => {
  const [qrInput, setQrInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scanMessage, setScanMessage] = useState('Ready to verify a QR code.');
  const [selectedImageName, setSelectedImageName] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [isScanningActive, setIsScanningActive] = useState(false);
  const [supportsBarcodeDetector, setSupportsBarcodeDetector] = useState(false);
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const animationFrameRef = useRef(null);
  const mountedRef = useRef(true);

  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    setSupportsBarcodeDetector(typeof window !== 'undefined' && 'BarcodeDetector' in window);

    return () => {
      mountedRef.current = false;
      stopCamera();
    };
  }, [stopCamera]);

  const verifyQrValue = useCallback(async (qrValue) => {
    const normalizedValue = String(qrValue || '').trim();

    if (!normalizedValue) {
      setError('Please enter a QR payload or unit ID.');
      return;
    }

    setLoading(true);
    setError(null);
    setVerificationResult(null);
    setScanMessage('Verifying QR payload and loading trace data...');

    try {
      const response = await bloodApi.verifyQrCode(normalizedValue);
      const trace = response?.data;

      setVerificationResult(trace);
      setScanMessage('QR verified successfully. Opening the trace view...');

      if (trace?.unitId) {
        stopCamera();
        setTimeout(() => {
          if (mountedRef.current) {
            navigate(`/trace/${trace.unitId}`);
          }
        }, 700);
      }
    } catch (err) {
      setVerificationResult(null);
      setError(err.message || 'Blood unit not found');
      setScanMessage('QR verification failed. Try entering the unit ID manually.');
    } finally {
      setLoading(false);
    }
  }, [navigate, stopCamera]);

  const scanVideoFrame = useCallback(async () => {
    if (!isScanningActive || !videoRef.current || !detectorRef.current) {
      return;
    }

    const video = videoRef.current;
    if (video.readyState < 2) {
      animationFrameRef.current = requestAnimationFrame(scanVideoFrame);
      return;
    }

    try {
      const barcodes = await detectorRef.current.detect(video);
      if (barcodes.length > 0 && barcodes[0].rawValue) {
        await verifyQrValue(barcodes[0].rawValue);
        return;
      }
    } catch (err) {
      if (mountedRef.current) {
        setScanMessage('Camera is active, but QR decoding is unavailable in this browser.');
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanVideoFrame);
  }, [isScanningActive, verifyQrValue]);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setScanMessage('Requesting camera access...');

      if (!supportsBarcodeDetector) {
        setScanMessage('Camera preview only. Paste the QR text below or use a supported browser to decode automatically.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      streamRef.current = stream;
      setHasPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      if (supportsBarcodeDetector && typeof window !== 'undefined' && window.BarcodeDetector) {
        detectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] });
        setScanMessage('Camera ready. Hold the QR code inside the frame.');
        animationFrameRef.current = requestAnimationFrame(scanVideoFrame);
      } else {
        detectorRef.current = null;
      }
    } catch (err) {
      setHasPermission(false);
      setScanMessage('Camera access denied. Use manual QR verification below.');
      setError('Unable to access camera. Please check browser permissions.');
    }
  }, [scanVideoFrame, supportsBarcodeDetector]);

  useEffect(() => {
    if (isScanningActive) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => stopCamera();
  }, [isScanningActive, startCamera, stopCamera]);

  const handleManualSearch = async (e) => {
    e.preventDefault();
    await verifyQrValue(qrInput);
  };

  const handleInputChange = (e) => {
    setQrInput(e.target.value);
    setError(null);
  };

  const handleSelectImageClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedImageName(file.name);
    setError(null);
    setVerificationResult(null);

    setLoading(true);
    setScanMessage('Analyzing uploaded image for QR payload...');

    let bitmap = null;
    let fallbackCanvas = null;
    try {
      bitmap = await createImageBitmap(file);

      let detectedValue = '';
      if (supportsBarcodeDetector && typeof window !== 'undefined' && window.BarcodeDetector) {
        const detector = detectorRef.current || new window.BarcodeDetector({ formats: ['qr_code'] });
        detectorRef.current = detector;
        const codes = await detector.detect(bitmap);
        detectedValue = String(codes?.[0]?.rawValue || '').trim();
      }

      if (!detectedValue) {
        fallbackCanvas = document.createElement('canvas');
        fallbackCanvas.width = bitmap.width;
        fallbackCanvas.height = bitmap.height;
        const ctx = fallbackCanvas.getContext('2d');
        if (!ctx) {
          throw new Error('Unable to read image data for QR decoding.');
        }
        ctx.drawImage(bitmap, 0, 0);
        const imageData = ctx.getImageData(0, 0, fallbackCanvas.width, fallbackCanvas.height);
        const qrResult = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth'
        });
        detectedValue = String(qrResult?.data || '').trim();
      }

      if (!detectedValue) {
        setScanMessage('No QR found in the uploaded image. Try a clearer image with full QR visible.');
        setError('No QR code detected in image.');
        return;
      }

      setQrInput(detectedValue);
      setScanMessage('QR detected from uploaded image. Verifying trace lifecycle...');
      await verifyQrValue(detectedValue);
    } catch (err) {
      setError('Unable to decode QR from image. Please try another image.');
      setScanMessage('Image decoding failed.');
    } finally {
      if (bitmap && typeof bitmap.close === 'function') {
        bitmap.close();
      }
      fallbackCanvas = null;
      setLoading(false);
      e.target.value = '';
    }
  };

  const toggleScanner = () => {
    setIsScanningActive((current) => !current);
  };

  return (
    <div className="qr-scanner-container">
      <div className="scanner-header">
        <h1>🔍 Blood Unit Tracing</h1>
        <p>Scan a signed QR payload or enter a unit ID to verify and load the blood trace</p>
      </div>

      <div className="scanner-content">
        <div className="scanner-section">
          <h2>Manual Verification</h2>

          <form onSubmit={handleManualSearch} className="search-form">
            <div className="form-group">
              <input
                type="text"
                placeholder="Paste QR payload or enter blood unit ID"
                value={qrInput}
                onChange={handleInputChange}
                disabled={loading}
                className="search-input"
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Verifying...' : 'Verify QR'}
              </button>
            </div>
          </form>

          {error && (
            <div className="alert alert-error">{error}</div>
          )}

          <div className="upload-section">
            <h3>Upload QR Image</h3>
            <p className="upload-hint">Upload a screenshot/photo of the QR code to detect and open blood lifecycle trace.</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleSelectImageClick}
              disabled={loading}
            >
              {loading ? 'Processing image...' : 'Upload QR Image'}
            </button>
            {selectedImageName && (
              <div className="upload-file-name">Selected: {selectedImageName}</div>
            )}
          </div>
        </div>

        <div className="scanner-divider">
          <span>OR</span>
        </div>

        <div className="scanner-section">
          <h2>Camera Scan</h2>

          <button
            className={`btn btn-secondary ${isScanningActive ? 'active' : ''}`}
            onClick={toggleScanner}
            disabled={loading}
          >
            {isScanningActive ? 'Stop Camera' : 'Start Camera'}
          </button>

          {isScanningActive && (
            <div className="camera-container">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="camera-feed"
              />
              <div className="scanner-frame">
                <div className="frame-corner top-left"></div>
                <div className="frame-corner top-right"></div>
                <div className="frame-corner bottom-left"></div>
                <div className="frame-corner bottom-right"></div>
              </div>
              <p className="scanner-hint">
                {supportsBarcodeDetector
                  ? 'Position the QR code inside the frame.'
                  : 'This browser does not support live QR decoding. Use manual verification below.'}
              </p>
            </div>
          )}

          <div className="alert alert-success" style={{ marginTop: '12px' }}>
            {scanMessage}
          </div>

          {hasPermission === false && (
            <div className="alert alert-error">
              Camera access denied. Please use the manual verification field above.
            </div>
          )}
        </div>

        {verificationResult && (
          <div className="scanner-result">
            <div className="alert alert-success">
              ✓ Verified {verificationResult.unitId}. Redirecting to the trace view...
            </div>
          </div>
        )}
      </div>

      <div className="scanner-info">
        <h3>About Blood Unit Tracing</h3>
        <ul>
          <li>🩸 Complete lifecycle tracking from collection to transfusion</li>
          <li>✓ Signed QR payloads with signature verification</li>
          <li>📍 Real-time location updates</li>
          <li>🔗 Blockchain-verified integrity</li>
          <li>📊 Role-aware trace visibility for donors and operational users</li>
        </ul>
      </div>

      <div className="scanner-footer">
        <p>
          Blood unit tracing is public for transparency, while authenticated users can receive role-aware trace context.
        </p>
      </div>
    </div>
  );
};

export default QRScanner;
