import React from 'react';
import './CertificatesList.css';

const CertificatesList = ({ certificates }) => {
  if (!certificates || certificates.length === 0) {
    return (
      <div className="empty-state">
        <p>No certificates available</p>
      </div>
    );
  }

  const handleDownload = (cert) => {
    // In a real implementation, this would download the PDF
    alert(`Downloading certificate for donation on ${new Date(cert.donationDate).toLocaleDateString()}`);
  };

  return (
    <div className="certificates-list">
      <div className="certificates-grid">
        {certificates.map((cert, index) => (
          <div key={cert._id || index} className="certificate-card">
            <div className="certificate-icon">🏆</div>
            <div className="certificate-info">
              <h4>Donation Certificate</h4>
              <p className="certificate-date">
                {new Date(cert.donationDate).toLocaleDateString()}
              </p>
              <p className="certificate-blood-group">
                Blood Group: <strong>{cert.bloodGroup}</strong>
              </p>
              {cert.certificateNumber && (
                <p className="certificate-number">
                  Cert #: {cert.certificateNumber}
                </p>
              )}
            </div>
            <button 
              className="download-btn"
              onClick={() => handleDownload(cert)}
            >
              📥 Download
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CertificatesList;
