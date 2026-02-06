import React, { useState } from 'react';
import UrgencyIndexCard from '../../components/common/UrgencyIndexCard';
import VerificationBadge from '../../components/common/VerificationBadge';
import WasteRiskIndicator from '../../components/bloodInventory/WasteRiskIndicator';
import GeoTimeHeatmap from '../../components/common/GeoTimeHeatmap';
import ReputationCard from '../../components/common/ReputationCard';
import './NewFeaturesDemo.css';

/**
 * Demo page showcasing all 5 new features
 * Remove this after integrating into actual dashboards
 */

const NewFeaturesDemo = () => {
  const [activeTab, setActiveTab] = useState('urgency');

  // Sample data for demonstrations
  const sampleBloodRequest = {
    bloodGroup: 'O-',
    unitsRequired: 8,
    expiryHours: 36,
    nearbyStock: [
      { hospital: 'City General', units: 2 },
      { hospital: 'Apollo', units: 1 }
    ]
  };

  const sampleBloodRequest2 = {
    bloodGroup: 'A+',
    unitsRequired: 2,
    expiryHours: 150,
    nearbyStock: [
      { hospital: 'City General', units: 10 },
      { hospital: 'Apollo', units: 8 },
      { hospital: 'Fortis', units: 12 }
    ]
  };

  const sampleRequests = [
    {
      id: 1,
      patientName: 'Emergency Case',
      source: 'hospital',
      createdBy: { name: 'Dr. K. Rohan', role: 'hospital_admin' },
      hospitalName: 'City General Hospital',
      createdAt: new Date()
    },
    {
      id: 2,
      patientName: 'Blood Camp Request',
      source: 'camp',
      campId: 'CAMP2025001',
      createdAt: new Date()
    },
    {
      id: 3,
      patientName: 'Community Request',
      source: 'community',
      adminReviewed: true,
      reviewedBy: 'Admin Team',
      reviewedAt: new Date(),
      createdAt: new Date()
    },
    {
      id: 4,
      patientName: 'Unverified Request',
      source: 'community',
      adminReviewed: false,
      createdAt: new Date()
    }
  ];

  const sampleBloodUnit = {
    bloodUnitId: 'BU2026001234',
    bloodGroup: 'B+',
    expiryDate: new Date(Date.now() + 40 * 60 * 60 * 1000), // 40 hours from now
    status: 'Available'
  };

  const sampleActivities = {
    campsOrganized: 3,
    donationsCompleted: 8,
    hospitalCollaborations: 2,
    communityPosts: 12,
    helpfulComments: 25,
    campsAttended: 5,
    certificatesEarned: 6
  };

  return (
    <div className="new-features-demo">
      <header className="demo-header">
        <h1>🎉 New Features Showcase</h1>
        <p>Demonstrating all 5 newly added features</p>
      </header>

      <nav className="demo-nav">
        <button 
          className={activeTab === 'urgency' ? 'active' : ''}
          onClick={() => setActiveTab('urgency')}
        >
          📊 Urgency Index
        </button>
        <button 
          className={activeTab === 'badges' ? 'active' : ''}
          onClick={() => setActiveTab('badges')}
        >
          ✓ Verification Badges
        </button>
        <button 
          className={activeTab === 'lifecycle' ? 'active' : ''}
          onClick={() => setActiveTab('lifecycle')}
        >
          🩸 Waste Risk
        </button>
        <button 
          className={activeTab === 'heatmap' ? 'active' : ''}
          onClick={() => setActiveTab('heatmap')}
        >
          🗺️ Geo Heatmap
        </button>
        <button 
          className={activeTab === 'reputation' ? 'active' : ''}
          onClick={() => setActiveTab('reputation')}
        >
          🏆 Reputation
        </button>
      </nav>

      <div className="demo-content">
        {activeTab === 'urgency' && (
          <div className="feature-section">
            <div className="section-header">
              <h2>Feature 1: Blood Demand Urgency Index</h2>
              <p>Rule-based deterministic scoring system for blood requests</p>
            </div>

            <div className="demo-grid">
              <div>
                <h3>High Urgency Example</h3>
                <UrgencyIndexCard request={sampleBloodRequest} />
              </div>

              <div>
                <h3>Low Urgency Example</h3>
                <UrgencyIndexCard request={sampleBloodRequest2} />
              </div>
            </div>

            <div className="integration-note">
              <h4>📌 Integration Points:</h4>
              <ul>
                <li>Hospital Dashboard - Blood request listings</li>
                <li>Doctor Dashboard - Patient request review</li>
                <li>Admin Overview - Emergency request monitoring</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'badges' && (
          <div className="feature-section">
            <div className="section-header">
              <h2>Feature 2: Verified Request Badge System</h2>
              <p>Trust indicators for blood requests from different sources</p>
            </div>

            <div className="badges-showcase">
              {sampleRequests.map(request => (
                <div key={request.id} className="badge-example">
                  <div className="badge-header">
                    <h4>{request.patientName}</h4>
                    <VerificationBadge request={request} showDetails={true} />
                  </div>
                  <p className="badge-description">
                    Source: {request.source} | 
                    {request.adminReviewed ? ' Reviewed' : ' Pending'}
                  </p>
                </div>
              ))}
            </div>

            <div className="integration-note">
              <h4>📌 Integration Points:</h4>
              <ul>
                <li>Community posts - Show badge on each request</li>
                <li>Hospital requests - Auto-verified with hospital badge</li>
                <li>Camp requests - Show camp-generated badge</li>
                <li>Admin panel - Review and approve community requests</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'lifecycle' && (
          <div className="feature-section">
            <div className="section-header">
              <h2>Feature 3: Blood Unit Lifecycle Intelligence</h2>
              <p>Enhanced with waste risk indicator and transfer suggestions</p>
            </div>

            <WasteRiskIndicator unit={sampleBloodUnit} showSuggestions={true} />

            <div className="integration-note">
              <h4>📌 Integration Points:</h4>
              <ul>
                <li>Blood Inventory Page - Show for each unit</li>
                <li>Hospital Dashboard - Expiry alerts section</li>
                <li>Doctor Dashboard - Critical units overview</li>
                <li>Existing LifecycleViewer component - Add waste risk tab</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'heatmap' && (
          <div className="feature-section">
            <div className="section-header">
              <h2>Feature 4: Geo-Time Heatmap</h2>
              <p>Geographic visualization of blood demand intensity</p>
            </div>

            <GeoTimeHeatmap />

            <div className="integration-note">
              <h4>📌 Integration Points:</h4>
              <ul>
                <li>Super Admin Dashboard - Planning and analytics tab</li>
                <li>Hospital Admin Dashboard - Demand insights section</li>
                <li>Camp Planning Page - Location selection helper</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'reputation' && (
          <div className="feature-section">
            <div className="section-header">
              <h2>Feature 5: Community Reputation & Impact Score</h2>
              <p>Gamification system to encourage ethical participation</p>
            </div>

            <ReputationCard 
              activities={sampleActivities} 
              userName="L. Gaveshna"
            />

            <div className="integration-note">
              <h4>📌 Integration Points:</h4>
              <ul>
                <li>Public User Dashboard - Profile section</li>
                <li>Community Page - Show compact badge next to username</li>
                <li>Camp Organizer Profiles - Full reputation card</li>
                <li>Leaderboard Page (optional) - Top contributors</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <footer className="demo-footer">
        <div className="footer-content">
          <h3>✅ Implementation Status</h3>
          <div className="status-grid">
            <div className="status-item completed">
              <span className="status-icon">✓</span>
              <span>Urgency Index Calculator</span>
            </div>
            <div className="status-item completed">
              <span className="status-icon">✓</span>
              <span>Verification Badge System</span>
            </div>
            <div className="status-item completed">
              <span className="status-icon">✓</span>
              <span>Waste Risk Indicator</span>
            </div>
            <div className="status-item completed">
              <span className="status-icon">✓</span>
              <span>Geo-Time Heatmap</span>
            </div>
            <div className="status-item completed">
              <span className="status-icon">✓</span>
              <span>Reputation System</span>
            </div>
            <div className="status-item completed">
              <span className="status-icon">✓</span>
              <span>Backend Model Updates</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default NewFeaturesDemo;
