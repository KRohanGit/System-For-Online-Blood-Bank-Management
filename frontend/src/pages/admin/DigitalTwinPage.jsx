import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as mlAPI from '../../services/mlAPI';
import '../../styles/admin.css';

const DIGITAL_TWIN_PAGE_TITLE = 'Digital Twin Decision Support';

function Card({ title, children, right }) {
  return (
    <section style={{ background: 'rgba(15,23,42,0.55)', border: '1px solid rgba(148,163,184,0.3)', borderRadius: 12, padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h3 style={{ margin: 0, color: '#f8fafc', fontSize: 16 }}>{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

function AnimatedMetric({ label, value, accent = '#bfdbfe', suffix = '' }) {
  const [display, setDisplay] = useState(Number(value) || 0);
  const [flash, setFlash] = useState(false);
  const prevValueRef = useRef(Number(value) || 0);

  useEffect(() => {
    const target = Number(value) || 0;
    const start = Number(prevValueRef.current) || 0;
    const durationMs = 450;
    const startAt = performance.now();
    let raf;

    const tick = (now) => {
      const t = Math.min(1, (now - startAt) / durationMs);
      const next = start + (target - start) * t;
      setDisplay(next);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      }
    };

    setFlash(true);
    const flashTimer = setTimeout(() => setFlash(false), 500);
    raf = requestAnimationFrame(tick);
    prevValueRef.current = target;
    return () => {
      if (raf) cancelAnimationFrame(raf);
      clearTimeout(flashTimer);
    };
  }, [value]);

  const formatted = Number.isFinite(Number(display))
    ? `${Number(display).toFixed(Number(display) >= 100 ? 0 : 1)}${suffix}`
    : `${value}${suffix}`;

  return (
    <div style={{ background: flash ? 'rgba(56,189,248,0.18)' : 'rgba(30,41,59,0.6)', border: '1px solid rgba(100,116,139,0.4)', borderRadius: 10, padding: 10, transition: 'background 220ms ease' }}>
      <div style={{ color: '#94a3b8', fontSize: 12 }}>{label}</div>
      <div style={{ color: accent, fontSize: 20, fontWeight: 700 }}>{formatted}</div>
    </div>
  );
}

function Metric({ label, value, accent = '#bfdbfe' }) {
  return (
    <div style={{ background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(100,116,139,0.4)', borderRadius: 10, padding: 10 }}>
      <div style={{ color: '#94a3b8', fontSize: 12 }}>{label}</div>
      <div style={{ color: accent, fontSize: 20, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function SliderControl({ label, min, max, step = 1, value, onChange, suffix = '' }) {
  return (
    <label style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1', fontSize: 13 }}>
        <span>{label}</span>
        <strong>{value}{suffix}</strong>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        style={{ width: '100%' }}
      />
    </label>
  );
}

function NetworkTwinGraph({ data }) {
  const edges = useMemo(() => data?.edges || [], [data]);

  const prettifyHospitalName = (raw, index) => {
    const value = String(raw || '').trim();
    if (!value) return 'Unknown Hospital';
    if (/^[0-9a-f]{24}$/i.test(value)) return `Hospital ID ${String(value).slice(-6)}`;
    if (/^\d+$/.test(value)) return `Hospital ID ${value}`;
    if (value.length > 22) return `${value.slice(0, 20)}...`;
    return value;
  };

  const layoutNodes = useMemo(() => {
    const nodes = data?.nodes || [];
    if (!nodes.length) return [];
    const cx = 300;
    const cy = 155;
    const radius = Math.max(70, Math.min(120, 140 - nodes.length * 3));
    return nodes.map((node, index) => {
      const angle = (Math.PI * 2 * index) / nodes.length - Math.PI / 2;
      return {
        ...node,
        displayLabel: prettifyHospitalName(node.label || node.id, index),
        totalUnits: Number(node.totalUnits || 0),
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      };
    });
  }, [data]);

  const sortedNodes = useMemo(
    () => {
      const statusOrder = { shortage: 0, risk: 1, stable: 2 };
      return layoutNodes
        .slice()
        .sort((a, b) => (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99) || a.totalUnits - b.totalUnits);
    },
    [layoutNodes]
  );

  const nodeMap = useMemo(() => {
    const map = {};
    layoutNodes.forEach((n) => {
      map[n.id] = n;
    });
    return map;
  }, [layoutNodes]);

  const colorForStatus = (status) => {
    if (status === 'shortage') return '#ef4444';
    if (status === 'risk') return '#f59e0b';
    return '#10b981';
  };

  if (!layoutNodes.length) {
    return <div style={{ color: '#94a3b8' }}>No network data available yet.</div>;
  }

  return (
    <div style={{ background: 'rgba(15,23,42,0.45)', border: '1px solid rgba(148,163,184,0.25)', borderRadius: 12, padding: 10 }}>
      <svg viewBox="0 0 600 320" style={{ width: '100%', height: 'auto' }}>
        {edges.map((edge, idx) => {
          const source = nodeMap[edge.source];
          const target = nodeMap[edge.target];
          if (!source || !target) return null;
          return (
            <g key={`edge-${idx}`}>
              <line x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke="rgba(148,163,184,0.7)" strokeWidth={Math.max(1, Number(edge.units || 1) / 12)} />
              <text x={(source.x + target.x) / 2} y={(source.y + target.y) / 2 - 4} fill="#cbd5e1" fontSize="10" textAnchor="middle">
                {edge.bloodGroup}:{edge.units}
              </text>
            </g>
          );
        })}

        {layoutNodes.map((node) => (
          <g key={node.id}>
            <circle cx={node.x} cy={node.y} r={node.critical ? 16 : 13} fill={colorForStatus(node.status)} stroke={node.critical ? '#f8fafc' : 'rgba(15,23,42,0.8)'} strokeWidth={node.critical ? 3 : 2}>
              {node.critical && (
                <animate attributeName="r" values="14;17;14" dur="1.4s" repeatCount="indefinite" />
              )}
            </circle>
            <text x={node.x} y={node.y + 30} fill="#e2e8f0" fontSize="10" textAnchor="middle">
              {node.displayLabel}
            </text>
            <text x={node.x} y={node.y + 43} fill="#93c5fd" fontSize="9" textAnchor="middle">
              {node.totalUnits} units
            </text>
          </g>
        ))}
      </svg>

      <div style={{ marginTop: 8, color: '#cbd5e1', fontSize: 12 }}>
        <strong>Suggested transfer routes</strong>
        {edges.length ? (
          <div style={{ marginTop: 6, display: 'grid', gap: 6 }}>
            {edges.map((edge, idx) => (
              <div key={`route-${idx}`} style={{ background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(100,116,139,0.35)', borderRadius: 8, padding: '6px 8px' }}>
                {prettifyHospitalName(edge.source, idx)} to {prettifyHospitalName(edge.target, idx)} | {edge.bloodGroup} | {Number(edge.units || 0)} units
              </div>
            ))}
          </div>
        ) : (
          <div style={{ marginTop: 6, color: '#94a3b8' }}>No transfer route is recommended for this run.</div>
        )}
      </div>

      <div style={{ marginTop: 10, color: '#cbd5e1', fontSize: 12 }}>
        <strong>Hospital status snapshot</strong>
        <div style={{ marginTop: 6, display: 'grid', gap: 6 }}>
          {sortedNodes.map((node, idx) => (
            <div key={`node-snap-${node.id}-${idx}`} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, alignItems: 'center', background: 'rgba(30,41,59,0.55)', border: '1px solid rgba(100,116,139,0.3)', borderRadius: 8, padding: '6px 8px' }}>
              <span>{node.displayLabel}</span>
              <span style={{ color: node.status === 'shortage' ? '#ef4444' : node.status === 'risk' ? '#f59e0b' : '#10b981', fontWeight: 700, textTransform: 'uppercase', fontSize: 11 }}>{node.status}</span>
              <span style={{ color: '#bfdbfe', fontWeight: 600 }}>{node.totalUnits} units</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8, fontSize: 12, color: '#cbd5e1' }}>
        <span><span style={{ color: '#ef4444' }}>●</span> Shortage</span>
        <span><span style={{ color: '#f59e0b' }}>●</span> Risk</span>
        <span><span style={{ color: '#10b981' }}>●</span> Stable</span>
        <span><span style={{ color: '#f8fafc' }}>◌</span> Critical Node</span>
      </div>
    </div>
  );
}

function DigitalTwinPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);
  const [statusData, setStatusData] = useState(null);

  const [simForm, setSimForm] = useState({
    scenario: 'baseline',
    durationDays: 5,
    monteCarloRuns: 250,
    donorTurnoutPct: 65,
    emergencyDemandSurgePct: 20,
    transportDelayHours: 3,
    inventoryDecayRatePct: 2,
  });

  const liveTimer = useRef(null);

  useEffect(() => {
    document.title = `${DIGITAL_TWIN_PAGE_TITLE} | JeevaRaksha`;
    loadStatus();
    return () => {
      if (liveTimer.current) clearTimeout(liveTimer.current);
    };
  }, []);

  const loadStatus = async () => {
    try {
      const resp = await mlAPI.digitalTwinStatus();
      setStatusData(resp.data || null);
      return resp.data;
    } catch {
      setStatusData(null);
      return null;
    }
  };

  const buildParameters = useCallback(() => ({
    donor_turnout_pct: Number(simForm.donorTurnoutPct),
    emergency_demand_surge_pct: Number(simForm.emergencyDemandSurgePct),
    transport_delay_hours: Number(simForm.transportDelayHours),
    inventory_decay_rate_pct: Number(simForm.inventoryDecayRatePct),
  }), [
    simForm.donorTurnoutPct,
    simForm.emergencyDemandSurgePct,
    simForm.transportDelayHours,
    simForm.inventoryDecayRatePct,
  ]);

  const runSimulation = useCallback(async (silent = false) => {
    setLoading(true);
    if (!silent) setError('');
    try {
      const resp = await mlAPI.digitalTwinSimulate(
        simForm.scenario,
        buildParameters(),
        Number(simForm.durationDays),
        Number(simForm.monteCarloRuns)
      );
      setResults(resp.data || null);
    } catch (err) {
      const baseMessage = err.response?.data?.message || err.message || 'Digital Twin simulation failed';
      const friendlyMessage = String(baseMessage).toLowerCase().includes('ml service unavailable')
        ? 'ML service unavailable. Start it with: cd ml-service && python -m uvicorn main:app --host 0.0.0.0 --port 8000'
        : baseMessage;
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  }, [simForm, buildParameters]);

  useEffect(() => {
    if (liveTimer.current) clearTimeout(liveTimer.current);
    liveTimer.current = setTimeout(() => {
      runSimulation(true);
    }, 450);

    return () => {
      if (liveTimer.current) clearTimeout(liveTimer.current);
    };
  }, [runSimulation]);

  const riskStyle = (riskStatus) => {
    const level = String(riskStatus || 'LOW').toUpperCase();
    const map = {
      LOW: { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
      MODERATE: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
      HIGH: { bg: 'rgba(249,115,22,0.15)', color: '#f97316' },
      CRITICAL: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
    };
    return map[level] || map.LOW;
  };

  const decisionOutput = results?.decision_output || {};
  const resilience = decisionOutput.resilienceScore || results?.resilience_assessment || null;
  const strategyRows = decisionOutput.strategyComparison || results?.strategy_comparison || [];
  const actions = decisionOutput.recommendedActions || results?.recommended_actions || [];
  const insights = decisionOutput.keyInsights || results?.key_insights || [];
  const criticalGroups = decisionOutput.criticalBloodGroups || results?.most_critical_blood_groups || [];
  const aiExplanations = decisionOutput.aiExplanation || [];
  const riskTone = riskStyle(decisionOutput.riskStatus);
  const networkData = results?.network_visualization || null;
  const aiConfidence = Number(results?.confidence_score || decisionOutput.confidenceScore || 0);

  return (
    <div className="admin-layout">
      <main className="admin-main">
        <div className="admin-header">
          <div>
            <h1>{DIGITAL_TWIN_PAGE_TITLE}</h1>
            <p>AI assistant for blood supply crisis response with clear, prioritized, administrator-level recommendations.</p>
          </div>
        </div>

        <div style={{ width: '100%', maxWidth: 1180, margin: '0 auto', display: 'grid', gap: 16 }}>
          <Card
            title="Run Simulation"
            right={(
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={runSimulation} disabled={loading}>
                  {loading ? 'Running...' : 'Run Simulation'}
                </button>
                <button className="btn-primary" onClick={loadStatus} disabled={loading}>
                  Refresh Live Data
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#86efac', padding: '0 8px', border: '1px solid rgba(134,239,172,0.35)', borderRadius: 999 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: loading ? '#f59e0b' : '#22c55e', display: 'inline-block', boxShadow: loading ? '0 0 10px rgba(245,158,11,0.9)' : '0 0 10px rgba(34,197,94,0.9)' }} />
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{loading ? 'Live Simulation Running' : 'Live Simulation Ready'}</span>
                </div>
              </div>
            )}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 12 }}>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ color: '#cbd5e1', fontSize: 13 }}>Crisis Context</span>
                <select
                  value={simForm.scenario}
                  onChange={(e) => setSimForm((prev) => ({ ...prev, scenario: e.target.value }))}
                  style={{ padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)', color: 'inherit' }}
                >
                  <option value="baseline">Normal Operations</option>
                  <option value="disaster">Crisis / Disaster Surge</option>
                  <option value="donor_campaign">Donor Campaign Active</option>
                </select>
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ color: '#cbd5e1', fontSize: 13 }}>Simulation Horizon (days)</span>
                <input
                  type="number"
                  min="1"
                  max="14"
                  value={simForm.durationDays}
                  onChange={(e) => setSimForm((prev) => ({ ...prev, durationDays: e.target.value }))}
                  style={{ padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)', color: 'inherit' }}
                />
              </label>
            </div>

            <details style={{ marginBottom: 4 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#e2e8f0' }}>Interactive Simulation Controls</summary>
              <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ color: '#cbd5e1', fontSize: 13 }}>Monte Carlo Runs</span>
                  <input
                    type="number"
                    min="20"
                    max="2000"
                    value={simForm.monteCarloRuns}
                    onChange={(e) => setSimForm((prev) => ({ ...prev, monteCarloRuns: e.target.value }))}
                    style={{ padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)', color: 'inherit' }}
                  />
                </label>
                <SliderControl
                  label="Donor Turnout"
                  min={0}
                  max={100}
                  value={simForm.donorTurnoutPct}
                  onChange={(e) => setSimForm((prev) => ({ ...prev, donorTurnoutPct: Number(e.target.value) }))}
                  suffix="%"
                />
                <SliderControl
                  label="Emergency Demand Surge"
                  min={0}
                  max={200}
                  value={simForm.emergencyDemandSurgePct}
                  onChange={(e) => setSimForm((prev) => ({ ...prev, emergencyDemandSurgePct: Number(e.target.value) }))}
                  suffix="%"
                />
                <SliderControl
                  label="Transport Delay"
                  min={0}
                  max={48}
                  value={simForm.transportDelayHours}
                  onChange={(e) => setSimForm((prev) => ({ ...prev, transportDelayHours: Number(e.target.value) }))}
                  suffix=" hrs"
                />
                <SliderControl
                  label="Inventory Decay Rate"
                  min={0}
                  max={20}
                  step={0.5}
                  value={simForm.inventoryDecayRatePct}
                  onChange={(e) => setSimForm((prev) => ({ ...prev, inventoryDecayRatePct: Number(e.target.value) }))}
                  suffix="%"
                />
              </div>
            </details>
          </Card>

          {statusData && (
            <Card title="Live Twin Status">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
                <Metric label="Network Status" value={statusData.status || 'active'} accent="#bbf7d0" />
                <Metric label="Total Units" value={Number(statusData.total_units || 0)} />
                <Metric label="Hospitals Connected" value={Number(statusData.hospital_count || 0)} />
              </div>
            </Card>
          )}

          {error && (
            <div style={{ marginBottom: 2, padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
              {error}
            </div>
          )}

          {results && (
            <Card title="Decision Support Output">
              <div style={{ marginTop: 4, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <div style={{ background: riskTone.bg, border: '1px solid rgba(100,116,139,0.3)', borderRadius: 10, padding: 10 }}>
                  <div style={{ color: '#94a3b8', fontSize: 12 }}>Risk Status</div>
                  <div style={{ color: riskTone.color, fontSize: 20, fontWeight: 700 }}>{decisionOutput.riskStatus || 'UNKNOWN'}</div>
                  <div style={{ color: '#cbd5e1', marginTop: 4, fontSize: 12 }}>{Number(decisionOutput.stockoutProbability || 0) > 0.5 ? 'Will run out unless action is taken' : 'No immediate stockout expected'}</div>
                </div>
                <Metric label="Time To Shortage" value={decisionOutput.timeToShortage || 'N/A'} accent="#fde68a" />
                <AnimatedMetric label="Stockout Probability" value={(Number(decisionOutput.stockoutProbability || 0) * 100)} suffix="%" accent="#93c5fd" />
                <AnimatedMetric label="Resilience Score" value={Number(resilience?.score || 0)} accent="#86efac" />
              </div>

              <div style={{ marginTop: 14, background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(100,116,139,0.4)', borderRadius: 10, padding: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: '#cbd5e1', fontWeight: 600 }}>AI Confidence Meter</span>
                  <strong style={{ color: '#bfdbfe' }}>{Math.round(aiConfidence * 100)}%</strong>
                </div>
                <div style={{ width: '100%', height: 10, borderRadius: 999, background: 'rgba(148,163,184,0.25)' }}>
                  <div style={{ width: `${Math.max(0, Math.min(100, aiConfidence * 100))}%`, height: '100%', borderRadius: 999, background: 'linear-gradient(90deg,#38bdf8,#22c55e)', transition: 'width 350ms ease' }} />
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <div style={{ color: '#cbd5e1', marginBottom: 8, fontWeight: 600, fontSize: 13 }}>Critical Blood Groups</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {criticalGroups.map((group) => (
                    <span key={group} style={{ padding: '5px 10px', borderRadius: 999, background: 'rgba(239,68,68,0.16)', color: '#fecaca', fontWeight: 600, fontSize: 12 }}>{group}</span>
                  ))}
                </div>
              </div>

              <Card title="Key Insights">
                <ul style={{ margin: 0, paddingLeft: 18, color: '#cbd5e1' }}>
                  {insights.map((insight, idx) => (
                    <li key={`insight-${idx}`} style={{ marginBottom: 6 }}>{insight}</li>
                  ))}
                </ul>
              </Card>

              <Card title="Recommended Actions (Prioritized)">
              <div style={{ display: 'grid', gap: 10 }}>
                {actions
                  .slice()
                  .sort((a, b) => Number(a.priority || 99) - Number(b.priority || 99))
                  .map((item, idx) => (
                    <div key={`action-${idx}`} style={{ padding: 12, borderRadius: 10, background: 'rgba(16,185,129,0.09)', border: '1px solid rgba(110,231,183,0.35)', borderLeft: '4px solid #10b981' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                        <strong>Priority {item.priority}</strong>
                        <span style={{ fontSize: 12, fontWeight: 700, color: item.urgency === 'IMMEDIATE' ? '#ef4444' : item.urgency === 'HIGH' ? '#f59e0b' : '#93c5fd' }}>{item.urgency}</span>
                      </div>
                      <div style={{ marginTop: 4 }}>{item.action}</div>
                      <div style={{ marginTop: 6, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 6, fontSize: 13, color: '#dbeafe' }}>
                        <div><strong>From:</strong> {item.sourceHospital || 'n/a'}</div>
                        <div><strong>To:</strong> {item.destinationHospital || 'n/a'}</div>
                        <div><strong>Units:</strong> {item.unitsToTransfer ?? 'n/a'}</div>
                        <div><strong>ETA:</strong> {item.estimatedDeliveryTime || 'n/a'}</div>
                        <div><strong>Impact:</strong> {item.expectedImpactPct ? `${item.expectedImpactPct}% risk reduction` : (item.impact || 'n/a')}</div>
                        <div><strong>Score:</strong> {item.score ?? 'n/a'}</div>
                      </div>
                    </div>
                  ))}
              </div>
              </Card>

              <Card title="AI Explanation Layer">
                <div style={{ display: 'grid', gap: 8 }}>
                  {aiExplanations.map((exp, idx) => (
                    <div key={`exp-${idx}`} style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(96,165,250,0.3)', borderRadius: 10, padding: 10 }}>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>{exp.action}</div>
                      <div style={{ fontSize: 13, color: '#dbeafe' }}><strong>Why this action:</strong> {exp.why}</div>
                      <div style={{ fontSize: 13, color: '#dbeafe' }}><strong>Based on past {exp.basedOnPastDays} days:</strong> {exp.modelReasoning}</div>
                      <div style={{ fontSize: 13, color: '#dbeafe' }}><strong>Confidence:</strong> {Math.round(Number(exp.confidence || 0) * 100)}%</div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="Network Digital Twin Visualization">
                <NetworkTwinGraph data={networkData} />
              </Card>

              <Card title="Strategy Comparison">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid rgba(255,255,255,0.12)' }}>Strategy</th>
                      <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid rgba(255,255,255,0.12)' }}>Risk Reduction</th>
                      <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid rgba(255,255,255,0.12)' }}>Time Gained</th>
                      <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid rgba(255,255,255,0.12)' }}>Cost Estimate</th>
                      <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid rgba(255,255,255,0.12)' }}>Feasibility</th>
                    </tr>
                  </thead>
                  <tbody>
                    {strategyRows.map((row, idx) => (
                      <tr key={`strategy-${idx}`} style={{ background: row.recommended ? 'rgba(16,185,129,0.12)' : 'transparent' }}>
                        <td style={{ padding: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          {row.strategy}
                          {row.recommended && <span style={{ marginLeft: 8, fontSize: 12, color: '#10b981', fontWeight: 700 }}>BEST</span>}
                        </td>
                        <td style={{ padding: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{row.riskReduction}%</td>
                        <td style={{ padding: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{row.timeGained}</td>
                        <td style={{ padding: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{typeof row.costEstimate === 'number' ? `Rs ${row.costEstimate.toLocaleString()}` : 'n/a'}</td>
                        <td style={{ padding: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{row.feasibilityScore ?? 'n/a'} / 100</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </Card>

              {resilience && (
                <Card title="Resilience Score">
                <div style={{ padding: 12, borderRadius: 10, background: 'rgba(59,130,246,0.08)' }}>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{resilience.score} / 100</div>
                  <div style={{ marginTop: 4, fontWeight: 600 }}>Level: {resilience.level}</div>

                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Why this level</div>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {(resilience.reason || []).map((r, idx) => (
                        <li key={`reason-${idx}`}>{r}</li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Improvements</div>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {(resilience.improvementSuggestions || []).map((s, idx) => (
                        <li key={`suggest-${idx}`}>{s}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                </Card>
              )}
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

export default DigitalTwinPage;
