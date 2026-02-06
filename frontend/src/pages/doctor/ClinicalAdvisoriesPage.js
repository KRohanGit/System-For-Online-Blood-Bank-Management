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

  useEffect(() => {
    loadAdvisories();
    loadTrends();
  }, []);

  const loadAdvisories = async () => {
    try {
      const response = await clinicalAdvisoryAPI.getActiveAdvisories();
      if (response.success) {
        setAdvisories(response.data.advisories);
        setSummary(response.data.summary);
      }
    } catch (error) {
      console.error('Error loading advisories:', error);
      const dummyAdvisories = [
        {
          advisoryId: 'ADV001',
          bloodGroup: 'O-',
          severity: 'critical',
          title: 'Critical O- Blood Stock',
          message: 'O- blood stock below critical threshold (2 units). Recommend immediate blood drive activation.',
          protocol: { id: 'P001', name: 'Rare Blood Conservation', threshold: 5 },
          timestamp: new Date(Date.now() - 3600000).toISOString()
        },
        {
          advisoryId: 'ADV002',
          bloodGroup: 'AB-',
          severity: 'medium',
          title: 'Low AB- Inventory',
          message: 'AB- blood stock at 6 units. Consider activating rare blood conservation protocol.',
          protocol: { id: 'P002', name: 'Inventory Management', threshold: 10 },
          timestamp: new Date(Date.now() - 7200000).toISOString()
        }
      ];
      setAdvisories(dummyAdvisories);
      setSummary({ critical: 1, medium: 1, total: 2 });
    } finally {
      setLoading(false);
    }
  };

  const loadTrends = async () => {
    try {
      const response = await clinicalAdvisoryAPI.getTrends(30);
      if (response.success) {
        setTrends(response.data);
      }
    } catch (error) {
      console.error('Error loading trends:', error);
      const dummyTrends = Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
        accepted: Math.floor(Math.random() * 15) + 5,
        overridden: Math.floor(Math.random() * 5),
        deferred: Math.floor(Math.random() * 3)
      }));
      setTrends(dummyTrends);
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
