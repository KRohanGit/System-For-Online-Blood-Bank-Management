import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import bloodApi from '../services/bloodApi';
import Timeline from '../components/Timeline';
import BloodUnitCard from '../components/BloodUnitCard';
import TransferForm from '../components/TransferForm';
import UsageForm from '../components/UsageForm';
import './BloodTracingDashboard.css';

const BloodTracingDashboard = () => {
  const { unitId } = useParams();
  const [bloodUnit, setBloodUnit] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const userRole = localStorage.getItem('role'); // donor, hospital, admin, etc.

  useEffect(() => {
    const fetchBloodUnitData = async () => {
      setLoading(true);
      try {
        // Public endpoint - no auth needed
        const unitData = await bloodApi.getBloodUnitDetails(unitId);
        setBloodUnit(unitData);

        const timelineData = await bloodApi.getUnitTimeline(unitId);
        setTimeline(timelineData.timeline || []);
        setError(null);
      } catch (err) {
        setError(err.message || 'Failed to load blood unit data');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (unitId) {
      fetchBloodUnitData();
    }
  }, [unitId]);

  const handleTransferComplete = async (transferData) => {
    try {
      await bloodApi.completeTransfer(
        unitId,
        transferData.facility,
        transferData.facilityName,
        transferData.metadata
      );
      // Refresh data
      const unitData = await bloodApi.getBloodUnitDetails(unitId);
      setBloodUnit(unitData);
      const timelineData = await bloodApi.getUnitTimeline(unitId);
      setTimeline(timelineData.timeline || []);
      setActiveTab('overview');
    } catch (err) {
      setError(err.message || 'Failed to complete transfer');
    }
  };

  const handleUsageRecord = async (usageData) => {
    try {
      await bloodApi.recordUsage(
        unitId,
        usageData.hospital,
        usageData.ageGroup,
        usageData.procedure,
        usageData.urgency,
        usageData.outcome
      );
      // Refresh data
      const unitData = await bloodApi.getBloodUnitDetails(unitId);
      setBloodUnit(unitData);
      const timelineData = await bloodApi.getUnitTimeline(unitId);
      setTimeline(timelineData.timeline || []);
      setActiveTab('overview');
    } catch (err) {
      setError(err.message || 'Failed to record usage');
    }
  };

  if (loading) {
    return <div className="loading">Loading blood unit data...</div>;
  }

  if (error && !bloodUnit) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => window.history.back()}>Go Back</button>
      </div>
    );
  }

  return (
    <div className="blood-tracing-dashboard">
      <header className="dashboard-header">
        <h1>Blood Unit Tracing System</h1>
        <p>Complete lifecycle tracking with blockchain verification</p>
      </header>

      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      <div className="dashboard-content">
        {bloodUnit && (
          <>
            <BloodUnitCard unit={bloodUnit} />

            <div className="tabs">
              <button
                className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                Overview
              </button>
              <button
                className={`tab-button ${activeTab === 'timeline' ? 'active' : ''}`}
                onClick={() => setActiveTab('timeline')}
              >
                Timeline ({timeline.length})
              </button>
              {(userRole === 'admin' || userRole === 'hospital') && (
                <>
                  <button
                    className={`tab-button ${activeTab === 'transfer' ? 'active' : ''}`}
                    onClick={() => setActiveTab('transfer')}
                  >
                    Record Transfer
                  </button>
                  <button
                    className={`tab-button ${activeTab === 'usage' ? 'active' : ''}`}
                    onClick={() => setActiveTab('usage')}
                  >
                    Record Usage
                  </button>
                </>
              )}
            </div>

            <div className="tab-content">
              {activeTab === 'overview' && (
                <div className="overview-tab">
                  <div className="unit-details">
                    <h3>Unit Details</h3>
                    <table>
                      <tbody>
                        <tr>
                          <td>Unit ID:</td>
                          <td className="code">{bloodUnit.unitId}</td>
                        </tr>
                        <tr>
                          <td>Status:</td>
                          <td>
                            <span className={`badge status-${bloodUnit.status}`}>
                              {bloodUnit.status}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td>Blood Group:</td>
                          <td className="blood-group">{bloodUnit.bloodGroup}</td>
                        </tr>
                        <tr>
                          <td>Component:</td>
                          <td>{bloodUnit.component}</td>
                        </tr>
                        <tr>
                          <td>Volume:</td>
                          <td>{bloodUnit.volume} mL</td>
                        </tr>
                        <tr>
                          <td>Current Location:</td>
                          <td>{bloodUnit.currentLocation || 'Processing'}</td>
                        </tr>
                        {bloodUnit.expiryDate && (
                          <tr>
                            <td>Expiry Date:</td>
                            <td>{new Date(bloodUnit.expiryDate).toLocaleDateString()}</td>
                          </tr>
                        )}
                        <tr>
                          <td>Blockchain Tx:</td>
                          <td className="code txhash">
                            {bloodUnit.blockchainTx
                              ? bloodUnit.blockchainTx.substring(0, 16) + '...'
                              : 'Pending'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {bloodUnit.riskAssessment && (
                    <div className="risk-assessment">
                      <h3>Risk Assessment</h3>
                      <div className={`risk-level risk-${bloodUnit.riskAssessment.level}`}>
                        <strong>Level:</strong> {bloodUnit.riskAssessment.level}
                      </div>
                      {bloodUnit.riskAssessment.flags && bloodUnit.riskAssessment.flags.length > 0 && (
                        <div className="risk-flags">
                          <strong>Flags:</strong>
                          <ul>
                            {bloodUnit.riskAssessment.flags.map((flag, idx) => (
                              <li key={idx}>{flag}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'timeline' && (
                <div className="timeline-tab">
                  <Timeline events={timeline} />
                </div>
              )}

              {activeTab === 'transfer' && userRole && ['admin', 'hospital'].includes(userRole) && (
                <div className="transfer-tab">
                  <TransferForm unitId={unitId} onComplete={handleTransferComplete} />
                </div>
              )}

              {activeTab === 'usage' && userRole && ['admin', 'hospital'].includes(userRole) && (
                <div className="usage-tab">
                  <UsageForm unitId={unitId} onComplete={handleUsageRecord} />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BloodTracingDashboard;
