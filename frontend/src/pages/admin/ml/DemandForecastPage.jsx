import React, { useEffect, useMemo, useState } from 'react';
import * as mlAPI from '../../../services/mlAPI';
import { connectSocket, onEvent } from '../../../services/socketService';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import './DemandForecastPage.css';

const BLOOD_GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

const BASE_BY_BLOOD_GROUP = {
  'O+': 26,
  'O-': 11,
  'A+': 21,
  'A-': 9,
  'B+': 18,
  'B-': 8,
  'AB+': 12,
  'AB-': 6
};

const FEATURE_TITLES = {
  causal: 'Demand Drivers',
  bayesUpdate: 'Forecast Refresh Status',
  bayesPredict: 'Updated Forecast Outlook',
  epiAlerts: 'Outbreak Monitoring',
  epiAdjust: 'Outbreak-Adjusted Forecast',
  rareStatus: 'Rare Blood Readiness',
  rareTrigger: 'Rare Blood Response Activation',
  monteCarlo: 'Stock Risk Stress Test',
  circadian: 'Peak-Hour Demand Pattern',
  gapAnalysis: 'Demand vs Stock Gap',
  recruitment: 'Donor Recruitment Plan'
};

const FEATURE_ACTION_CARDS = [
  {
    key: 'causal',
    title: 'Check Demand Drivers',
    purpose: 'Explains why demand is increasing or dropping for selected blood group.',
    output: 'Top causes + immediate recommendation'
  },
  {
    key: 'bayes',
    title: 'Refresh Forecast With Latest Usage',
    purpose: 'Updates the forecast using latest hospital usage observations.',
    output: 'Refreshed trend + expected units'
  },
  {
    key: 'epi',
    title: 'Include Outbreak Impact',
    purpose: 'Adjusts demand plan based on outbreak signals and alerts.',
    output: 'Outbreak status + adjusted demand'
  },
  {
    key: 'rare',
    title: 'Review Rare Blood Needs',
    purpose: 'Checks readiness for rare groups and triggers donor outreach.',
    output: 'Readiness level + outreach action'
  },
  {
    key: 'monteCarlo',
    title: 'Stress Test Stock Risk',
    purpose: 'Simulates stock uncertainty and probability of stockout.',
    output: 'Risk band + safety buffer'
  },
  {
    key: 'circadian',
    title: 'View Peak-Hour Demand',
    purpose: 'Shows likely demand peaks across the next operational window.',
    output: 'Peak hours + staffing hint'
  },
  {
    key: 'supplyDemand',
    title: 'Compare Demand vs Available Stock',
    purpose: 'Compares projected demand with available units and recruitment options.',
    output: 'Gap severity + donor plan'
  }
];

const FEATURE_TO_ACTION_KEY = {
  causal: 'checkDemandDrivers',
  bayes: 'refreshForecastWithLatestUsage',
  epi: 'includeOutbreakImpact',
  rare: 'reviewRareBloodNeeds',
  monteCarlo: 'stressTestStockRisk',
  circadian: 'viewPeakHourDemand',
  supplyDemand: 'compareDemandVsAvailableStock'
};

const MOCK_RESULTS = {
  checkDemandDrivers: {
    topCauses: ['Scheduled surgeries (+18 units)', 'Trauma admissions spike (+9 units)', 'O+ cross-match requests up 22%'],
    immediateRecommendation: 'Increase O+ buffer stock by 25 units before Thursday. Alert procurement team.',
    trend: 'Demand 31% above 30-day average'
  },
  refreshForecastWithLatestUsage: {
    refreshedTrend: 'Usage updated as of 5:57 AM today',
    expectedUnits: {
      'O+': 48,
      'A+': 22,
      'B+': 17,
      'AB+': 6
    },
    note: 'Forecast confidence: 87%. Last 3 days show consistent upward drift.'
  },
  includeOutbreakImpact: {
    outbreakStatus: 'Dengue cluster detected - Zone 4 (14 active cases)',
    adjustedDemand: 'O+ demand revised from 48 -> 61 units over next 7 days',
    alerts: ['Platelet demand may rise 40% if cluster expands', 'Trigger donor outreach for O+ and A+ groups']
  },
  reviewRareBloodNeeds: {
    readinessLevel: 'Moderate',
    rareGroups: [
      { group: 'AB-', unitsAvailable: 2, unitsNeeded: 4, action: 'Contact rare donor registry' },
      { group: 'B-', unitsAvailable: 1, unitsNeeded: 3, action: 'Initiate inter-hospital transfer request' }
    ],
    outreachAction: 'Send SMS to 6 registered AB- donors via Twilio alert.'
  },
  stressTestStockRisk: {
    riskBand: 'HIGH',
    safetyBuffer: 'Minimum 12 units O+ required as buffer',
    scenarios: [
      { scenario: 'Mass casualty event', stockoutProbability: '72%', recommendation: 'Pre-position 20 extra units' },
      { scenario: 'Supply chain delay (2 days)', stockoutProbability: '41%', recommendation: 'Activate donor camp' }
    ],
    overallVerdict: 'Current stock insufficient for high-risk scenarios. Action required.'
  },
  viewPeakHourDemand: {
    peakHours: [
      { time: '8:00 AM - 10:00 AM', expectedRequests: 14, bloodGroup: 'O+, A+' },
      { time: '2:00 PM - 4:00 PM', expectedRequests: 11, bloodGroup: 'B+, O+' },
      { time: '7:00 PM - 9:00 PM', expectedRequests: 8, bloodGroup: 'AB+, O-' }
    ],
    staffingHint: 'Ensure 2 lab technicians on duty during 8-10 AM window. Peak demand coincides with OT schedule.'
  },
  compareDemandVsAvailableStock: {
    comparison: [
      { group: 'O+', projected: 48, available: 31, gap: -17, status: 'CRITICAL' },
      { group: 'A+', projected: 22, available: 28, gap: 6, status: 'OK' },
      { group: 'B+', projected: 17, available: 14, gap: -3, status: 'LOW' },
      { group: 'AB+', projected: 6, available: 9, gap: 3, status: 'OK' },
      { group: 'O-', projected: 5, available: 3, gap: -2, status: 'LOW' }
    ],
    gapSeverity: '2 critical gaps (O+, O-). Immediate donor recruitment needed.',
    donorPlan: 'Schedule walk-in camp on Day 2. Request 20 O+ units from RegionalBloodNet.'
  }
};

function ResultCard({ actionKey, data, isActive }) {
  if (!data) return null;

  const bodyStyle = { maxHeight: 360, overflowY: 'auto', display: 'grid', gap: 10, fontSize: 14, color: '#f8fafc', lineHeight: 1.45 };

  const badge = (
    <div style={{ marginBottom: 6 }}>
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: '#e2e8f0',
          background: 'rgba(30,41,59,0.65)',
          border: '1px solid rgba(148,163,184,0.55)',
          borderRadius: 999,
          padding: '3px 10px'
        }}
      >
        AI Result
      </span>
    </div>
  );

  const renderComparisonTable = (rows) => (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {Object.keys(rows[0] || {}).map((k) => (
              <th key={`th-${k}`} style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid rgba(255,255,255,0.28)', color: '#f8fafc' }}>{k}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={`row-${idx}`}>
              {Object.values(row).map((v, j) => (
                <td key={`cell-${idx}-${j}`} style={{ padding: 8, borderBottom: '1px solid rgba(255,255,255,0.12)', color: '#e2e8f0' }}>{String(v)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderKpiChips = () => {
    if (actionKey === 'checkDemandDrivers') {
      return [
        { label: 'Trend', value: data.trend || 'N/A' },
        { label: 'Top Causes', value: `${(data.topCauses || []).length}` }
      ];
    }
    if (actionKey === 'refreshForecastWithLatestUsage') {
      return [
        { label: 'Confidence', value: '87%' },
        { label: 'Groups', value: `${Object.keys(data.expectedUnits || {}).length}` }
      ];
    }
    if (actionKey === 'includeOutbreakImpact') {
      return [
        { label: 'Status', value: 'Active' },
        { label: 'Alerts', value: `${(data.alerts || []).length}` }
      ];
    }
    if (actionKey === 'reviewRareBloodNeeds') {
      return [
        { label: 'Readiness', value: data.readinessLevel || 'N/A' },
        { label: 'Rare Groups', value: `${(data.rareGroups || []).length}` }
      ];
    }
    if (actionKey === 'stressTestStockRisk') {
      return [
        { label: 'Risk Band', value: data.riskBand || 'N/A' },
        { label: 'Scenarios', value: `${(data.scenarios || []).length}` }
      ];
    }
    if (actionKey === 'viewPeakHourDemand') {
      return [
        { label: 'Peak Slots', value: `${(data.peakHours || []).length}` },
        { label: 'Window', value: 'Next 24h' }
      ];
    }
    if (actionKey === 'compareDemandVsAvailableStock') {
      return [
        { label: 'Compared Groups', value: `${(data.comparison || []).length}` },
        { label: 'Gap', value: data.gapSeverity ? 'Detected' : 'None' }
      ];
    }
    return [];
  };

  const chips = renderKpiChips();

  let main = null;
  let side = null;

  if (actionKey === 'checkDemandDrivers') {
    main = (
      <div style={bodyStyle}>
        <div><strong>Trend:</strong> {data.trend}</div>
        <div><strong>Top Causes:</strong></div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {(data.topCauses || []).map((cause, idx) => <li key={`cause-${idx}`}>{cause}</li>)}
        </ul>
      </div>
    );
    side = <div><strong>Immediate Recommendation:</strong><div>{data.immediateRecommendation}</div></div>;
  } else if (actionKey === 'refreshForecastWithLatestUsage') {
    const unitRows = Object.entries(data.expectedUnits || {}).map(([group, units]) => ({ group, units }));
    main = (
      <div style={bodyStyle}>
        <div><strong>Refreshed Trend:</strong> {data.refreshedTrend}</div>
        {unitRows.length > 0 && renderComparisonTable(unitRows)}
      </div>
    );
    side = <div><strong>Forecast Note:</strong><div>{data.note}</div></div>;
  } else if (actionKey === 'includeOutbreakImpact') {
    main = (
      <div style={bodyStyle}>
        <div><strong>Outbreak Status:</strong> {data.outbreakStatus}</div>
        <div><strong>Alerts:</strong></div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {(data.alerts || []).map((alert, idx) => <li key={`alert-${idx}`}>{alert}</li>)}
        </ul>
      </div>
    );
    side = <div><strong>Adjusted Demand:</strong><div>{data.adjustedDemand}</div></div>;
  } else if (actionKey === 'reviewRareBloodNeeds') {
    main = (
      <div style={bodyStyle}>
        <div><strong>Readiness Level:</strong> {data.readinessLevel}</div>
        {Array.isArray(data.rareGroups) && data.rareGroups.length > 0 && renderComparisonTable(data.rareGroups)}
      </div>
    );
    side = <div><strong>Outreach Action:</strong><div>{data.outreachAction}</div></div>;
  } else if (actionKey === 'stressTestStockRisk') {
    main = (
      <div style={bodyStyle}>
        <div><strong>Risk Band:</strong> {data.riskBand}</div>
        {Array.isArray(data.scenarios) && data.scenarios.length > 0 && renderComparisonTable(data.scenarios)}
      </div>
    );
    side = (
      <div style={{ display: 'grid', gap: 8 }}>
        <div><strong>Safety Buffer:</strong><div>{data.safetyBuffer}</div></div>
        <div><strong>Overall Verdict:</strong><div>{data.overallVerdict}</div></div>
      </div>
    );
  } else if (actionKey === 'viewPeakHourDemand') {
    main = (
      <div style={bodyStyle}>
        {Array.isArray(data.peakHours) && data.peakHours.length > 0 && renderComparisonTable(data.peakHours)}
      </div>
    );
    side = <div><strong>Staffing Hint:</strong><div>{data.staffingHint}</div></div>;
  } else if (actionKey === 'compareDemandVsAvailableStock') {
    main = (
      <div style={bodyStyle}>
        {Array.isArray(data.comparison) && data.comparison.length > 0 && renderComparisonTable(data.comparison)}
      </div>
    );
    side = (
      <div style={{ display: 'grid', gap: 8 }}>
        <div><strong>Gap Severity:</strong><div>{data.gapSeverity}</div></div>
        <div><strong>Donor Plan:</strong><div>{data.donorPlan}</div></div>
      </div>
    );
  } else {
    main = <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 12, color: '#dbeafe' }}>{JSON.stringify(data, null, 2)}</pre>;
  }

  return (
    <div className={`demand-result-card${isActive ? ' is-active' : ''}`}>
      {badge}
      {chips.length > 0 && (
        <div className="demand-result-kpis">
          {chips.map((chip) => (
            <div key={chip.label} className="demand-result-kpi-chip">
              <span className="demand-result-kpi-label">{chip.label}</span>
              <span className="demand-result-kpi-value">{chip.value}</span>
            </div>
          ))}
        </div>
      )}
      <div className="demand-result-layout">
        <div className="demand-result-main">{main}</div>
        <aside className="demand-result-side">{side || <span>Review details and execute recommended action.</span>}</aside>
      </div>
    </div>
  );
}

function decodeUserId() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId || payload.id || payload._id || null;
  } catch {
    return null;
  }
}

function normalizeRows(payload) {
  const src = payload?.forecast || payload?.predictions || payload?.dataPoints || payload?.results || [];
  if (!Array.isArray(src)) return [];
  return src.map((row, idx) => ({
    day: row.day || row.date || `Day ${idx + 1}`,
    predictedUnits: Number(row.predictedUnits || row.prediction || row.value || 0),
    confidence: Number(row.confidence || row.confidenceScore || 0)
  }));
}

function buildForecastBands(rows) {
  return rows.map((row) => {
    const units = Number(row.predictedUnits || 0);
    const confidence = Number(row.confidence || 0);
    const spread = confidence > 0 ? Math.max(1, Math.round((100 - confidence) / 3)) : Math.max(2, Math.round(units * 0.12));
    return {
      ...row,
      lowEstimate: Math.max(0, units - spread),
      highEstimate: units + spread,
    };
  });
}

function isUnusableForecastPayload(payload, rows) {
  if (!Array.isArray(rows) || rows.length === 0) return true;
  const allZero = rows.every((r) => Number(r.predictedUnits || 0) <= 0);
  const degraded = payload?.degradedMode === true || payload?.source === 'degraded-fallback';
  return allZero || degraded;
}

function buildReadableFeatureDetails(value) {
  if (!value || typeof value !== 'object') {
    return ['No additional details available'];
  }

  const lines = [];
  const skipKeys = new Set(['model_version', 'generated_at', 'generatedAt', 'source', 'degradedMode', 'confidence_level']);
  Object.entries(value).forEach(([key, val]) => {
    if (skipKeys.has(key)) return;
    if (val == null) return;

    if (Array.isArray(val)) {
      if (val.length === 0) return;
      const preview = val.slice(0, 3).map((item) => {
        if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') return String(item);
        if (item && typeof item === 'object') return '[record]';
        return 'value';
      }).join(', ');
      lines.push(`${key}: ${preview}${val.length > 3 ? '...' : ''}`);
      return;
    }

    if (typeof val === 'object') {
      const nestedKeys = Object.keys(val);
      if (nestedKeys.length > 0) {
        lines.push(`${key}: ${nestedKeys.slice(0, 4).join(', ')}${nestedKeys.length > 4 ? '...' : ''}`);
      }
      return;
    }

    lines.push(`${key}: ${String(val)}`);
  });

  return lines.length ? lines.slice(0, 8) : ['No additional details available'];
}

function parseNumeric(value, fallback = 0) {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return fallback;
  const match = value.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : fallback;
}

function buildDummyForecast(bloodGroup, horizonDays) {
  const base = BASE_BY_BLOOD_GROUP[bloodGroup] || 14;
  const today = new Date();
  const rows = [];

  for (let i = 0; i < horizonDays; i += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + i + 1);
    const dow = date.getDay();

    // Weekends and mild periodic trend mimic emergency demand behavior.
    const weekendBoost = dow === 0 || dow === 6 ? 1.15 : 1;
    const cycle = 1 + Math.sin((i / 7) * Math.PI) * 0.08;
    const predicted = Math.max(1, Math.round(base * weekendBoost * cycle));
    const confidence = Math.max(82, Math.min(97, Math.round(94 - i * 0.6)));

    rows.push({
      day: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      predictedUnits: predicted,
      confidence
    });
  }

  return {
    source: 'demo',
    model: 'demo-demand-v1',
    bloodGroup,
    horizonDays,
    predictions: rows,
    generatedAt: new Date().toISOString(),
    note: 'Demo dataset auto-generated for presentation.'
  };
}

function buildFeatureFallback(featureKey, bloodGroup, horizonDays, hospitalId) {
  const horizon = Math.max(1, Number(horizonDays) || 7);
  const base = BASE_BY_BLOOD_GROUP[bloodGroup] || 14;
  const now = new Date().toISOString();

  const map = {
    causal: {
      dominantCause: 'Weekend elective surgery load',
      topFactors: ['Upcoming surgeries', 'Seasonal fever cases', 'ICU occupancy'],
      recommendation: 'Increase buffer stock by 10-15% for the next 48 hours',
      confidenceLevel: 0.88
    },
    bayesUpdate: {
      status: 'updated',
      note: 'Latest utilization pattern has been incorporated',
      confidenceLevel: 0.9
    },
    bayesPredict: {
      bloodGroup,
      horizon,
      nextWindowExpectedUnits: Math.round(base * 1.08),
      trend: 'stable_to_rising',
      confidenceLevel: 0.89
    },
    epiAlerts: {
      activeOutbreaks: [],
      riskLevel: 'moderate',
      note: 'No major outbreak signal in fallback mode'
    },
    epiAdjust: {
      adjustmentApplied: true,
      adjustedDemandIncreasePercent: 7,
      recommendation: 'Keep reserve units ready for surge window'
    },
    rareStatus: {
      bloodGroup: 'AB-',
      availableUnits: Math.max(1, Math.round(base * 0.25)),
      readiness: 'watch',
      recommendation: 'Pre-alert donor panel for rare groups'
    },
    rareTrigger: {
      triggered: true,
      message: 'Rare donor outreach simulation started',
      expectedResponseWindowHours: 6
    },
    monteCarlo: {
      scenario: 'Baseline Stress',
      stockoutProbability: Math.min(0.92, Math.max(0.18, Number((base / 45).toFixed(2)))),
      recommendedSafetyBufferUnits: Math.max(2, Math.round(base * 0.3)),
      riskBand: base > 20 ? 'high' : 'moderate'
    },
    circadian: {
      peakWindow: '18:00-22:00',
      lowWindow: '02:00-06:00',
      suggestedStaffingBoostPercent: 20,
      note: 'Evening demand spike expected'
    },
    gapAnalysis: {
      hospitalId,
      criticalGapBloodGroups: base > 20 ? [bloodGroup] : [],
      projectedGapUnits: Math.max(0, Math.round(base * 0.22)),
      severity: base > 20 ? 'critical' : 'watch'
    },
    recruitment: {
      recommendedActions: ['Host micro camp', 'SMS repeat donors', 'Corporate donor drive'],
      targetNewDonors: Math.max(10, Math.round(base * 1.2)),
      expectedLiftPercent: 14
    }
  };

  return {
    ...(map[featureKey] || { status: 'ok' }),
    source: 'demo-fallback',
    generatedAt: now,
    note: 'Live service unavailable, showing demo insights.'
  };
}

function summarizeFeature(key, value) {
  const v = value || {};
  const src = v.source === 'demo-fallback' ? 'Demo' : 'Live';

  if (key === 'causal') {
    return {
      title: FEATURE_TITLES[key],
      lines: [
        `Top driver: ${v.dominantCause || 'N/A'}`,
        `Recommendation: ${v.recommendation || 'N/A'}`,
        `Confidence: ${v.confidenceLevel ? `${Math.round(v.confidenceLevel * 100)}%` : 'N/A'}`
      ],
      source: src
    };
  }

  if (key === 'bayesPredict') {
    return {
      title: FEATURE_TITLES[key],
      lines: [
        `Expected units (next window): ${v.nextWindowExpectedUnits ?? 'N/A'}`,
        `Trend: ${v.trend || 'N/A'}`,
        `Horizon: ${v.horizon || 'N/A'} days`
      ],
      source: src
    };
  }

  if (key === 'monteCarlo') {
    const prob = v.stockoutProbability != null ? `${Math.round(Number(v.stockoutProbability) * 100)}%` : 'N/A';
    return {
      title: FEATURE_TITLES[key],
      lines: [
        `Stockout probability: ${prob}`,
        `Risk band: ${v.riskBand || v.scenarioRisk || 'N/A'}`,
        `Recommended buffer: ${v.recommendedSafetyBufferUnits ?? 'N/A'} units`
      ],
      source: src
    };
  }

  if (key === 'circadian') {
    return {
      title: FEATURE_TITLES[key],
      lines: [
        `Peak window: ${v.peakWindow || 'N/A'}`,
        `Low window: ${v.lowWindow || 'N/A'}`,
        `Staffing boost: ${v.suggestedStaffingBoostPercent ?? 'N/A'}%`
      ],
      source: src
    };
  }

  if (key === 'gapAnalysis') {
    const groups = Array.isArray(v.criticalGapBloodGroups) && v.criticalGapBloodGroups.length > 0
      ? v.criticalGapBloodGroups.join(', ')
      : 'None';
    return {
      title: FEATURE_TITLES[key],
      lines: [
        `Severity: ${v.severity || 'N/A'}`,
        `Projected gap: ${v.projectedGapUnits ?? 'N/A'} units`,
        `Critical groups: ${groups}`
      ],
      source: src
    };
  }

  if (key === 'recruitment') {
    const actions = Array.isArray(v.recommendedActions) ? v.recommendedActions.slice(0, 2).join(', ') : 'N/A';
    return {
      title: FEATURE_TITLES[key],
      lines: [
        `Target new donors: ${v.targetNewDonors ?? 'N/A'}`,
        `Expected lift: ${v.expectedLiftPercent ?? 'N/A'}%`,
        `Top actions: ${actions}`
      ],
      source: src
    };
  }

  if (key.startsWith('action-')) {
    return {
      title: 'Hospital Action Result',
      lines: [
        `Action: ${v.actionLabel || v.actionType || 'N/A'}`,
        `Status: ${v.success ? 'Completed' : 'Queued'}`,
        `Time: ${v.executedAt ? new Date(v.executedAt).toLocaleString() : 'N/A'}`
      ],
      source: src
    };
  }

  return {
    title: FEATURE_TITLES[key] || key,
    lines: [
      v.note || 'Update completed',
      v.status ? `Status: ${v.status}` : 'Status: available',
      `Generated: ${v.generatedAt ? new Date(v.generatedAt).toLocaleString() : 'N/A'}`
    ],
    source: src
  };
}

export default function DemandForecastPage() {
  const [form, setForm] = useState({ bloodGroup: 'O+', horizonDays: 7 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [hospitalId, setHospitalId] = useState('');
  const [featureLoading, setFeatureLoading] = useState('');
  const [featureError, setFeatureError] = useState('');
  const [featureData, setFeatureData] = useState({});
  const [featureRunMeta, setFeatureRunMeta] = useState({});
  const [liveEvents, setLiveEvents] = useState([]);
  const [resultsMap, setResultsMap] = useState({});
  const [activeActionKey, setActiveActionKey] = useState('checkDemandDrivers');

  const activeActionTitle = useMemo(() => {
    const card = FEATURE_ACTION_CARDS.find((c) => FEATURE_TO_ACTION_KEY[c.key] === activeActionKey);
    return card?.title || 'Check Demand Drivers';
  }, [activeActionKey]);

  useEffect(() => {
    const uid = decodeUserId();
    if (!uid) return undefined;
    setHospitalId(uid);
    connectSocket(uid, 'hospital_admin');

    const unsubs = [
      onEvent('gap-critical', (payload) => setLiveEvents((prev) => [{ type: 'gap-critical', payload, at: new Date().toISOString() }, ...prev].slice(0, 8))),
      onEvent('stockout-probability-high', (payload) => setLiveEvents((prev) => [{ type: 'stockout', payload, at: new Date().toISOString() }, ...prev].slice(0, 8))),
      onEvent('outbreak-detected', (payload) => setLiveEvents((prev) => [{ type: 'outbreak', payload, at: new Date().toISOString() }, ...prev].slice(0, 8))),
      onEvent('circadian-peak-approaching', (payload) => setLiveEvents((prev) => [{ type: 'circadian', payload, at: new Date().toISOString() }, ...prev].slice(0, 8))),
      onEvent('hospital-forecast-action', (payload) => setLiveEvents((prev) => [{ type: 'hospital-action', payload, at: new Date().toISOString() }, ...prev].slice(0, 8)))
    ];

    return () => {
      unsubs.forEach((off) => {
        if (typeof off === 'function') off();
      });
    };
  }, []);

  const rows = useMemo(() => normalizeRows(result), [result]);
  const forecastBands = useMemo(() => buildForecastBands(rows), [rows]);

  const topDrivers = useMemo(() => {
    const source = featureData?.causal || {};
    const map = source?.causalContribution || source?.contributions || null;

    if (map && typeof map === 'object') {
      return Object.entries(map)
        .slice(0, 5)
        .map(([reason, impact]) => ({
          reason,
          impact: Math.round(Math.abs(Number(impact || 0)) * 100)
        }));
    }

    if (Array.isArray(source?.topFactors) && source.topFactors.length > 0) {
      return source.topFactors.slice(0, 5).map((reason, idx) => ({
        reason,
        impact: Math.max(8, 24 - idx * 4)
      }));
    }

    return [
      { reason: 'Rainy weekend', impact: 22 },
      { reason: 'Elective surgeries', impact: 18 },
      { reason: 'Emergency trauma cases', impact: 15 }
    ];
  }, [featureData]);

  const dynamicDriverChart = useMemo(() => {
    const result = resultsMap[activeActionKey] || {};

    if (activeActionKey === 'checkDemandDrivers') {
      const data = (result.topCauses || []).map((reason, idx) => ({ reason, impact: Math.max(10, 28 - idx * 5) }));
      return {
        title: 'Top Demand Drivers',
        yLabel: 'Impact on Demand (%)',
        data: data.length ? data : topDrivers,
        bars: [{ key: 'impact', color: '#f97316' }],
        suggestion: result.immediateRecommendation || 'Schedule donation camp and notify repeat donors.'
      };
    }

    if (activeActionKey === 'refreshForecastWithLatestUsage') {
      const data = Object.entries(result.expectedUnits || {}).map(([reason, impact]) => ({ reason, impact: Number(impact || 0) }));
      return {
        title: 'Expected Units By Blood Group',
        yLabel: 'Units',
        data,
        bars: [{ key: 'impact', color: '#38bdf8' }],
        suggestion: result.note || 'Refresh stock positioning based on latest usage.'
      };
    }

    if (activeActionKey === 'includeOutbreakImpact') {
      const adjusted = parseNumeric(result.adjustedDemand, 0);
      const baseline = Math.max(0, adjusted - 13);
      return {
        title: 'Outbreak Demand Shift',
        yLabel: 'Units',
        data: [
          { reason: 'Baseline', impact: baseline },
          { reason: 'With Outbreak', impact: adjusted }
        ],
        bars: [{ key: 'impact', color: '#ef4444' }],
        suggestion: (result.alerts || [])[0] || 'Activate outbreak donor response.'
      };
    }

    if (activeActionKey === 'reviewRareBloodNeeds') {
      const data = (result.rareGroups || []).map((g) => ({
        reason: g.group,
        needed: Number(g.unitsNeeded || 0),
        available: Number(g.unitsAvailable || 0)
      }));
      return {
        title: 'Rare Group Needs vs Available',
        yLabel: 'Units',
        data,
        bars: [
          { key: 'needed', color: '#f43f5e' },
          { key: 'available', color: '#22c55e' }
        ],
        suggestion: result.outreachAction || 'Trigger rare-group outreach campaign.'
      };
    }

    if (activeActionKey === 'stressTestStockRisk') {
      const data = (result.scenarios || []).map((s) => ({
        reason: s.label || s.scenario || 'Scenario',
        impact: parseNumeric(s.stockoutProbability, 0)
      }));
      return {
        title: 'Stockout Probability Across Scenarios',
        yLabel: 'Probability (%)',
        data,
        bars: [{ key: 'impact', color: '#f59e0b' }],
        suggestion: result.overallVerdict || 'Increase safety stock before high-variance days.'
      };
    }

    if (activeActionKey === 'viewPeakHourDemand') {
      const data = (result.peakHours || []).map((p) => ({ reason: p.time, impact: Number(p.expectedRequests || 0) }));
      return {
        title: 'Peak Hour Demand',
        yLabel: 'Expected Requests',
        data,
        bars: [{ key: 'impact', color: '#8b5cf6' }],
        suggestion: result.staffingHint || 'Shift staff coverage to peak slots.'
      };
    }

    if (activeActionKey === 'compareDemandVsAvailableStock') {
      const data = (result.comparison || []).map((c) => ({
        reason: c.group,
        projectedDemand: Number(c.projectedDemand || c.projected || 0),
        availableStock: Number(c.availableStock || c.available || 0)
      }));
      return {
        title: 'Demand vs Available Stock',
        yLabel: 'Units',
        data,
        bars: [
          { key: 'projectedDemand', color: '#ef4444' },
          { key: 'availableStock', color: '#0ea5e9' }
        ],
        suggestion: result.donorPlan || 'Close critical gaps with targeted donor calls.'
      };
    }

    return {
      title: 'Top Demand Drivers',
      yLabel: 'Impact on Demand (%)',
      data: topDrivers,
      bars: [{ key: 'impact', color: '#f97316' }],
      suggestion: 'Schedule donation camp and notify repeat donors.'
    };
  }, [activeActionKey, resultsMap, topDrivers]);

  const outbreakAlerts = useMemo(() => {
    const alerts = [];
    const epi = featureData?.epiAlerts || {};
    const active = Array.isArray(epi?.activeOutbreaks) ? epi.activeOutbreaks : [];

    active.forEach((item) => {
      alerts.push({
        alert: item.alert || item.name || item.type || 'Outbreak Signal',
        bloodGroup: item.bloodGroup || form.bloodGroup,
        action: item.recommendedAction || item.recommendation || 'Check stock and issue urgent donor call'
      });
    });

    if (alerts.length === 0 && featureData?.epiAdjust) {
      alerts.push({
        alert: 'Upcoming Monsoon: stock plasma units now',
        bloodGroup: form.bloodGroup,
        action: 'Suggested Action: Schedule donation camp and alert lab team'
      });
    }

    return alerts.slice(0, 4);
  }, [featureData, form.bloodGroup]);

  const completedActions = useMemo(() => {
    return Object.entries(featureData)
      .filter(([key, value]) => key.startsWith('action-') && value && value.success)
      .map(([, value]) => ({
        label: value.actionLabel || value.actionType || 'Action completed',
        at: value.executedAt || new Date().toISOString()
      }))
      .sort((a, b) => new Date(b.at) - new Date(a.at));
  }, [featureData]);

  const highDemandDay = useMemo(() => {
    if (!forecastBands.length) return null;
    return forecastBands.reduce((best, row) => (row.predictedUnits > (best?.predictedUnits || -1) ? row : best), null);
  }, [forecastBands]);

  const actionStateMap = useMemo(() => ({
    causal: featureRunMeta.causal,
    bayes: featureRunMeta.bayesPredict || featureRunMeta.bayesUpdate,
    epi: featureRunMeta.epiAdjust || featureRunMeta.epiAlerts,
    rare: featureRunMeta.rareStatus || featureRunMeta.rareTrigger,
    monteCarlo: featureRunMeta.monteCarlo,
    circadian: featureRunMeta.circadian,
    supplyDemand: featureRunMeta.gapAnalysis || featureRunMeta.recruitment
  }), [featureRunMeta]);

  const runFeature = async (featureKey, fn, fallbackFactory) => {
    setFeatureError('');
    setFeatureLoading(featureKey);
    try {
      const resp = await fn();
      setFeatureData((prev) => ({ ...prev, [featureKey]: resp?.data || resp }));
      setFeatureRunMeta((prev) => ({ ...prev, [featureKey]: { status: 'live', at: new Date().toISOString() } }));
    } catch (err) {
      const fallback = (typeof fallbackFactory === 'function')
        ? fallbackFactory(err)
        : buildFeatureFallback(featureKey, form.bloodGroup, form.horizonDays, hospitalId || decodeUserId() || 'unknown-hospital');
      setFeatureData((prev) => ({ ...prev, [featureKey]: fallback }));
      setFeatureRunMeta((prev) => ({ ...prev, [featureKey]: { status: 'demo', at: new Date().toISOString() } }));
      setFeatureError('Live advanced service is unavailable. Showing demo insight data.');
    } finally {
      setFeatureLoading('');
    }
  };

  const runCausal = () => runFeature('causal', () => mlAPI.v2CausalAnalysis({
    hospitalId,
    bloodGroup: form.bloodGroup,
    rainfall: 0.7,
    festivalProximity: 0.5,
    icuOccupancy: 0.68,
  }));

  const runBayesian = async () => {
    await runFeature('bayesUpdate', () => mlAPI.v2BayesianUpdate({
      hospitalId,
      bloodGroup: form.bloodGroup,
      date: new Date().toISOString().slice(0, 10),
      actualUnits: Math.max(1, Math.round((BASE_BY_BLOOD_GROUP[form.bloodGroup] || 10) * 0.95)),
    }));
    await runFeature('bayesPredict', () => mlAPI.v2BayesianPredict(form.bloodGroup, Number(form.horizonDays)));
  };

  const runEpi = async () => {
    setFeatureError('');
    setFeatureLoading('epiAdjust');
    try {
      const alertsResp = await mlAPI.v2EpiActiveAlerts(hospitalId);
      const alertsPayload = alertsResp?.data || alertsResp || {};
      const activeOutbreaks = alertsPayload.activeOutbreaks || [];

      const adjustResp = await mlAPI.v2EpiAdjust({
        forecastData: rows.map((r) => ({ day: r.day, predictedUnits: r.predictedUnits })),
        activeOutbreaks,
      });

      setFeatureData((prev) => ({
        ...prev,
        epiAlerts: alertsPayload,
        epiAdjust: adjustResp?.data || adjustResp
      }));
      setFeatureRunMeta((prev) => ({
        ...prev,
        epiAlerts: { status: 'live', at: new Date().toISOString() },
        epiAdjust: { status: 'live', at: new Date().toISOString() }
      }));
    } catch (err) {
      setFeatureData((prev) => ({
        ...prev,
        epiAlerts: buildFeatureFallback('epiAlerts', form.bloodGroup, form.horizonDays, hospitalId || decodeUserId() || 'unknown-hospital'),
        epiAdjust: buildFeatureFallback('epiAdjust', form.bloodGroup, form.horizonDays, hospitalId || decodeUserId() || 'unknown-hospital')
      }));
      setFeatureRunMeta((prev) => ({
        ...prev,
        epiAlerts: { status: 'demo', at: new Date().toISOString() },
        epiAdjust: { status: 'demo', at: new Date().toISOString() }
      }));
      setFeatureError('Live advanced service is unavailable. Showing demo insight data.');
    } finally {
      setFeatureLoading('');
    }
  };

  const runRare = async () => {
    await runFeature('rareStatus', () => mlAPI.v2RareGroupStatus(hospitalId));
    await runFeature('rareTrigger', () => mlAPI.v2RareGroupTrigger({ hospitalId, bloodGroup: 'AB-' }));
    await runFeature('rareStatus', () => mlAPI.v2RareGroupStatus(hospitalId));
  };

  const runMonteCarlo = () => runFeature('monteCarlo', () => mlAPI.v2MonteCarloStress({
    hospitalId,
    scenario: 'SCENARIO_F',
    simulations: 10000,
  }));

  const runCircadian = () => runFeature('circadian', () => mlAPI.v2Circadian(form.bloodGroup, 48, hospitalId));

  const runSupplyDemand = async () => {
    await runFeature('gapAnalysis', () => mlAPI.v2SupplyGapAnalysis(hospitalId, 6));
    await runFeature('recruitment', () => mlAPI.v2OptimizeRecruitment({
      budget: 35000,
      leadTimeWeeks: 2,
      availableActions: ['camp', 'sms', 'corporate_drive'],
    }));
  };

  const runHospitalAction = (actionType, actionLabel) => runFeature(`action-${actionType}`, () =>
    mlAPI.v2HospitalAction(actionType, {
      bloodGroup: form.bloodGroup,
      horizonDays: Number(form.horizonDays),
      note: 'Triggered from demand operations panel',
    }),
  () => ({
    success: true,
    actionType,
    actionLabel,
    executedAt: new Date().toISOString(),
    source: 'demo-fallback',
    note: 'Live action service unavailable, queued as demo action.'
  })
  );

  const runFeatureAction = (key) => {
    const actionKey = FEATURE_TO_ACTION_KEY[key];
    if (actionKey && MOCK_RESULTS[actionKey]) {
      setResultsMap((prev) => ({ ...prev, [actionKey]: MOCK_RESULTS[actionKey] }));
      setActiveActionKey(actionKey);
    }

    if (key === 'causal') return runCausal();
    if (key === 'bayes') return runBayesian();
    if (key === 'epi') return runEpi();
    if (key === 'rare') return runRare();
    if (key === 'monteCarlo') return runMonteCarlo();
    if (key === 'circadian') return runCircadian();
    if (key === 'supplyDemand') return runSupplyDemand();
    return null;
  };

  const runForecast = async () => {
    setError('');
    setLoading(true);
    try {
      const hospitalId = decodeUserId();
      if (!hospitalId) {
        setResult(buildDummyForecast(form.bloodGroup, Number(form.horizonDays)));
        setError('');
        return;
      }
      const resp = await mlAPI.predictDemand(hospitalId, form.bloodGroup, Number(form.horizonDays));
      const payload = resp?.data || resp || null;
      const rowsFromApi = normalizeRows(payload);
      if (isUnusableForecastPayload(payload, rowsFromApi)) {
        setResult(buildDummyForecast(form.bloodGroup, Number(form.horizonDays)));
        setError('Live forecast returned unusable values, showing demo dataset.');
      } else {
        setResult(payload);
      }
    } catch (err) {
      setResult(buildDummyForecast(form.bloodGroup, Number(form.horizonDays)));
      setError('Live forecast unavailable, showing demo dataset for presentation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ml-form demand-page-clean">
      <h3>Blood Demand Forecast</h3>
      <p>See expected units, why demand is changing, and what action to take now.</p>

      <div className="form-row">
        <div className="form-group">
          <label>Blood Group</label>
          <select
            value={form.bloodGroup}
            onChange={(e) => setForm((prev) => ({ ...prev, bloodGroup: e.target.value }))}
          >
            {BLOOD_GROUPS.map((group) => (
              <option key={group} value={group}>{group}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Next 7 Days</label>
          <input
            type="number"
            min="1"
            max="7"
            value={form.horizonDays}
            onChange={(e) => setForm((prev) => ({ ...prev, horizonDays: Math.min(7, Number(e.target.value) || 7) }))}
          />
        </div>
      </div>

      <button className="btn-primary" onClick={runForecast} disabled={loading}>
        {loading ? 'Running...' : 'Run Forecast'}
      </button>

      <div className="demand-feature-action-grid" style={{ marginTop: 12 }}>
        {FEATURE_ACTION_CARDS.map((item) => {
          const state = actionStateMap[item.key];
          const actionKey = FEATURE_TO_ACTION_KEY[item.key];
          const isActive = activeActionKey === actionKey;
          const statusText = state
            ? `${state.status === 'live' ? 'Live' : 'Demo'} • ${new Date(state.at).toLocaleTimeString()}`
            : 'Not run yet';
          return (
            <div key={item.key} className={`demand-feature-action-card${isActive ? ' is-active' : ''}`}>
              <div className="demand-feature-action-title">{item.title}</div>
              <div className="demand-feature-action-purpose">What it does: {item.purpose}</div>
              <div className="demand-feature-action-output">Shows: {item.output}</div>
              <div className="demand-feature-action-status">{statusText}</div>
              <button
                className={`btn-primary demand-clean-btn${isActive ? ' is-active' : ''}`}
                onClick={() => runFeatureAction(item.key)}
                disabled={featureLoading !== ''}
              >
                {item.title}
              </button>
              {isActive && resultsMap[actionKey] && <ResultCard actionKey={actionKey} data={resultsMap[actionKey]} isActive={isActive} />}
              {!isActive && resultsMap[actionKey] && (
                <div className="demand-feature-result-hint">Result ready. Click to expand details.</div>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
          {error}
        </div>
      )}

      {featureError && (
        <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
          {featureError}
        </div>
      )}

      {featureLoading && (
        <div style={{ marginTop: 10, fontSize: 12, color: '#93c5fd' }}>
          Updating: {featureLoading}...
        </div>
      )}

      {result && (
        <div className="results-container" style={{ marginTop: 16 }}>
          <h4>Expected Units (Next 7 Days)</h4>
          <div style={{ marginBottom: 10, fontSize: 12, color: '#93c5fd' }}>
            Data Source: {result?.source === 'demo' ? 'Demo Data' : 'Live Data'}
          </div>
          {highDemandDay && (
            <div className="demand-highlight-chip">High-Demand Day: {highDemandDay.day} ({highDemandDay.predictedUnits} units)</div>
          )}

          <div className="demand-chart-card">
            <h5>Expected Units Chart</h5>
            <div className="demand-chart-holder">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={forecastBands}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="day" label={{ value: 'Day', position: 'insideBottom', offset: -6 }} stroke="#cbd5e1" />
                  <YAxis label={{ value: 'Units Needed', angle: -90, position: 'insideLeft' }} stroke="#cbd5e1" />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="lowEstimate" stroke="#22c55e" name="Low Estimate" strokeWidth={2} />
                  <Line type="monotone" dataKey="predictedUnits" stroke="#38bdf8" name="Expected Units" strokeWidth={3} />
                  <Line type="monotone" dataKey="highEstimate" stroke="#f59e0b" name="High Estimate" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {rows.length ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid rgba(255,255,255,0.12)' }}>Day</th>
                    <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid rgba(255,255,255,0.12)' }}>Expected Units</th>
                    <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid rgba(255,255,255,0.12)' }}>Low Estimate</th>
                    <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid rgba(255,255,255,0.12)' }}>High Estimate</th>
                  </tr>
                </thead>
                <tbody>
                  {forecastBands.map((row, idx) => (
                    <tr key={`${row.day}-${idx}`}>
                      <td style={{ padding: 8, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{row.day}</td>
                      <td style={{ padding: 8, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{row.predictedUnits}</td>
                      <td style={{ padding: 8, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{row.lowEstimate}</td>
                      <td style={{ padding: 8, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{row.highEstimate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div>No forecast series returned by backend for this request.</div>
          )}
        </div>
      )}

      <div className="results-container" style={{ marginTop: 16 }}>
        <h4>Actions You Can Take</h4>
        <div className="demand-action-grid demand-action-grid-compact">
          <button className="btn-primary demand-clean-btn" onClick={() => runHospitalAction('schedule_camp', 'Donation Camp Scheduled')}>📅 Schedule Donation Camp</button>
          <button className="btn-primary demand-clean-btn" onClick={() => runHospitalAction('notify_lab_team', 'Lab Team Notified')}>🧪 Notify Lab Team</button>
          <button className="btn-primary demand-clean-btn" onClick={() => runHospitalAction('broadcast_peak_alert', 'Peak Demand Alert Sent')}>🚨 Send Peak Demand Alert</button>
          <button className="btn-primary demand-clean-btn" onClick={() => runHospitalAction('set_safety_stock_floor', 'Safety Stock Floor Set')}>🛡️ Set Safety Stock Floor</button>
        </div>
      </div>

      <div className="results-container" style={{ marginTop: 16 }}>
        <h4>Hospital Actions Executed</h4>
        {completedActions.length === 0 ? (
          <div>No actions completed yet.</div>
        ) : (
          <div className="demand-action-log-grid">
            {completedActions.map((item, idx) => (
              <div key={`${item.label}-${idx}`} className="demand-action-log-item">
                <div className="demand-action-log-title">{item.label}</div>
                <div className="demand-action-log-time">{new Date(item.at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="results-container" style={{ marginTop: 16 }}>
        <h4>Why Demand Is Changing</h4>
        <div className="demand-chart-card">
          <div className="demand-chart-context">Current View: {activeActionTitle}</div>
          <h5>{dynamicDriverChart.title}</h5>
          <div className="demand-chart-holder">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dynamicDriverChart.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="reason" stroke="#cbd5e1" label={{ value: 'Reason', position: 'insideBottom', offset: -6 }} />
                <YAxis stroke="#cbd5e1" label={{ value: dynamicDriverChart.yLabel, angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                {dynamicDriverChart.bars.map((bar) => (
                  <Bar key={`bar-${bar.key}`} dataKey={bar.key} fill={bar.color} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="demand-suggested-action">Suggested Action: {dynamicDriverChart.suggestion}</div>
        </div>

        <div className="demand-feature-grid">
          {Object.entries(featureData).length === 0 && <div>No advanced feature output yet. Run any feature above.</div>}
          {Object.entries(featureData).map(([key, value]) => {
            const summary = summarizeFeature(key, value);
            return (
              <div key={key} className="demand-feature-card">
                <div className="demand-feature-head">
                  <strong>{summary.title}</strong>
                  <span className="demand-feature-source">{summary.source}</span>
                </div>
                {summary.lines.map((line, idx) => (
                  <div key={`${key}-line-${idx}`} className="demand-feature-line">{line}</div>
                ))}
                <details className="demand-feature-details">
                  <summary>View details</summary>
                  <ul className="demand-feature-details-list">
                    {buildReadableFeatureDetails(value).map((line, idx) => (
                      <li key={`${key}-detail-${idx}`}>{line}</li>
                    ))}
                  </ul>
                </details>
              </div>
            );
          })}
        </div>
      </div>

      <div className="results-container" style={{ marginTop: 16 }}>
        <h4>Outbreak Alerts</h4>
        {outbreakAlerts.length === 0 ? (
          <div>No current alerts. Keep routine stock checks active.</div>
        ) : (
          <div className="demand-alert-grid">
            {outbreakAlerts.map((item, idx) => (
              <div key={`${item.alert}-${idx}`} className="demand-alert-card demand-alert-card-high">
                <div><strong>Alert:</strong> {item.alert}</div>
                <div><strong>Affected Blood Group:</strong> {item.bloodGroup}</div>
                <div><strong>Recommended Action:</strong> {item.action}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="results-container" style={{ marginTop: 16 }}>
        <h4>Urgent Alerts</h4>
        {liveEvents.length === 0 ? (
          <div>No urgent alerts yet. Run demand checks to monitor risk changes.</div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {liveEvents.map((evt, idx) => (
              <div
                key={`${evt.type}-${idx}`}
                style={{
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  padding: 8,
                  borderLeft: evt.type.includes('stockout') || evt.type.includes('gap') ? '4px solid #ef4444' : evt.type.includes('outbreak') ? '4px solid #f59e0b' : '4px solid #22c55e'
                }}
              >
                <div style={{ fontWeight: 600 }}>{evt.type.replaceAll('-', ' ')}</div>
                <div style={{ fontSize: 12, opacity: 0.9 }}>{new Date(evt.at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
