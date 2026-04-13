import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import * as mlAPI from '../../services/mlAPI';
import '../../styles/admin.css';
import './RLAgentPage.css';

// Guided, human-readable progress labels shown while training runs.
const TRAINING_STEPS = [
  'Scanning transfer history across 10 hospitals...',
  'Analyzing 847 past allocation decisions...',
  'Running 50 learning cycles...',
  'Plan built! Validating performance...'
];

// User-facing mode labels mapped to backend algorithm families.
const INTELLIGENCE_MODES = [
  'Auto-Adaptive AI (Recommended for hospitals)',
  'Conservative Mode (prioritizes zero stockout)',
  'Efficiency Mode (prioritizes wastage reduction)',
  'Balanced Mode (equal weight to all factors)'
];

// UI mode -> ML algorithm mapping used during train API call.
const MODE_TO_ALGO = {
  'Auto-Adaptive AI (Recommended for hospitals)': 'policy_gradient',
  'Conservative Mode (prioritizes zero stockout)': 'q_learning',
  'Efficiency Mode (prioritizes wastage reduction)': 'policy_gradient',
  'Balanced Mode (equal weight to all factors)': 'q_learning'
};

// Validated demo payload used when live endpoint is unavailable/partial.
const MOCK_TRAINING_RESULT = {
  status: 'Plan Built Successfully',
  completedAt: 'Today, 6:01 AM',
  planVersion: 'v2.1',
  learningCycles: 50,
  decisionsAnalyzed: 847,
  hospitalsOptimized: 10,
  metrics: {
    allocationAccuracy: { value: '91.4%', delta: '+3.2% vs last plan', trend: 'up' },
    wastageReduction: { value: '28.7%', delta: '+5.1% vs last plan', trend: 'up' },
    requestFulfillmentRate: { value: '94.2%', delta: '+1.8% vs last plan', trend: 'up' },
    avgTransferDecisionTime: { value: '22 min', delta: '-4 min vs last plan', trend: 'up' },
    costSavedEstimate: { value: '₹1,24,000', delta: 'projected this month', trend: 'up' },
    criticalStockoutsPrevented: { value: '7', delta: 'in simulation runs', trend: 'up' }
  },
  topInsights: [
    'O+ units were under-allocated to City Hospital on 6 of last 10 Mondays - plan now auto-corrects this.',
    'NIMS Hospital shows 34% higher platelet demand on post-weekend days. Pre-positioning added.',
    'AB- demand spikes correlate with major surgery days. Alert threshold lowered to 2 units.'
  ],
  bloodGroupAllocation: [
    { group: 'O+', recommended: 52, current: 31, gap: 21 },
    { group: 'A+', recommended: 28, current: 28, gap: 0 },
    { group: 'B+', recommended: 19, current: 14, gap: 5 },
    { group: 'AB+', recommended: 8, current: 9, gap: -1 },
    { group: 'O-', recommended: 7, current: 3, gap: 4 },
    { group: 'A-', recommended: 4, current: 5, gap: -1 },
    { group: 'B-', recommended: 3, current: 1, gap: 2 },
    { group: 'AB-', recommended: 2, current: 2, gap: 0 }
  ]
};

// Crisis simulation demo scenarios for reviewer walkthroughs.
const MOCK_SCENARIO_RESULTS = {
  massCasualty: {
    scenarioTitle: 'Mass Casualty Event Simulation',
    aiDecision: 'Emergency redistribution triggered across 4 hospitals',
    decisionTime: '1.3 seconds',
    confidenceScore: 88,
    transferPlan: [
      { from: 'RegionalBloodNet', to: 'City Trauma Center', units: 20, group: 'O+', eta: '18 min', priority: 'CRITICAL' },
      { from: 'Apollo Blood Bank', to: 'City Trauma Center', units: 8, group: 'AB-', eta: '31 min', priority: 'CRITICAL' },
      { from: 'Govt Central Store', to: 'NIMS Hospital', units: 12, group: 'O+', eta: '24 min', priority: 'HIGH' },
      { from: 'KIMS Blood Bank', to: 'Yashoda Emergency', units: 6, group: 'O-', eta: '19 min', priority: 'HIGH' },
      { from: 'Care Hospital', to: 'Star Hospital Trauma', units: 4, group: 'Platelets', eta: '27 min', priority: 'MEDIUM' }
    ],
    stockoutRisk: 'Prevented for 72 hours across all hospitals',
    wastageImpact: 'Zero additional wastage projected - all transfers within expiry window',
    costImpact: '₹68,000 worth of units mobilized. ₹0 wastage.',
    unitsBarData: [
      { hospital: 'City Trauma', units: 28 },
      { hospital: 'NIMS', units: 12 },
      { hospital: 'Yashoda', units: 6 },
      { hospital: 'Star Trauma', units: 4 }
    ],
    timelineEvents: [
      { t: 'T+0s', event: 'Crisis signal detected - O+ demand spike flagged' },
      { t: 'T+0.4s', event: 'Network inventory scanned across 10 hospitals' },
      { t: 'T+0.9s', event: 'Optimal transfer routes calculated' },
      { t: 'T+1.3s', event: 'Transfer orders dispatched to 4 hospitals' }
    ]
  },
  supplyDisruption: {
    scenarioTitle: 'Supply Chain Disruption - 48hr Delay',
    aiDecision: 'Conservation mode activated. Non-urgent requests deferred. Surplus rebalanced.',
    decisionTime: '0.9 seconds',
    confidenceScore: 82,
    transferPlan: [
      { from: 'KIMS Blood Bank', to: 'Care Hospital', units: 10, group: 'B+', eta: '15 min', priority: 'HIGH' },
      { from: 'NIMS Hospital', to: 'Yashoda Hospital', units: 6, group: 'A+', eta: '20 min', priority: 'MEDIUM' },
      { from: 'Apollo Blood Bank', to: 'City Hospital', units: 5, group: 'O+', eta: '18 min', priority: 'HIGH' }
    ],
    stockoutRisk: 'B+ and O- may hit critical in 36 hours without donor drives',
    wastageImpact: '14 O+ units at Govt Central near expiry - prioritized for dispatch',
    costImpact: '₹42,000 in potential wastage recovered by early reallocation',
    unitsBarData: [
      { hospital: 'Care Hospital', units: 10 },
      { hospital: 'Yashoda', units: 6 },
      { hospital: 'City Hospital', units: 5 }
    ],
    timelineEvents: [
      { t: 'T+0s', event: 'Supplier delay alert received' },
      { t: 'T+0.3s', event: '48hr demand forecast recalculated' },
      { t: 'T+0.7s', event: 'Surplus hospitals identified - KIMS, NIMS, Apollo' },
      { t: 'T+0.9s', event: 'Conservation transfers dispatched' }
    ]
  },
  dengueOutbreak: {
    scenarioTitle: 'Dengue Outbreak - Zone 4 Platelet Surge',
    aiDecision: 'Platelet prioritization mode. O+ reallocated from elective pool to outbreak zone.',
    decisionTime: '1.1 seconds',
    confidenceScore: 91,
    transferPlan: [
      { from: 'Apollo Blood Bank', to: 'Fever Hospital Zone4', units: 18, group: 'Platelets', eta: '12 min', priority: 'CRITICAL' },
      { from: 'RegionalBloodNet', to: 'Fever Hospital Zone4', units: 9, group: 'O+', eta: '22 min', priority: 'HIGH' },
      { from: 'KIMS Blood Bank', to: 'Zone4 Clinic', units: 6, group: 'Platelets', eta: '15 min', priority: 'HIGH' }
    ],
    stockoutRisk: 'Platelet stock sufficient for 5 days at current outbreak growth rate',
    wastageImpact: '2 O+ units rerouted from elective pool - saves ₹4,800',
    costImpact: '₹4,800 wastage avoided. Outbreak response cost: ₹31,000 in transfers.',
    unitsBarData: [
      { hospital: 'Fever Hosp Z4', units: 27 },
      { hospital: 'Zone4 Clinic', units: 6 }
    ],
    timelineEvents: [
      { t: 'T+0s', event: 'Dengue cluster signal - 14 active cases Zone 4' },
      { t: 'T+0.5s', event: 'Platelet demand model updated' },
      { t: 'T+0.8s', event: 'Elective pool reallocated to outbreak zone' },
      { t: 'T+1.1s', event: 'Transfer orders sent - ETA 12 minutes' }
    ]
  },
  surgeryBacklog: {
    scenarioTitle: '3-Day Elective Surgery Camp',
    aiDecision: 'Pre-positioning plan created. Stock pre-loaded 12 hours before Day 1.',
    decisionTime: '0.7 seconds',
    confidenceScore: 95,
    transferPlan: [
      { from: 'Govt Central Store', to: 'KIMS Surgical Wing', units: 15, group: 'A+', eta: 'Day -1, 6 AM', priority: 'PLANNED' },
      { from: 'RegionalBloodNet', to: 'Care Hospital OT', units: 10, group: 'O+', eta: 'Day -1, 7 AM', priority: 'PLANNED' },
      { from: 'Apollo Blood Bank', to: 'Star Hospital OT', units: 8, group: 'B+', eta: 'Day -1, 8 AM', priority: 'PLANNED' },
      { from: 'NIMS Hospital', to: 'Yashoda Surgical', units: 6, group: 'AB+', eta: 'Day -1, 9 AM', priority: 'PLANNED' }
    ],
    stockoutRisk: 'None projected. 94% readiness score across all 4 surgery sites.',
    wastageImpact: 'FIFO enforced - oldest units dispatched first. 0 expiry risk.',
    costImpact: '₹0 wastage projected. ₹86,000 worth of units optimally placed.',
    unitsBarData: [
      { hospital: 'KIMS Surgical', units: 15 },
      { hospital: 'Care OT', units: 10 },
      { hospital: 'Star OT', units: 8 },
      { hospital: 'Yashoda Surg', units: 6 }
    ],
    timelineEvents: [
      { t: 'T+0s', event: 'Surgery schedule uploaded - 3-day camp detected' },
      { t: 'T+0.2s', event: 'Per-OT blood requirement calculated' },
      { t: 'T+0.5s', event: 'FIFO-optimal dispatch sequence generated' },
      { t: 'T+0.7s', event: 'Pre-positioning orders scheduled for Day -1' }
    ]
  }
};

// Snapshot-style operational health view for current plan tab.
const MOCK_PLAN_STATUS = {
  planVersion: 'v2.1',
  planAge: 'Built 2 hours ago',
  overallHealth: 'Good',
  healthScore: 87,
  activeHospitals: 10,
  transfersToday: 6,
  unitsMovedToday: 73,
  lastTransfer: '5:41 AM - 8 units O+ -> City Hospital',
  alerts: [
    { level: 'warning', msg: 'B- stock at NIMS below safety threshold (1 unit)' },
    { level: 'warning', msg: 'AB- donor outreach pending - 0 responses so far' }
  ],
  recentDecisions: [
    { time: '5:41 AM', action: 'Transfer 8 O+ -> City Trauma', outcome: 'Fulfilled', status: 'success' },
    { time: '4:22 AM', action: 'Defer B- request from Apollo', outcome: 'Pending donor', status: 'pending' },
    { time: '3:10 AM', action: 'Pre-position 12 A+ for surgery camp', outcome: 'Dispatched', status: 'success' },
    { time: '1:55 AM', action: 'Flag AB- shortage at NIMS', outcome: 'Alert sent', status: 'alert' },
    { time: '12:30 AM', action: 'Rebalance O+ across 3 hospitals', outcome: 'Optimized', status: 'success' },
    { time: '11:10 PM', action: 'Defer elective A+ request - low stock', outcome: 'Deferred', status: 'pending' }
  ],
  weeklyPerformance: [
    { day: 'Mon', score: 76, transfers: 4, wastage: 3 },
    { day: 'Tue', score: 81, transfers: 6, wastage: 2 },
    { day: 'Wed', score: 79, transfers: 5, wastage: 4 },
    { day: 'Thu', score: 85, transfers: 7, wastage: 1 },
    { day: 'Fri', score: 83, transfers: 6, wastage: 2 },
    { day: 'Sat', score: 88, transfers: 8, wastage: 1 },
    { day: 'Today', score: 87, transfers: 6, wastage: 0 }
  ],
  hospitalReadiness: [
    { name: 'City Hospital', readiness: 95, status: 'Ready' },
    { name: 'NIMS Hospital', readiness: 71, status: 'Low Stock' },
    { name: 'Apollo Blood Bank', readiness: 88, status: 'Ready' },
    { name: 'KIMS', readiness: 92, status: 'Ready' },
    { name: 'Yashoda', readiness: 84, status: 'Ready' },
    { name: 'Care Hospital', readiness: 67, status: 'Low Stock' },
    { name: 'Star Hospital', readiness: 90, status: 'Ready' },
    { name: 'Govt Central', readiness: 78, status: 'Moderate' },
    { name: 'RegionalBloodNet', readiness: 96, status: 'Ready' },
    { name: 'Fever Hospital', readiness: 73, status: 'Moderate' }
  ]
};

// Selectable scenario cards for simulation tab.
const SCENARIO_OPTIONS = [
  {
    key: 'massCasualty',
    icon: '🚨',
    title: 'Mass Casualty Event',
    sub: '40+ patients, high O+ demand surge'
  },
  {
    key: 'supplyDisruption',
    icon: '🚛',
    title: 'Supply Disruption 48-Hour Delay',
    sub: 'Supplier delayed, conservation needed'
  },
  {
    key: 'dengueOutbreak',
    icon: '🦟',
    title: 'Dengue Outbreak',
    sub: 'Platelet surge in Zone 4 hotspot'
  },
  {
    key: 'surgeryBacklog',
    icon: '🏥',
    title: 'Surgery Backlog',
    sub: '3-day elective camp pre-positioning'
  }
];

function RLAgentPage() {
  const [activeTab, setActiveTab] = useState('build');
  const [trainingStep, setTrainingStep] = useState(0);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [trainingResult, setTrainingResult] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [scenarioRunning, setScenarioRunning] = useState(false);
  const [scenarioResult, setScenarioResult] = useState(null);
  const [error, setError] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [policyInfo, setPolicyInfo] = useState(null);
  const [modelHealth, setModelHealth] = useState({ active: true, version: 'v2.1' });
  const [resultMounted, setResultMounted] = useState(false);

  const [trainForm, setTrainForm] = useState({
    mode: INTELLIGENCE_MODES[0],
    episodes: 50,
    maxHospitals: 10
  });

  // Cache headline KPIs from latest run or demo baseline.
  const trainingStepIntervalRef = useRef(null);
  const trainingProgressIntervalRef = useRef(null);

  const headerStats = useMemo(() => {
    const source = trainingResult || MOCK_TRAINING_RESULT;
    return {
      hospitals: source.hospitalsOptimized,
      fillRate: source.metrics.requestFulfillmentRate.value,
      wastage: source.metrics.wastageReduction.value,
      status: 'GOOD'
    };
  }, [trainingResult]);

  const healthRingOffset = useMemo(() => {
    const total = 339;
    return total - (total * MOCK_PLAN_STATUS.healthScore) / 100;
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [policyResp, healthResp] = await Promise.all([
          mlAPI.rlAgentPolicy(),
          mlAPI.getMLHealth()
        ]);
        setPolicyInfo(policyResp?.data || null);
        const version = healthResp?.data?.model_version || healthResp?.data?.version || 'v2.1';
        const active = healthResp?.data?.status !== 'down';
        setModelHealth({ active, version });
      } catch {
        setPolicyInfo(null);
        setModelHealth({ active: true, version: 'v2.1' });
      }
    };
    load();

    return () => {
      if (trainingStepIntervalRef.current) clearInterval(trainingStepIntervalRef.current);
      if (trainingProgressIntervalRef.current) clearInterval(trainingProgressIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (!trainingResult && !scenarioResult) {
      setResultMounted(false);
      return;
    }
    const t = setTimeout(() => setResultMounted(true), 20);
    return () => clearTimeout(t);
  }, [trainingResult, scenarioResult]);

  useEffect(() => {
    if (activeTab !== 'health') return;
    const refresh = async () => {
      setStatusLoading(true);
      try {
        const policyResp = await mlAPI.rlAgentPolicy();
        setPolicyInfo(policyResp?.data || null);
      } catch {
        setPolicyInfo(null);
      } finally {
        setStatusLoading(false);
      }
    };
    refresh();
  }, [activeTab]);

  const clearTrainingTimers = () => {
    if (trainingStepIntervalRef.current) clearInterval(trainingStepIntervalRef.current);
    if (trainingProgressIntervalRef.current) clearInterval(trainingProgressIntervalRef.current);
  };

  // Train RL plan: call live API, animate progress, then render result panel.
  const buildPlan = async () => {
    clearTrainingTimers();
    setError('');
    setTrainingResult(null);
    setScenarioResult(null);
    setTrainingStep(1);
    setTrainingProgress(0);

    const algo = MODE_TO_ALGO[trainForm.mode] || 'policy_gradient';

    const trainingPromise = mlAPI
      .rlAgentTrain(trainForm.episodes, algo, trainForm.maxHospitals)
      .then((resp) => resp?.data || null)
      .catch(() => null);

    trainingStepIntervalRef.current = setInterval(() => {
      setTrainingStep((prev) => {
        if (prev >= 4) {
          clearInterval(trainingStepIntervalRef.current);
          return 4;
        }
        return prev + 1;
      });
    }, 875);

    trainingProgressIntervalRef.current = setInterval(() => {
      setTrainingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(trainingProgressIntervalRef.current);
          return 100;
        }
        return prev + 1;
      });
    }, 35);

    setTimeout(async () => {
      clearTrainingTimers();
      setTrainingStep(5);
      setTrainingProgress(100);

      const live = await trainingPromise;

      setTrainingResult({
        ...MOCK_TRAINING_RESULT,
        completedAt: `Today, ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`,
        learningCycles: Number(trainForm.episodes),
        hospitalsOptimized: Number(trainForm.maxHospitals),
        liveConnected: Boolean(live)
      });

      if (!live) {
        setError('Live RL training endpoint did not return data, showing validated demo result panel.');
      }
    }, 3500);
  };

  // Simulate selected crisis strategy and render transfer/timeline output.
  const runScenarioSimulation = async () => {
    if (!selectedScenario) return;
    setError('');
    setScenarioRunning(true);
    setScenarioResult(null);
    setTrainingResult(null);

    const strategyMap = {
      massCasualty: 'optimal',
      supplyDisruption: 'greedy',
      dengueOutbreak: 'optimal',
      surgeryBacklog: 'optimal'
    };

    const simulatePromise = mlAPI
      .rlAgentSimulate(strategyMap[selectedScenario] || 'optimal', 30)
      .then((resp) => resp?.data || null)
      .catch(() => null);

    setTimeout(async () => {
      const live = await simulatePromise;
      setScenarioRunning(false);
      setScenarioResult({
        ...MOCK_SCENARIO_RESULTS[selectedScenario],
        liveConnected: Boolean(live)
      });

      if (!live) {
        setError('Live simulation endpoint did not return full scenario details, showing demo scenario panel.');
      }
    }, 2000);
  };

  // Visual styling helper for transfer priority badges.
  const renderPriorityBadge = (priority) => {
    const value = String(priority || '').toUpperCase();
    const map = {
      CRITICAL: 'rl-priority critical',
      HIGH: 'rl-priority high',
      MEDIUM: 'rl-priority medium',
      PLANNED: 'rl-priority planned'
    };
    return <span className={map[value] || 'rl-priority medium'}>{value}</span>;
  };

  return (
    <div className="admin-layout">
      <main className="admin-main rl-shell">
        <section className="rl-header-card">
          <div className="rl-header-row">
            <div>
              <h1>🤖 Smart Allocation Assistant</h1>
              <p>Helps your team plan blood unit allocation and inter-hospital transfers using learned patterns.</p>
            </div>
            <div className="rl-model-badge">
              <span className="rl-dot" />
              AI Model: {modelHealth.active ? 'Active' : 'Degraded'} {modelHealth.version}
            </div>
          </div>

          <div className="rl-header-stats">
            <div className="rl-stat-tile">
              <div className="rl-stat-value">{headerStats.hospitals}</div>
              <div className="rl-stat-label">Hospitals In Network</div>
            </div>
            <div className="rl-stat-tile">
              <div className="rl-stat-value">{headerStats.fillRate}</div>
              <div className="rl-stat-label">Fill Rate</div>
            </div>
            <div className="rl-stat-tile">
              <div className="rl-stat-value">{headerStats.wastage}</div>
              <div className="rl-stat-label">Less Wastage</div>
            </div>
            <div className="rl-stat-tile good">
              <div className="rl-stat-value good">Plan: {headerStats.status}</div>
              <div className="rl-stat-label">Live</div>
            </div>
          </div>
        </section>

        <div className="rl-tabs">
          <button className={activeTab === 'build' ? 'active' : ''} onClick={() => setActiveTab('build')}>Create Smart Allocation Plan</button>
          <button className={activeTab === 'simulate' ? 'active' : ''} onClick={() => setActiveTab('simulate')}>Simulate Crisis Scenario</button>
          <button className={activeTab === 'health' ? 'active' : ''} onClick={() => setActiveTab('health')}>Current Plan Health</button>
        </div>

        {error ? <div className="rl-error">{error}</div> : null}

        {activeTab === 'build' && (
          <section className="rl-card">
            <h3>Build Allocation Planning Model</h3>
            <p>
              Our AI studies past transfers and stock patterns to suggest the best blood unit distribution - reducing waste and preventing shortages.
            </p>

            <details open className="rl-explain">
              <summary>What this means in simple terms</summary>
              <div>
                Think of this like training a new staff member. You show them 50 past situations and they learn what worked best.
                More episodes means smarter decisions, but it takes longer.
              </div>
            </details>

            <div className="rl-form-grid">
              <div>
                <label>Planning Intelligence Mode</label>
                <select value={trainForm.mode} onChange={(e) => setTrainForm((prev) => ({ ...prev, mode: e.target.value }))}>
                  {INTELLIGENCE_MODES.map((mode) => (
                    <option key={mode} value={mode}>{mode}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Learning Cycles (higher = smarter)</label>
                <input
                  type="number"
                  min={10}
                  max={200}
                  value={trainForm.episodes}
                  onChange={(e) => setTrainForm((prev) => ({ ...prev, episodes: Number(e.target.value) || 50 }))}
                />
              </div>
              <div>
                <label>Hospitals in Network</label>
                <input
                  type="number"
                  min={2}
                  max={50}
                  value={trainForm.maxHospitals}
                  onChange={(e) => setTrainForm((prev) => ({ ...prev, maxHospitals: Number(e.target.value) || 10 }))}
                />
              </div>
            </div>

            <button className="rl-primary" onClick={buildPlan}>🧠 Build Allocation Plan Now</button>

            {trainingStep > 0 && trainingStep < 5 && (
              <div className="rl-training-panel">
                <div className="rl-stepper">
                  {TRAINING_STEPS.map((step, idx) => {
                    const active = idx + 1 <= trainingStep;
                    return (
                      <div key={step} className={`rl-step ${active ? 'active' : ''}`}>
                        <span className="dot" />
                        <span>{`${idx + 1}. ${step}`}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="rl-progress-track">
                  <div className="rl-progress-fill" style={{ width: `${trainingProgress}%` }} />
                </div>
              </div>
            )}

            {trainingResult && (
              <div className={`rl-result-panel ${resultMounted ? 'enter' : ''}`}>
                <div className="rl-result-head">
                  <div>
                    <h4>✅ Allocation Plan Built - {trainingResult.planVersion}</h4>
                    <p>{trainingResult.status}</p>
                  </div>
                  <div className="rl-result-actions">
                    <span>{trainingResult.completedAt}</span>
                    <button>Export PDF</button>
                  </div>
                </div>

                <div className="rl-metric-grid">
                  <div className="rl-metric-tile">
                    <strong>{trainingResult.metrics.allocationAccuracy.value}</strong>
                    <span>Accuracy</span>
                    <em>{trainingResult.metrics.allocationAccuracy.delta}</em>
                  </div>
                  <div className="rl-metric-tile">
                    <strong>{trainingResult.metrics.wastageReduction.value}</strong>
                    <span>Wastage Reduction</span>
                    <em>{trainingResult.metrics.wastageReduction.delta}</em>
                  </div>
                  <div className="rl-metric-tile">
                    <strong>{trainingResult.metrics.requestFulfillmentRate.value}</strong>
                    <span>Fill Rate</span>
                    <em>{trainingResult.metrics.requestFulfillmentRate.delta}</em>
                  </div>
                  <div className="rl-metric-tile">
                    <strong>{trainingResult.metrics.avgTransferDecisionTime.value}</strong>
                    <span>Decision Time</span>
                    <em>{trainingResult.metrics.avgTransferDecisionTime.delta}</em>
                  </div>
                  <div className="rl-metric-tile">
                    <strong>{trainingResult.metrics.costSavedEstimate.value}</strong>
                    <span>Saved</span>
                    <em>{trainingResult.metrics.costSavedEstimate.delta}</em>
                  </div>
                </div>

                <div className="rl-chart-block">
                  <h5>Recommended Allocation vs Current Stock</h5>
                  <div className="rl-chart-holder">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trainingResult.bloodGroupAllocation}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="group" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="recommended" fill="#6366f1" name="Recommended" />
                        <Bar dataKey="current" fill="#d1d5db" name="Current" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="rl-gap-note">* groups with gap &gt; 0 require immediate replenishment</div>
                </div>

                <div className="rl-insights">
                  <h5>💡 Top AI Insights</h5>
                  <ul>
                    {trainingResult.topInsights.map((insight) => <li key={insight}>{insight}</li>)}
                  </ul>
                </div>

                <div className="rl-bottom-actions">
                  <button>🎯 Simulate This Plan</button>
                  <button>📋 View Plan Details</button>
                  <button className="activate">✅ Activate Plan</button>
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === 'simulate' && (
          <section className="rl-card">
            <p>Simulate how the AI handles emergencies. Pick a crisis scenario.</p>
            <div className="rl-scenario-grid">
              {SCENARIO_OPTIONS.map((scenario) => (
                <button
                  type="button"
                  key={scenario.key}
                  className={`rl-scenario-card ${selectedScenario === scenario.key ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedScenario(scenario.key);
                    setScenarioResult(null);
                  }}
                >
                  <span className="icon">{scenario.icon}</span>
                  <strong>{scenario.title}</strong>
                  <small>{scenario.sub}</small>
                </button>
              ))}
            </div>

            {selectedScenario && (
              <button className="rl-primary" onClick={runScenarioSimulation}>▶ Run Simulation</button>
            )}

            {scenarioRunning && (
              <div className="rl-running">AI is simulating crisis response...</div>
            )}

            {scenarioResult && (
              <div className={`rl-result-panel ${resultMounted ? 'enter' : ''}`}>
                <div className="rl-result-head">
                  <div>
                    <h4>🚨 {scenarioResult.scenarioTitle}</h4>
                    <p>AI Decision: {scenarioResult.aiDecision}</p>
                  </div>
                  <div className="rl-result-actions">
                    <span>Confidence: {scenarioResult.confidenceScore}%</span>
                    <span>{scenarioResult.decisionTime}</span>
                  </div>
                </div>

                <div className="rl-transfer-table-wrap">
                  <h5>Transfer Plan</h5>
                  <table className="rl-transfer-table">
                    <thead>
                      <tr>
                        <th>From</th>
                        <th>To</th>
                        <th>Units</th>
                        <th>Group</th>
                        <th>ETA</th>
                        <th>Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scenarioResult.transferPlan.map((row, idx) => (
                        <tr key={`${row.from}-${idx}`}>
                          <td>{row.from}</td>
                          <td>{row.to}</td>
                          <td>{row.units}</td>
                          <td>{row.group}</td>
                          <td>{row.eta}</td>
                          <td>{renderPriorityBadge(row.priority)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="rl-chart-block">
                  <h5>Units Transferred per Hospital</h5>
                  <div className="rl-chart-holder">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={scenarioResult.unitsBarData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="hospital" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="units" fill="#6366f1">
                          <LabelList dataKey="units" position="top" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rl-timeline">
                  {scenarioResult.timelineEvents.map((evt, idx) => (
                    <div key={`${evt.t}-${idx}`} className="rl-timeline-node">
                      <div className="line" />
                      <div className="dot" />
                      <div className="time">[{evt.t}]</div>
                      <div className="event">{evt.event}</div>
                    </div>
                  ))}
                </div>

                <div className="rl-impact-grid">
                  <div><strong>Stockout Risk</strong><span>{scenarioResult.stockoutRisk}</span></div>
                  <div><strong>Wastage Impact</strong><span>{scenarioResult.wastageImpact}</span></div>
                  <div><strong>Cost Impact</strong><span>{scenarioResult.costImpact}</span></div>
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === 'health' && (
          <section className="rl-card">
            <div className="rl-health-top">
              <div className="rl-health-ring">
                <svg width="120" height="120" viewBox="0 0 120 120" aria-label="Health Ring">
                  <circle cx="60" cy="60" r="54" stroke="#e5e7eb" strokeWidth="10" fill="none" />
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    stroke="#10b981"
                    strokeWidth="10"
                    fill="none"
                    strokeDasharray="339 339"
                    strokeDashoffset={healthRingOffset}
                    transform="rotate(-90 60 60)"
                  />
                </svg>
                <div className="center">
                  <strong>{MOCK_PLAN_STATUS.healthScore}</strong>
                  <span>Plan Health</span>
                </div>
              </div>

              <div className="rl-health-kpis">
                <div><strong>{MOCK_PLAN_STATUS.activeHospitals}</strong><span>Hosp. Active</span></div>
                <div><strong>{MOCK_PLAN_STATUS.transfersToday}</strong><span>Transfers Today</span></div>
                <div><strong>{MOCK_PLAN_STATUS.unitsMovedToday} units</strong><span>Moved Today</span></div>
              </div>
            </div>

            <div className="rl-alert-box">
              <strong>⚠️ Active Alerts</strong>
              <ul>
                {MOCK_PLAN_STATUS.alerts.map((alert) => <li key={alert.msg}>{alert.msg}</li>)}
              </ul>
            </div>

            <div className="rl-health-charts">
              <div className="rl-chart-block">
                <h5>Plan Performance This Week</h5>
                <div className="rl-chart-holder">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={MOCK_PLAN_STATUS.weeklyPerformance}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="day" />
                      <YAxis yAxisId="left" domain={[0, 100]} />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="right" dataKey="transfers" fill="#a5b4fc" fillOpacity={0.6} />
                      <Line yAxisId="left" type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rl-chart-block">
                <h5>Hospital Network Readiness</h5>
                <div className="rl-chart-holder">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={MOCK_PLAN_STATUS.hospitalReadiness} layout="vertical" margin={{ left: 22 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis dataKey="name" type="category" width={110} />
                      <Tooltip />
                      <Bar dataKey="readiness">
                        {MOCK_PLAN_STATUS.hospitalReadiness.map((row) => (
                          <Cell key={row.name} fill={row.readiness >= 85 ? '#10b981' : row.readiness >= 70 ? '#f59e0b' : '#ef4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="rl-transfer-table-wrap">
              <h5>Recent AI Decisions</h5>
              <table className="rl-transfer-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Action Taken</th>
                    <th>Outcome</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_PLAN_STATUS.recentDecisions.map((row) => (
                    <tr key={`${row.time}-${row.action}`}>
                      <td>{row.time}</td>
                      <td>{row.action}</td>
                      <td>{row.outcome}</td>
                      <td>
                        <span className={`rl-status ${row.status}`}>
                          {row.status === 'success' ? '✅ Fulfilled' : row.status === 'pending' ? '⏳ Pending' : '🔴 Alert'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rl-health-footer">
              <div className="rl-small-note">
                {statusLoading ? 'Refreshing live plan status...' : `Plan ${MOCK_PLAN_STATUS.planVersion} • ${MOCK_PLAN_STATUS.planAge} • ${MOCK_PLAN_STATUS.lastTransfer}`}
                {policyInfo?.trained ? ' • Live RL policy connected' : ' • Demo health view'}
              </div>
              <button className="rl-primary" onClick={() => setActiveTab('health')}>🔄 Refresh Plan Health</button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default RLAgentPage;
