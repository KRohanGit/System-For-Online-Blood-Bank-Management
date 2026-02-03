import React, { useState, useEffect } from 'react';
import './EncryptionStatus.css';

/**
 * EncryptionStatus Component
 * 
 * Displays the three-layer encryption architecture status
 * for admin/super-admin dashboards
 * 
 * Shows:
 * - Bcrypt password hashing status
 * - AES-256 file encryption status
 * - RSA-2048 key encryption status
 * - MongoDB encryption visibility
 */

const EncryptionStatus = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchEncryptionStatus();
  }, []);

  const fetchEncryptionStatus = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/admin/encryption-status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(data.data);
      } else {
        setError('Failed to fetch encryption status');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="encryption-status loading">
        <div className="spinner"></div>
        <p>Loading encryption status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="encryption-status error">
        <h3>⚠️ Error</h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="encryption-status">
      <div className="encryption-header">
        <h2>🔐 Encryption Architecture</h2>
        <span className={`status-badge ${status?.status}`}>
          {status?.status === 'active' ? '✅ Active' : '❌ Inactive'}
        </span>
      </div>

      <div className="encryption-layers">
        {/* Layer 1: Bcrypt */}
        <div className="layer-card layer-1">
          <div className="layer-header">
            <span className="layer-icon">🔑</span>
            <h3>Layer 1: Password Security</h3>
          </div>
          <div className="layer-body">
            <div className="layer-info">
              <span className="label">Algorithm:</span>
              <span className="value">{status?.layers?.bcrypt?.algorithm || 'N/A'}</span>
            </div>
            <div className="layer-info">
              <span className="label">Salt Rounds:</span>
              <span className="value">{status?.layers?.bcrypt?.saltRounds || 'N/A'}</span>
            </div>
            <div className="layer-info">
              <span className="label">Purpose:</span>
              <span className="value">{status?.layers?.bcrypt?.purpose || 'N/A'}</span>
            </div>
            <div className="layer-description">
              <p>
                <strong>Why Bcrypt?</strong> Specifically designed for password hashing with
                built-in salt generation. Adaptive algorithm that can be made slower as
                computing power increases.
              </p>
            </div>
          </div>
        </div>

        {/* Layer 2: AES */}
        <div className="layer-card layer-2">
          <div className="layer-header">
            <span className="layer-icon">📄</span>
            <h3>Layer 2: File Encryption</h3>
          </div>
          <div className="layer-body">
            <div className="layer-info">
              <span className="label">Algorithm:</span>
              <span className="value">{status?.layers?.aes?.algorithm || 'N/A'}</span>
            </div>
            <div className="layer-info">
              <span className="label">Key Length:</span>
              <span className="value">{status?.layers?.aes?.keyLength || 'N/A'} bits</span>
            </div>
            <div className="layer-info">
              <span className="label">Purpose:</span>
              <span className="value">{status?.layers?.aes?.purpose || 'N/A'}</span>
            </div>
            <div className="layer-description">
              <p>
                <strong>Why AES-256?</strong> Industry standard for symmetric encryption.
                HIPAA and GDPR compliant. Fast and efficient for large files. Each file
                gets a unique AES key.
              </p>
            </div>
          </div>
        </div>

        {/* Layer 3: RSA */}
        <div className="layer-card layer-3">
          <div className="layer-header">
            <span className="layer-icon">🔐</span>
            <h3>Layer 3: Key Protection</h3>
          </div>
          <div className="layer-body">
            <div className="layer-info">
              <span className="label">Algorithm:</span>
              <span className="value">{status?.layers?.rsa?.algorithm || 'N/A'}</span>
            </div>
            <div className="layer-info">
              <span className="label">Key Length:</span>
              <span className="value">{status?.layers?.rsa?.keyLength || 'N/A'} bits</span>
            </div>
            <div className="layer-info">
              <span className="label">Public Key:</span>
              <span className={`value ${status?.layers?.rsa?.publicKeyPresent ? 'present' : 'missing'}`}>
                {status?.layers?.rsa?.publicKeyPresent ? '✅ Present' : '❌ Missing'}
              </span>
            </div>
            <div className="layer-info">
              <span className="label">Private Key:</span>
              <span className={`value ${status?.layers?.rsa?.privateKeyPresent ? 'present' : 'missing'}`}>
                {status?.layers?.rsa?.privateKeyPresent ? '✅ Present' : '❌ Missing'}
              </span>
            </div>
            <div className="layer-description">
              <p>
                <strong>Why RSA?</strong> Asymmetric encryption perfect for protecting
                AES keys. Public key encrypts, private key decrypts. Not used for files
                (too slow) - only for key encryption.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* MongoDB Visibility */}
      <div className="mongodb-section">
        <h3>📊 MongoDB Encryption Visibility</h3>
        <p className="section-description">
          All encrypted data is visible in MongoDB for security audits and verification:
        </p>
        <ul className="visibility-list">
          {status?.mongodb?.visibleFields?.map((field, index) => (
            <li key={index}>
              <span className="check-icon">✓</span>
              {field}
            </li>
          ))}
        </ul>
      </div>

      {/* Encryption Flow */}
      <div className="flow-section">
        <h3>🔄 Encryption Flow</h3>
        <div className="flow-diagram">
          <div className="flow-step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h4>File Upload</h4>
              <p>User uploads document</p>
            </div>
          </div>
          <div className="flow-arrow">→</div>
          <div className="flow-step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h4>AES Encryption</h4>
              <p>File encrypted with unique AES key</p>
            </div>
          </div>
          <div className="flow-arrow">→</div>
          <div className="flow-step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h4>RSA Protection</h4>
              <p>AES key encrypted with RSA</p>
            </div>
          </div>
          <div className="flow-arrow">→</div>
          <div className="flow-step">
            <div className="step-number">4</div>
            <div className="step-content">
              <h4>MongoDB Storage</h4>
              <p>Encrypted data + key stored</p>
            </div>
          </div>
        </div>
      </div>

      {/* Security Standards */}
      <div className="standards-section">
        <h3>✅ Compliance & Standards</h3>
        <div className="standards-grid">
          <div className="standard-card">
            <h4>HIPAA Compliant</h4>
            <p>Healthcare data protection standards</p>
          </div>
          <div className="standard-card">
            <h4>GDPR Compliant</h4>
            <p>Data privacy regulations</p>
          </div>
          <div className="standard-card">
            <h4>NIST Approved</h4>
            <p>AES-256 is FIPS 197 approved</p>
          </div>
          <div className="standard-card">
            <h4>OWASP Recommended</h4>
            <p>Bcrypt for password storage</p>
          </div>
        </div>
      </div>

      <div className="encryption-footer">
        <button onClick={fetchEncryptionStatus} className="refresh-btn">
          🔄 Refresh Status
        </button>
        <p className="last-updated">
          Last updated: {new Date().toLocaleString()}
        </p>
      </div>
    </div>
  );
};

export default EncryptionStatus;
