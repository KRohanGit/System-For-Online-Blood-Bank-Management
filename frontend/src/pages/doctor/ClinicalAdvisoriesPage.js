import React, { useState, useEffect } from 'react';
import clinicalAdvisoryAPI from '../../services/clinicalAdvisoryAPI';
import AdvisoryCard from '../../components/doctor/clinical/AdvisoryCard';
import ComponentSuitabilityChart from '../../components/doctor/clinical/ComponentSuitabilityChart';
import InventoryRiskChart from '../../components/doctor/clinical/InventoryRiskChart';
import RareBloodConservationChart from '../../components/doctor/clinical/RareBloodConservationChart';
import AdvisoryTrendChart from '../../components/doctor/clinical/AdvisoryTrendChart';
import './ClinicalAdvisoriesPage.css';

const ClinicalAdvisoriesPage = () => {
  const [advisories, setAdvisories] = useState([]);
  const [summary, setSummary] = useState({ critical: 0, medium: 0, total: 0 });
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAdvisory, setSelectedAdvisory] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAdvisories();
    loadTrends();
  }, []);

  const loadAdvisories = async () => {
    try {
      setError('');
      const response = await clinicalAdvisoryAPI.getActiveAdvisories();
      if (response.success) {
        setAdvisories(response.data.advisories);
        setSummary(response.data.summary);
      }
    } catch (error) {
      console.error('Error loading advisories:', error);
      setAdvisories([]);
      setSummary({ critical: 0, medium: 0, total: 0 });
      setError('Unable to load advisories right now.');
    } finally {
      setLoading(false);
    }
  };

  const loadTrends = async () => {
    try {
      setError('');
      const response = await clinicalAdvisoryAPI.getTrends(30);
      if (response.success) {
        setTrends(response.data);
      }
    } catch (error) {
      console.error('Error loading trends:', error);
      setTrends([]);
      setError((prev) => prev || 'Unable to load advisory trends right now.');
    }
  };

  const handleAdvisoryAction = async (advisoryId, action, justification) => {
    try {
      const advisory = advisories.find(a => a.advisoryId === advisoryId);
      await clinicalAdvisoryAPI.recordAction({
        advisoryId,
        action,
        justification,
        bloodGroup: advisory.bloodGroup,
        component: 'whole_blood'
      });
      loadAdvisories();
      loadTrends();
    } catch (error) {
      console.error('Error recording action:', error);
      alert('Failed to record action');
    }
  };

  if (loading) {
    return <div className="loading">Loading advisories...</div>;
  }

  const criticalAdvisories = advisories.filter(a => a.severity === 'critical');
  const mediumAdvisories = advisories.filter(a => a.severity === 'medium');
  const rareBloodData = advisories.filter(a => a.isRare);

  return (
    <div className="clinical-advisories-page">
      <div className="advisories-header">
        <h1>Clinical Advisories</h1>
        <div className="summary-pills">
          <span className="pill critical">{summary.critical} Critical</span>
          <span className="pill medium">{summary.medium} Medium</span>
          <span className="pill total">{summary.total} Total</span>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="advisories-grid">
        <div className="advisories-column">
          <h2>Active Advisories</h2>
          {criticalAdvisories.length > 0 && (
            <div className="advisory-section">
              <h3 className="severity-critical">🚨 Critical</h3>
              {criticalAdvisories.map(advisory => (
                <AdvisoryCard
                  key={advisory.advisoryId}
                  advisory={advisory}
                  onAction={handleAdvisoryAction}
                  onSelect={setSelectedAdvisory}
                />
              ))}
            </div>
          )}

          {mediumAdvisories.length > 0 && (
            <div className="advisory-section">
              <h3 className="severity-medium">⚠️ Medium Priority</h3>
              {mediumAdvisories.map(advisory => (
                <AdvisoryCard
                  key={advisory.advisoryId}
                  advisory={advisory}
                  onAction={handleAdvisoryAction}
                  onSelect={setSelectedAdvisory}
                />
              ))}
            </div>
          )}

          {advisories.length === 0 && (
            <div className="no-advisories">
              <p>✅ No active advisories at this time</p>
              <small>All stock levels are within normal parameters</small>
            </div>
          )}
        </div>

        <div className="charts-column">
          <h2>Visual Analytics</h2>
          
          <div className="chart-card">
            <h3>Inventory Risk Levels</h3>
            <InventoryRiskChart advisories={advisories} />
          </div>

          <div className="chart-card">
            <h3>Rare Blood Conservation</h3>
            <RareBloodConservationChart data={rareBloodData} />
          </div>

          <div className="chart-card">
            <h3>Advisory Trigger Trends (30 Days)</h3>
            <AdvisoryTrendChart data={trends} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClinicalAdvisoriesPage;
