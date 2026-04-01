export const BLOOD_GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

export const ML_NAV_ITEMS = [
  { id: 'demand',     icon: '📈', label: 'Demand Forecast',      desc: 'AI demand projection',                       color: '#0ea5a4' },
  { id: 'crisis',     icon: '🚨', label: 'Crisis Prediction',    desc: 'Early warning risk intelligence',            color: '#ef4444' },
  { id: 'wastage',    icon: '⚠️', label: 'Wastage Risk',         desc: 'Expiry and spoilage prevention',             color: '#f59e0b' },
  { id: 'anomaly',    icon: '🔍', label: 'Anomaly Detection',    desc: 'Outlier and drift monitoring',               color: '#8b5cf6' },
  { id: 'ranking',    icon: '🏥', label: 'AI Decision Engine',   desc: 'Context-aware real-time hospital ranking',   color: '#06b6d4' },
  { id: 'simulation', icon: '🎲', label: 'Simulation',           desc: 'Scenario stress testing',                    color: '#10b981' },
  { id: 'optimize',   icon: '🔄', label: 'Transfer Optimizer',   desc: 'Multi-objective route optimization',         color: '#3b82f6' },
  { id: 'synthetic',  icon: '🧪', label: 'Synthetic Data',       desc: 'AI-generated donor network test data',       color: '#ec4899' },
];

export const ML_TAB_ROUTE_PREFIX = '/admin/ml-intelligence';

export const ADVANCED_AI_LINKS = [
  { path: '/admin/digital-twin',      icon: '🔬', label: 'Digital Twin' },
  { path: '/admin/rl-agent',          icon: '🤖', label: 'RL Agent' },
  { path: '/admin/graph-intelligence',icon: '🕸️', label: 'Graph Network' },
];

export const DEFAULT_FORMS = {
  demand:     { bloodGroup: 'O+', horizonDays: 7 },
  crisis:     { lookaheadHours: 48 },
  wastage:    { bloodGroup: '', horizonDays: 14 },
  anomaly:    { metricType: 'inventory', timeWindowHours: 24 },
  ranking:    {
    bloodGroup: 'O+',
    urgency: 'high',
    unitsNeeded: 2,
    maxDistanceKm: 50,
    latitude: '',
    longitude: '',
    useOptimizationValidation: false
  },
  simulation: { scenarioType: 'shortage', durationDays: 30, monteCarloRuns: 100 },
  optimize:   {
    mode: 'auto',
    transportCapacity: 12,
    maxDistanceKm: 150,
    timeHorizonDays: 7,
    includeRLSuggestions: true,
    includeGraphConnectivity: true
  },
  synthetic:  {
    dataType: 'donors',
    count: 120,
    seed: 42,
    scenario: 'normal',
    district: 'all',
    includeGeo: true,
    injectToSystem: false
  },
};
