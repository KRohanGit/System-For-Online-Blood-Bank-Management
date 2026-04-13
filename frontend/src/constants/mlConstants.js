export const BLOOD_GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

export const ML_NAV_ITEMS = [
  { id: 'demand',     icon: '📈', label: 'Demand Forecast',      desc: 'Blood demand projection',                    color: '#0ea5a4' },
  { id: 'wastage',    icon: '⚠️', label: 'Wastage Risk',         desc: 'Expiry and spoilage prevention',             color: '#f59e0b' },
  { id: 'anomaly',    icon: '🔍', label: 'Anomaly Detection',    desc: 'Outlier and drift monitoring',               color: '#8b5cf6' },
  { id: 'ranking',    icon: '🏥', label: 'Hospital Decision Support', desc: 'Real-time hospital ranking support',      color: '#06b6d4' },
  { id: 'optimize',   icon: '🔄', label: 'Transfer Optimizer',   desc: 'Best route planning for transfers',          color: '#3b82f6' },
];

export const ML_TAB_ROUTE_PREFIX = '/admin/ml-intelligence';

export const ADVANCED_AI_LINKS = [
  { path: '/admin/digital-twin',      icon: '🔬', label: 'Digital Twin' },
  { path: '/admin/rl-agent',          icon: '🤖', label: 'Allocation Assistant' },
  { path: '/admin/graph-intelligence',icon: '🕸️', label: 'Graph Network' },
];

export const DEFAULT_FORMS = {
  demand:     { bloodGroup: 'O+', horizonDays: 7 },
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
  optimize:   {
    mode: 'auto',
    transportCapacity: 12,
    maxDistanceKm: 150,
    timeHorizonDays: 7,
    includeRLSuggestions: true,
    includeGraphConnectivity: true
  },
};
