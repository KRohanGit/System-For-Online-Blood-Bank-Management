import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as mlAPI from '../../services/mlAPI';
import { connectSocket, onEvent } from '../../services/socketService';
import MLNavSidebar from '../../components/ml/MLNavSidebar';
import { ResultPanel } from '../../components/ml/MLResults';
import DemandForecastPage from './ml/DemandForecastPage';
import CrisisPredictionPage from './ml/CrisisPredictionPage';
import WastageRiskPage from './ml-intelligence/wastage-risk/WastageRiskPage';
import {
  AnomalyForm,
  RankingForm, SimulationForm, OptimizeForm, SyntheticForm,
} from '../../components/ml/MLForms';
import { ML_NAV_ITEMS, DEFAULT_FORMS, ML_TAB_ROUTE_PREFIX } from '../../constants/mlConstants';
import '../../styles/admin.css';
import '../../styles/ml-intelligence.css';

function getUserId() {
  try {
    const t = localStorage.getItem('token');
    if (t) { const p = JSON.parse(atob(t.split('.')[1])); return p.userId || p.id || p._id; }
  } catch {}
  return null;
}

function getUserRole() {
  try {
    const t = localStorage.getItem('token');
    if (t) {
      const p = JSON.parse(atob(t.split('.')[1]));
      return p.role || p.userRole || 'hospital_admin';
    }
  } catch {}
  return 'hospital_admin';
}

function MLIntelligencePage() {
  const navigate = useNavigate();
  const { tabId } = useParams();
  const [loading, setLoading] = useState(false);
  const [mlHealth, setMlHealth] = useState({ status: 'connecting' });
  
  // Per-tab state: results and errors to persist across tab switches
  const [tabResults, setTabResults] = useState({});
  const [tabErrors, setTabErrors] = useState({});
  const [syntheticHistory, setSyntheticHistory] = useState([]);
  const [latestSyntheticSocketEvent, setLatestSyntheticSocketEvent] = useState(null);
  const [optimizationHistory, setOptimizationHistory] = useState([]);
  const [latestOptimizationSocketEvent, setLatestOptimizationSocketEvent] = useState(null);
  const [latestRankingSocketEvent, setLatestRankingSocketEvent] = useState(null);
  const userRole = getUserRole();
  const visibleNavItems = ML_NAV_ITEMS.filter((item) => !(userRole === 'hospital_admin' && item.id === 'synthetic'));
  
  const [forms, setForms] = useState(DEFAULT_FORMS);
  const setForm = (tab, val) => setForms(f => ({ ...f, [tab]: val }));

  const isValidTab = visibleNavItems.some(item => item.id === tabId);
  const activeTab = isValidTab ? tabId : 'demand';

  useEffect(() => {
    if (!tabId || !isValidTab) {
      navigate(`${ML_TAB_ROUTE_PREFIX}/demand`, { replace: true });
    }
  }, [tabId, isValidTab, navigate]);

  // Get current tab's result and error
  const results = tabResults[activeTab] || null;
  const error = tabErrors[activeTab] || '';

  useEffect(() => {
    let mounted = true;
    setMlHealth({ status: 'connecting' });

    mlAPI.getMLHealth()
      .then((r) => {
        if (!mounted) return;
        setMlHealth({ status: r?.data?.status === 'healthy' ? 'healthy' : 'offline' });
      })
      .catch(() => {
        if (!mounted) return;
        setMlHealth({ status: 'offline' });
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const userId = getUserId();
    if (!userId) return undefined;

    connectSocket(userId, getUserRole());

    const offSyntheticUpdate = onEvent('synthetic_data_generated', async (payload) => {
      setLatestSyntheticSocketEvent(payload || null);

      try {
        const [previewResp, historyResp] = await Promise.all([
          mlAPI.getSyntheticPreview(payload?.generationId || null, 20),
          mlAPI.getSyntheticHistory(10)
        ]);

        const previewData = previewResp?.data || previewResp;
        const historyData = historyResp?.data || historyResp;

        if (previewData?.preview?.length || previewData?.generated_count) {
          setTabResults((r) => ({
            ...r,
            synthetic: {
              ...r.synthetic,
              ...previewData,
              generated_count: previewData.generated_count || previewData.preview?.length || r.synthetic?.generated_count || 0
            }
          }));
        }

        setSyntheticHistory(historyData?.history || []);
      } catch {
        // Keep current UI state when realtime refresh fails.
      }
    });

    const offOptimizationUpdate = onEvent('optimization_update', async (payload) => {
      setLatestOptimizationSocketEvent(payload || null);

      try {
        const [historyResp, compareResp] = await Promise.all([
          mlAPI.getOptimizationHistory(12),
          mlAPI.getOptimizationCompare(payload?.runId || null)
        ]);

        const historyData = historyResp?.data || historyResp;
        const compareData = compareResp?.data || compareResp;

        setOptimizationHistory(historyData?.history || []);

        if (compareData?.compare) {
          setTabResults((r) => ({
            ...r,
            optimize: {
              ...r.optimize,
              compare: compareData.compare,
              impactMetrics: {
                ...r.optimize?.impactMetrics,
                ...(compareData.impact || {})
              }
            }
          }));
        }
      } catch {
        // Keep current UI data when realtime metadata refresh fails.
      }
    });

    const offRankingUpdate = onEvent('hospital_ranking_update', (payload) => {
      setLatestRankingSocketEvent(payload || null);

      if (!payload?.rankedHospitals?.length) {
        return;
      }

      setTabResults((r) => ({
        ...r,
        ranking: {
          ...r.ranking,
          ranked_hospitals: payload.rankedHospitals,
          total_evaluated: payload.totalEvaluated || payload.rankedHospitals.length,
          generatedAt: payload.generatedAt || r.ranking?.generatedAt
        }
      }));
    });

    return () => {
      if (typeof offSyntheticUpdate === 'function') {
        offSyntheticUpdate();
      }
      if (typeof offOptimizationUpdate === 'function') {
        offOptimizationUpdate();
      }
      if (typeof offRankingUpdate === 'function') {
        offRankingUpdate();
      }
    };
  }, []);

  useEffect(() => {
    if (activeTab !== 'synthetic') return;

    let isMounted = true;

    Promise.all([mlAPI.getSyntheticPreview(null, 20), mlAPI.getSyntheticHistory(10)])
      .then(([previewResp, historyResp]) => {
        if (!isMounted) return;

        const previewData = previewResp?.data || previewResp;
        const historyData = historyResp?.data || historyResp;

        if (previewData?.preview?.length || previewData?.generated_count) {
          setTabResults((r) => ({
            ...r,
            synthetic: {
              ...r.synthetic,
              ...previewData,
              generated_count: previewData.generated_count || previewData.preview?.length || r.synthetic?.generated_count || 0,
              data_type: previewData.dataType || r.synthetic?.data_type || 'donors'
            }
          }));
        }

        setSyntheticHistory(historyData?.history || []);
      })
      .catch(() => {
        if (!isMounted) return;
      });

    return () => {
      isMounted = false;
    };
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'optimize') return;

    let isMounted = true;

    Promise.all([mlAPI.getOptimizationHistory(12), mlAPI.getOptimizationCompare(null)])
      .then(([historyResp, compareResp]) => {
        if (!isMounted) return;

        const historyData = historyResp?.data || historyResp;
        const compareData = compareResp?.data || compareResp;

        setOptimizationHistory(historyData?.history || []);

        if (compareData?.compare) {
          setTabResults((r) => ({
            ...r,
            optimize: {
              ...r.optimize,
              compare: compareData.compare,
              impactMetrics: {
                ...r.optimize?.impactMetrics,
                ...(compareData.impact || {})
              },
              explanation: compareData.explanation || r.optimize?.explanation
            }
          }));
        }
      })
      .catch(() => {
        if (!isMounted) return;
      });

    return () => {
      isMounted = false;
    };
  }, [activeTab]);

  const resolveHospitalId = () => {
    const uid = getUserId();
    if (!uid) {
      setTabErrors(e => ({ ...e, [activeTab]: 'Hospital ID could not be resolved. Please ensure you are logged in.' }));
      return null;
    }
    return uid;
  };

  const clearTabError = (tab) => {
    setTabErrors(e => ({ ...e, [tab]: '' }));
  };

  const run = async (type) => {
    setLoading(true);
    clearTabError(type);
    
    const uid = resolveHospitalId();
    if (!uid && ['crisis', 'wastage', 'anomaly'].includes(type)) {
      setLoading(false);
      return;
    }

    try {
      let resp;
      const f = forms[type];

      if (type === 'crisis') {
        resp = await mlAPI.predictCrisis(uid, f.lookaheadHours);
      } else if (type === 'wastage') {
        resp = await mlAPI.predictWastage(uid, f.bloodGroup || null, f.horizonDays);
      } else if (type === 'anomaly') {
        resp = await mlAPI.detectAnomalies(uid, f.metricType, f.timeWindowHours);
      } else if (type === 'ranking') {
        const latitude = Number(f.latitude);
        const longitude = Number(f.longitude);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          throw new Error('Enter valid patient latitude and longitude before ranking hospitals.');
        }

        resp = await mlAPI.rankHospitals(
          f.bloodGroup,
          f.urgency,
          {
            latitude,
            longitude
          },
          f.unitsNeeded,
          f.maxDistanceKm,
          !!f.useOptimizationValidation
        );
      } else if (type === 'simulation') {
        resp = await mlAPI.runSimulation(f.scenarioType, f.scenarioParams || {}, f.durationDays, f.monteCarloRuns);
      } else if (type === 'optimize') {
        resp = await mlAPI.optimizeTransfers({
          mode: f.mode,
          timeHorizonDays: f.timeHorizonDays,
          constraints: {
            transportCapacityPerRoute: f.transportCapacity,
            maxDistanceKm: f.maxDistanceKm
          },
          hospitalIds: f.hospitalIds || null,
          bloodGroups: f.bloodGroups || null,
          includeRLSuggestions: f.includeRLSuggestions,
          includeGraphConnectivity: f.includeGraphConnectivity
        });
      } else if (type === 'synthetic') {
        resp = await mlAPI.generateSyntheticData({
          dataType: f.dataType,
          count: f.count,
          seed: f.seed,
          scenario: f.scenario,
          district: f.district,
          includeGeo: f.includeGeo,
          injectToSystem: f.injectToSystem
        });
      }

      const responseData = resp?.data || resp;
      setTabResults(r => ({ ...r, [type]: responseData }));

      if (type === 'optimize') {
        const [historyResp, compareResp] = await Promise.all([
          mlAPI.getOptimizationHistory(12),
          mlAPI.getOptimizationCompare(responseData?.runId || null)
        ]);

        const historyData = historyResp?.data || historyResp;
        const compareData = compareResp?.data || compareResp;

        setOptimizationHistory(historyData?.history || []);
        setTabResults((r) => ({
          ...r,
          optimize: {
            ...responseData,
            compare: compareData?.compare || responseData?.compare || null
          }
        }));
      }

      if (type === 'synthetic') {
        const historyResp = await mlAPI.getSyntheticHistory(10);
        const historyData = historyResp?.data || historyResp;
        setSyntheticHistory(historyData?.history || []);
      }
    } catch (err) {
      const fallback = type === 'synthetic'
        ? 'Synthetic generation service is unavailable. Ensure backend server is running.'
        : 'ML Service unavailable. Run: cd ml-service && python -m uvicorn main:app --port 8000';
      const errorMsg = err.response?.data?.message || err.message || fallback;
      setTabErrors(e => ({ ...e, [type]: errorMsg }));
    } finally {
      setLoading(false);
    }
  };

  const nav = visibleNavItems.find(n => n.id === activeTab);
  const panelMetaByTab = {
    ranking: {
      label: 'REAL-TIME AI HOSPITAL DECISION ENGINE',
      desc: 'Live context-aware ranking using urgency, availability, reliability, workload, and response speed.'
    },
    optimize: {
      label: 'AI TRANSFER OPTIMIZATION ENGINE',
      desc: 'Multi-objective optimization balancing emergency coverage, wastage reduction, and transport constraints.'
    },
    synthetic: {
      label: 'AI SYNTHETIC DONOR MODEL',
      desc: 'Scenario-driven synthetic data generation for safe testing and resilience planning.'
    }
  };
  const panelMeta = panelMetaByTab[activeTab] || { label: nav?.label, desc: nav?.desc };

  const formProps = (tab) => ({
    form: forms[tab],
    setForm: val => setForm(tab, val),
    onRun: () => run(tab),
    loading,
    color: nav?.color,
  });

  return (
    <div className="admin-layout">
      <main className="admin-main">
        <div className="admin-header">
          <div className="mli-header-content">
            <div>
              <h1 className="mli-page-title">🧠 ML Intelligence Hub</h1>
              <p className="mli-page-subtitle">AI-powered blood bank analytics &amp; predictions</p>
            </div>
            <span className={`mli-health-badge ${mlHealth?.status === 'healthy' ? 'mli-online' : mlHealth?.status === 'connecting' ? 'mli-connecting' : 'mli-offline'}`}>
              <span className="mli-health-dot" />
              {mlHealth?.status === 'healthy' ? 'ML Active' : mlHealth?.status === 'connecting' ? 'ML Connecting...' : 'ML Offline - using cached model'}
            </span>
          </div>
        </div>

        <div className="mli-body">
          <MLNavSidebar activeTab={activeTab} items={visibleNavItems} />

          <div className="mli-content">
            <div className="mli-panel">
              <div className="mli-panel-header" style={{ borderBottomColor: nav?.color }}>
                <div className="mli-panel-icon" style={{ background: nav?.color }}>{nav?.icon}</div>
                <div>
                  <h2 className="mli-panel-title">{panelMeta.label}</h2>
                  <p className="mli-panel-desc">{panelMeta.desc}</p>
                </div>
              </div>

              <div className="mli-panel-body">
                {activeTab === 'ranking' && (
                  <div className="mli-ai-summary" role="note" aria-label="Ranking engine capabilities">
                    <div className="mli-ai-summary-title">What this engine now does</div>
                    <div className="mli-ai-summary-grid">
                      <div className="mli-ai-summary-item">Live inventory and workload aware scoring</div>
                      <div className="mli-ai-summary-item">Urgency-adaptive dynamic weighting</div>
                      <div className="mli-ai-summary-item">Explainable ranking with confidence and ETA</div>
                      <div className="mli-ai-summary-item">Realtime ranking refresh via socket events</div>
                    </div>
                  </div>
                )}

                {activeTab === 'demand' && <DemandForecastPage />}
                {activeTab === 'crisis' && <CrisisPredictionPage />}

                {activeTab === 'wastage'    && <WastageRiskPage />}
                {activeTab === 'anomaly'    && <AnomalyForm    {...formProps('anomaly')} />}
                {activeTab === 'ranking'    && <RankingForm    {...formProps('ranking')} />}
                {activeTab === 'simulation' && <SimulationForm {...formProps('simulation')} />}
                {activeTab === 'optimize'   && <OptimizeForm   {...formProps('optimize')} />}
                {activeTab === 'synthetic'  && <SyntheticForm  {...formProps('synthetic')} />}
              </div>

              {error && activeTab !== 'demand' && activeTab !== 'crisis' && activeTab !== 'wastage' && (
                <div className="mli-error">
                  <span className="mli-error-icon">⚠️</span>
                  <div style={{ flex: 1 }}>
                    <div className="mli-error-msg">{error}</div>
                    <div className="mli-error-hint">Start ML service: <code>cd ml-service && python -m uvicorn main:app --port 8000</code></div>
                  </div>
                  <button
                    className="mli-error-close"
                    onClick={() => clearTabError(activeTab)}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: 'rgba(255,255,255,0.5)',
                      cursor: 'pointer',
                      fontSize: '16px',
                      padding: '0 8px'
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}

              {results && !error && activeTab !== 'demand' && activeTab !== 'crisis' && activeTab !== 'wastage' && (
                <ResultPanel
                  tab={activeTab}
                  data={results}
                  color={nav?.color}
                  extra={{
                    history: activeTab === 'optimize' ? optimizationHistory : (activeTab === 'synthetic' ? syntheticHistory : []),
                    latestSocketEvent:
                      activeTab === 'optimize'
                        ? latestOptimizationSocketEvent
                        : activeTab === 'synthetic'
                        ? latestSyntheticSocketEvent
                        : activeTab === 'ranking'
                        ? latestRankingSocketEvent
                        : null,
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default MLIntelligencePage;
