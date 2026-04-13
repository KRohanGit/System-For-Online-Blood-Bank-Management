import React, { useState } from 'react';
import * as mlAPI from '../../services/mlAPI';
import '../../styles/admin.css';

const DEMO_HOSPITALS = [
  { id: 'H1', name: 'City Central Hospital', x: 120, y: 90, inventory: 128 },
  { id: 'H2', name: 'Riverside Medical Center', x: 290, y: 70, inventory: 101 },
  { id: 'H3', name: 'Metro Trauma Institute', x: 470, y: 95, inventory: 136 },
  { id: 'H4', name: 'North Valley Hospital', x: 670, y: 90, inventory: 88 },
  { id: 'H5', name: 'East Care Hospital', x: 780, y: 230, inventory: 82 },
  { id: 'H6', name: 'South General Hospital', x: 640, y: 370, inventory: 94 },
  { id: 'H7', name: 'West Community Hospital', x: 430, y: 380, inventory: 74 },
  { id: 'H8', name: 'Lakeside Medical Unit', x: 230, y: 360, inventory: 77 },
  { id: 'H9', name: 'Hilltop Specialty Hospital', x: 90, y: 250, inventory: 63 },
  { id: 'H10', name: 'Regional Coordination Hub', x: 360, y: 230, inventory: 110 },
  { id: 'H11', name: 'Rural Outreach Hospital', x: 840, y: 340, inventory: 41 }
];

const DEMO_CONNECTIONS = [
  { from: 'H1', to: 'H2', capacity: 20 },
  { from: 'H2', to: 'H3', capacity: 22 },
  { from: 'H3', to: 'H4', capacity: 18 },
  { from: 'H4', to: 'H5', capacity: 16 },
  { from: 'H5', to: 'H6', capacity: 15 },
  { from: 'H6', to: 'H7', capacity: 20 },
  { from: 'H7', to: 'H8', capacity: 18 },
  { from: 'H8', to: 'H9', capacity: 14 },
  { from: 'H9', to: 'H1', capacity: 17 },
  { from: 'H2', to: 'H10', capacity: 24 },
  { from: 'H3', to: 'H10', capacity: 26 },
  { from: 'H7', to: 'H10', capacity: 21 },
  { from: 'H8', to: 'H10', capacity: 20 },
  { from: 'H3', to: 'H6', capacity: 13 },
  { from: 'H1', to: 'H8', capacity: 12 },
  { from: 'H5', to: 'H11', capacity: 8 }
];

function buildAdjacency(nodes, edges) {
  const adj = new Map(nodes.map(n => [n.id, new Set()]));
  edges.forEach(e => {
    adj.get(e.from).add(e.to);
    adj.get(e.to).add(e.from);
  });
  return adj;
}

function bfsDistances(start, adjacency) {
  const dist = new Map([[start, 0]]);
  const queue = [start];
  let idx = 0;
  while (idx < queue.length) {
    const node = queue[idx++];
    const d = dist.get(node);
    (adjacency.get(node) || []).forEach(nb => {
      if (!dist.has(nb)) {
        dist.set(nb, d + 1);
        queue.push(nb);
      }
    });
  }
  return dist;
}

function computeDegreeCentrality(nodes, adjacency) {
  const n = nodes.length;
  const out = {};
  nodes.forEach(node => {
    out[node.id] = (adjacency.get(node.id)?.size || 0) / Math.max(1, n - 1);
  });
  return out;
}

function computeClosenessCentrality(nodes, adjacency) {
  const n = nodes.length;
  const out = {};
  nodes.forEach(node => {
    const d = bfsDistances(node.id, adjacency);
    let sum = 0;
    nodes.forEach(other => {
      if (other.id !== node.id) {
        sum += d.get(other.id) ?? n;
      }
    });
    out[node.id] = sum > 0 ? (n - 1) / sum : 0;
  });
  return out;
}

function computeBetweennessCentrality(nodes, adjacency) {
  const cb = Object.fromEntries(nodes.map(n => [n.id, 0]));
  nodes.forEach(source => {
    const s = source.id;
    const stack = [];
    const pred = new Map(nodes.map(n => [n.id, []]));
    const sigma = new Map(nodes.map(n => [n.id, 0]));
    const dist = new Map(nodes.map(n => [n.id, -1]));

    sigma.set(s, 1);
    dist.set(s, 0);

    const queue = [s];
    let qi = 0;
    while (qi < queue.length) {
      const v = queue[qi++];
      stack.push(v);
      (adjacency.get(v) || []).forEach(w => {
        if (dist.get(w) < 0) {
          queue.push(w);
          dist.set(w, dist.get(v) + 1);
        }
        if (dist.get(w) === dist.get(v) + 1) {
          sigma.set(w, sigma.get(w) + sigma.get(v));
          pred.get(w).push(v);
        }
      });
    }

    const delta = new Map(nodes.map(n => [n.id, 0]));
    while (stack.length) {
      const w = stack.pop();
      pred.get(w).forEach(v => {
        const contrib = (sigma.get(v) / Math.max(1e-9, sigma.get(w))) * (1 + delta.get(w));
        delta.set(v, delta.get(v) + contrib);
      });
      if (w !== s) cb[w] += delta.get(w);
    }
  });

  const n = nodes.length;
  const norm = Math.max(1, ((n - 1) * (n - 2)) / 2);
  Object.keys(cb).forEach(k => {
    cb[k] /= norm;
  });
  return cb;
}

function computePageRank(nodes, adjacency, damping = 0.85, iterations = 60) {
  const ids = nodes.map(n => n.id);
  const n = ids.length;
  let pr = Object.fromEntries(ids.map(id => [id, 1 / n]));
  for (let i = 0; i < iterations; i += 1) {
    const next = Object.fromEntries(ids.map(id => [id, (1 - damping) / n]));
    ids.forEach(id => {
      const degree = adjacency.get(id)?.size || 1;
      const share = (damping * pr[id]) / degree;
      (adjacency.get(id) || []).forEach(nb => {
        next[nb] += share;
      });
    });
    pr = next;
  }
  return pr;
}

function connectedComponentsCount(nodes, edges) {
  const adj = buildAdjacency(nodes, edges);
  const seen = new Set();
  let count = 0;
  nodes.forEach(node => {
    if (seen.has(node.id)) return;
    count += 1;
    const q = [node.id];
    seen.add(node.id);
    let idx = 0;
    while (idx < q.length) {
      const v = q[idx++];
      (adj.get(v) || []).forEach(nb => {
        if (!seen.has(nb)) {
          seen.add(nb);
          q.push(nb);
        }
      });
    }
  });
  return count;
}

function computeBridges(nodes, edges) {
  const baseComponents = connectedComponentsCount(nodes, edges);
  return edges.filter((edge, i) => {
    const reduced = edges.filter((_, idx) => idx !== i);
    return connectedComponentsCount(nodes, reduced) > baseComponents;
  });
}

function buildCentralityShowcase(metric = 'all') {
  const nodes = DEMO_HOSPITALS;
  const edges = DEMO_CONNECTIONS;
  const adjacency = buildAdjacency(nodes, edges);

  const degree = computeDegreeCentrality(nodes, adjacency);
  const closeness = computeClosenessCentrality(nodes, adjacency);
  const betweenness = computeBetweennessCentrality(nodes, adjacency);
  const pagerank = computePageRank(nodes, adjacency);

  const bridges = computeBridges(nodes, edges);

  const enriched = nodes.map(node => {
    const degreeCount = adjacency.get(node.id)?.size || 0;
    const composite = degree[node.id] * 0.3 + closeness[node.id] * 0.25 + betweenness[node.id] * 0.25 + pagerank[node.id] * 0.2;
    return {
      ...node,
      degreeCount,
      degreeCentrality: degree[node.id],
      closenessCentrality: closeness[node.id],
      betweennessCentrality: betweenness[node.id],
      pagerank: pagerank[node.id],
      compositeScore: composite
    };
  });

  const sortedByComposite = [...enriched].sort((a, b) => b.compositeScore - a.compositeScore);
  const sortedByBetweenness = [...enriched].sort((a, b) => b.betweennessCentrality - a.betweennessCentrality);
  const sortedByDegree = [...enriched].sort((a, b) => b.degreeCount - a.degreeCount);
  const bottlenecks = sortedByBetweenness.slice(0, 3);

  const density = (2 * edges.length) / (nodes.length * (nodes.length - 1));
  const highestBottleneck = sortedByBetweenness[0]?.id;
  const survivingNodes = nodes.filter(n => n.id !== highestBottleneck);
  const survivingEdges = edges.filter(e => e.from !== highestBottleneck && e.to !== highestBottleneck);
  const largestAfterFailure = (() => {
    const adj = buildAdjacency(survivingNodes, survivingEdges);
    const seen = new Set();
    let largest = 0;
    survivingNodes.forEach(node => {
      if (seen.has(node.id)) return;
      const q = [node.id];
      seen.add(node.id);
      let idx = 0;
      while (idx < q.length) {
        const v = q[idx++];
        (adj.get(v) || []).forEach(nb => {
          if (!seen.has(nb)) {
            seen.add(nb);
            q.push(nb);
          }
        });
      }
      largest = Math.max(largest, q.length);
    });
    return largest;
  })();

  const attackTolerance = largestAfterFailure / Math.max(1, survivingNodes.length);
  const bottleneckPenalty = Math.min(1, (bottlenecks[0]?.betweennessCentrality || 0) * 2.3);
  const resilienceScore = Math.round((density * 0.35 + attackTolerance * 0.4 + (1 - bottleneckPenalty) * 0.25) * 100);

  const resilienceLabel = resilienceScore >= 80 ? 'Strong' : resilienceScore >= 65 ? 'Moderate' : 'Fragile';
  const metricLabel = {
    all: 'Composite',
    degree: 'Degree',
    closeness: 'Closeness',
    betweenness: 'Betweenness',
    pagerank: 'PageRank'
  }[metric] || 'Composite';

  const rankingSource = metric === 'degree'
    ? [...enriched].sort((a, b) => b.degreeCentrality - a.degreeCentrality)
    : metric === 'closeness'
    ? [...enriched].sort((a, b) => b.closenessCentrality - a.closenessCentrality)
    : metric === 'betweenness'
    ? [...enriched].sort((a, b) => b.betweennessCentrality - a.betweennessCentrality)
    : metric === 'pagerank'
    ? [...enriched].sort((a, b) => b.pagerank - a.pagerank)
    : sortedByComposite;

  const staffExplanations = rankingSource.slice(0, 8).map(h => {
    if (h.betweennessCentrality > 0.2) {
      return `${h.name} is a bottleneck node. If it slows down, transfer routes across regions can be delayed.`;
    }
    if (h.degreeCount >= 4) {
      return `${h.name} connects directly to ${h.degreeCount} hospitals and acts as a transfer hub.`;
    }
    if (h.closenessCentrality > 0.5) {
      return `${h.name} can reach most hospitals quickly, useful for urgent redistribution.`;
    }
    return `${h.name} has limited links (${h.degreeCount}); keep buffer stock and backup routing ready.`;
  });

  return {
    generatedAt: new Date().toISOString(),
    metricLabel,
    node_count: nodes.length,
    edge_count: edges.length,
    density,
    resilienceScore,
    resilienceLabel,
    bridges,
    bottlenecks,
    nodes: enriched,
    edges,
    degree_centrality: degree,
    closeness_centrality: closeness,
    betweenness_centrality: betweenness,
    pagerank,
    top_hospitals: rankingSource.slice(0, 8),
    insights: [
      `${sortedByDegree[0]?.name} is the most connected hub (${sortedByDegree[0]?.degreeCount} links).`,
      `${sortedByBetweenness[0]?.name} is the highest bottleneck and should have backup routes.`,
      bridges.length
        ? `${bridges.length} fragile transfer route(s) detected, including ${bridges[0].from}-${bridges[0].to}.`
        : 'No single-edge failure disconnects the network, indicating healthy route redundancy.'
    ],
    staffExplanations,
    recommendations: [
      'Increase backup inventory at top bottleneck hospitals during peak demand windows.',
      bridges.length ? `Create an alternate transfer path for ${bridges[0].from}-${bridges[0].to}.` : 'Maintain at least two routes for all critical transfer corridors.',
      'Schedule monthly stress-test drills for cross-hospital emergency transfer rerouting.'
    ]
  };
}

function GraphIntelligencePage() {
  const [activeTab, setActiveTab] = useState('centrality');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  const [centralityMetric, setCentralityMetric] = useState('all');
  const [bottleneckThreshold, setBottleneckThreshold] = useState(0.3);

  const formatValue = (value, decimals = 3) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return String(value ?? 'N/A');
    return num.toFixed(decimals);
  };

  const prettifyHospitalName = (raw, index) => {
    const value = String(raw || '').trim();
    if (!value) return 'Unknown Hospital';
    if (/^[0-9a-f]{24}$/i.test(value)) return `Hospital ID ${String(value).slice(-6)}`;
    if (/^\d+$/.test(value)) return `Hospital ID ${value}`;
    if (value.length > 24) return `${value.slice(0, 22)}...`;
    return value;
  };

  const tabs = [
    { id: 'centrality', label: '🎯 Centrality Analysis', desc: 'Hospital network importance' },
    { id: 'bottlenecks', label: '🚧 Bottleneck Detection', desc: 'Find network weak points' },
    { id: 'stability', label: '📊 Stability Index', desc: 'Network health score' }
  ];

  const loadCentrality = async () => {
    setLoading(true);
    setError('');
    setResults(null);
    try {
      await mlAPI.graphCentrality(centralityMetric);
      setResults({ type: 'centrality', data: buildCentralityShowcase(centralityMetric), source: 'live+showcase' });
      setSelectedNodeId(null);
    } catch (err) {
      setResults({ type: 'centrality', data: buildCentralityShowcase(centralityMetric), source: 'showcase-fallback' });
      setError('Live graph endpoint is unavailable right now. Showing review-ready simulation output.');
      setSelectedNodeId(null);
    } finally { setLoading(false); }
  };

  const loadBottlenecks = async () => {
    setLoading(true);
    setError('');
    setResults(null);
    try {
      const resp = await mlAPI.graphBottlenecks(bottleneckThreshold);
      setResults({ type: 'bottlenecks', data: resp.data });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'ML Service unavailable');
    } finally { setLoading(false); }
  };

  const loadStability = async () => {
    setLoading(true);
    setError('');
    setResults(null);
    try {
      const resp = await mlAPI.graphStabilityIndex();
      setResults({ type: 'stability', data: resp.data });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'ML Service unavailable');
    } finally { setLoading(false); }
  };

  const renderCentralityForm = () => (
    <div className="ml-form">
      <h3>Network Centrality Analysis</h3>
      <p>Analyze hospital network using graph theory metrics: degree centrality (connectivity), closeness centrality (accessibility), betweenness centrality (bridging), and PageRank (influence).</p>
      <details style={{ marginBottom: '12px', background: 'rgba(102, 126, 234, 0.08)', border: '1px solid rgba(102, 126, 234, 0.25)', borderRadius: '10px', padding: '10px 12px' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>How to read this result</summary>
        <div style={{ marginTop: '8px', fontSize: '13px', opacity: 0.9 }}>
          Higher centrality means the hospital is more important to network flow. If one such hospital fails, the supply chain is affected more.
        </div>
      </details>
      <div className="form-row">
        <div className="form-group">
          <label>Metric</label>
          <select value={centralityMetric} onChange={e => setCentralityMetric(e.target.value)}>
            <option value="all">All Metrics</option>
            <option value="degree">Degree Centrality</option>
            <option value="closeness">Closeness Centrality</option>
            <option value="betweenness">Betweenness Centrality</option>
            <option value="pagerank">PageRank</option>
          </select>
        </div>
      </div>
      <button className="btn-primary" onClick={loadCentrality} disabled={loading}>
        {loading ? 'Analyzing...' : '🎯 Compute Centrality'}
      </button>
    </div>
  );

  const renderBottleneckForm = () => (
    <div className="ml-form">
      <h3>Bottleneck Detection</h3>
      <p>Identify hospitals that are critical network bottlenecks using betweenness centrality and degree analysis. These are single points of failure in the blood supply chain.</p>
      <details style={{ marginBottom: '12px', background: 'rgba(244, 67, 54, 0.08)', border: '1px solid rgba(244, 67, 54, 0.25)', borderRadius: '10px', padding: '10px 12px' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>What to do with this</summary>
        <div style={{ marginTop: '8px', fontSize: '13px', opacity: 0.9 }}>
          Bottlenecks should get backup routes and stronger inventory buffers first, so one disruption does not affect the whole network.
        </div>
      </details>
      <div className="form-row">
        <div className="form-group">
          <label>Detection Threshold (0-1)</label>
          <input type="number" step={0.05} min={0} max={1} value={bottleneckThreshold}
            onChange={e => setBottleneckThreshold(+e.target.value)} />
        </div>
      </div>
      <button className="btn-primary" onClick={loadBottlenecks} disabled={loading}>
        {loading ? 'Detecting...' : '🚧 Detect Bottlenecks'}
      </button>
    </div>
  );

  const renderStabilityForm = () => (
    <div className="ml-form">
      <h3>Network Stability Index</h3>
      <p>Compute a comprehensive stability score for the hospital network based on density, connectivity, fragmentation, influence distribution, and stock balance.</p>
      <details style={{ marginBottom: '12px', background: 'rgba(76, 175, 80, 0.08)', border: '1px solid rgba(76, 175, 80, 0.25)', borderRadius: '10px', padding: '10px 12px' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>How to interpret the score</summary>
        <div style={{ marginTop: '8px', fontSize: '13px', opacity: 0.9 }}>
          A higher stability score means the network can handle disruptions better with less risk of shortages.
        </div>
      </details>
      <button className="btn-primary" onClick={loadStability} disabled={loading}>
        {loading ? 'Computing...' : '📊 Compute Stability Index'}
      </button>
    </div>
  );

  const renderCentralityResults = () => {
    if (results?.type !== 'centrality') return null;
    const d = results.data;
    const maxPageRank = Math.max(...d.nodes.map(n => n.pagerank));
    const topBottleneckId = d.bottlenecks[0]?.id;
    const selectedNode = d.nodes.find(n => n.id === selectedNodeId) || d.top_hospitals[0];

    const nodeColor = node => {
      if (node.id === topBottleneckId) return '#dc2626';
      if (node.degreeCount >= 4) return '#16a34a';
      return '#2563eb';
    };

    const nodeSize = node => 12 + (node.pagerank / Math.max(0.0001, maxPageRank)) * 16;

    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          <div style={{ padding: '16px', background: 'rgba(102, 126, 234, 0.1)', borderRadius: '12px' }}>
            <div style={{ fontSize: '13px', opacity: 0.7 }}>Nodes</div>
            <div style={{ fontSize: '26px', fontWeight: '700' }}>{d.node_count}</div>
          </div>
          <div style={{ padding: '16px', background: 'rgba(240, 147, 251, 0.1)', borderRadius: '12px' }}>
            <div style={{ fontSize: '13px', opacity: 0.7 }}>Edges</div>
            <div style={{ fontSize: '26px', fontWeight: '700' }}>{d.edge_count}</div>
          </div>
          <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.12)', borderRadius: '12px' }}>
            <div style={{ fontSize: '13px', opacity: 0.7 }}>Resilience Score</div>
            <div style={{ fontSize: '26px', fontWeight: '700' }}>{d.resilienceScore}/100</div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>{d.resilienceLabel} readiness</div>
          </div>
          <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.12)', borderRadius: '12px' }}>
            <div style={{ fontSize: '13px', opacity: 0.7 }}>Top Bottleneck</div>
            <div style={{ fontSize: '18px', fontWeight: '700' }}>{d.bottlenecks[0]?.name || 'N/A'}</div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>Betweenness {formatValue(d.bottlenecks[0]?.betweennessCentrality || 0)}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px', marginBottom: '18px' }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.25)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '14px', padding: '12px' }}>
            <h4 style={{ marginTop: 0 }}>Hospital Transfer Network</h4>
            <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '8px' }}>
              Node color: red = bottleneck, green = highly connected, blue = standard. Node size represents influence (PageRank).
            </div>
            <svg viewBox="0 0 900 460" style={{ width: '100%', height: '420px', background: 'rgba(2, 6, 23, 0.38)', borderRadius: '10px' }}>
              {d.edges.map((e, idx) => {
                const from = d.nodes.find(n => n.id === e.from);
                const to = d.nodes.find(n => n.id === e.to);
                if (!from || !to) return null;
                const isBridge = d.bridges.some(b => (b.from === e.from && b.to === e.to) || (b.from === e.to && b.to === e.from));
                return (
                  <line
                    key={`${e.from}-${e.to}-${idx}`}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke={isBridge ? '#f97316' : 'rgba(148,163,184,0.8)'}
                    strokeWidth={isBridge ? 3.3 : 1.4 + e.capacity / 12}
                    strokeDasharray={isBridge ? '5 4' : 'none'}
                    opacity={0.9}
                  />
                );
              })}
              {d.nodes.map(node => (
                <g
                  key={node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={nodeSize(node)}
                    fill={nodeColor(node)}
                    stroke={selectedNode?.id === node.id ? '#f8fafc' : 'rgba(255,255,255,0.25)'}
                    strokeWidth={selectedNode?.id === node.id ? 3 : 1.5}
                  />
                  <text x={node.x} y={node.y + 4} textAnchor="middle" fontSize="11" fill="#fff" fontWeight="700">{node.id}</text>
                </g>
              ))}
            </svg>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.25)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '14px', padding: '12px' }}>
            <h4 style={{ marginTop: 0 }}>Selected Hospital</h4>
            {selectedNode ? (
              <>
                <div style={{ fontWeight: 700, marginBottom: '4px' }}>{selectedNode.name}</div>
                <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '8px' }}>{selectedNode.id}</div>
                <div style={{ fontSize: '13px', marginBottom: '4px' }}>Degree: <strong>{selectedNode.degreeCount}</strong> direct connections</div>
                <div style={{ fontSize: '13px', marginBottom: '4px' }}>Closeness: <strong>{formatValue(selectedNode.closenessCentrality)}</strong></div>
                <div style={{ fontSize: '13px', marginBottom: '4px' }}>Betweenness: <strong>{formatValue(selectedNode.betweennessCentrality)}</strong></div>
                <div style={{ fontSize: '13px', marginBottom: '8px' }}>PageRank: <strong>{formatValue(selectedNode.pagerank)}</strong></div>
                <div style={{ fontSize: '12px', background: 'rgba(59,130,246,0.12)', borderRadius: '8px', padding: '8px 10px' }}>
                  {selectedNode.betweennessCentrality > 0.2
                    ? `${selectedNode.name} is a bottleneck. Prepare alternate routes if this site is overloaded.`
                    : selectedNode.degreeCount >= 4
                    ? `${selectedNode.name} is a major hub and should lead emergency redistribution.`
                    : `${selectedNode.name} has limited links. Keep safety stock for sudden delays.`}
                </div>
              </>
            ) : (
              <div style={{ opacity: 0.8 }}>Click any node in the graph to inspect hospital-level details.</div>
            )}
          </div>
        </div>

        <div style={{ marginBottom: '18px' }}>
          <h4>Top Hospitals by {d.metricLabel}</h4>
          <div style={{ maxHeight: '280px', overflow: 'auto' }}>
            {d.top_hospitals.map((h, i) => (
              <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', marginBottom: '8px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #16a34a, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px' }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600' }}>{h.name || prettifyHospitalName(h.hospital_id, i)}</div>
                  <div style={{ fontSize: '12px', opacity: 0.72 }}>{d.staffExplanations[i]}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '700', color: '#38bdf8' }}>{formatValue(h.compositeScore)}</div>
                  <div style={{ fontSize: '12px', opacity: 0.6 }}>{h.inventory} units</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '14px' }}>
            <h4 style={{ marginTop: 0 }}>Network Insights</h4>
            {d.insights.map((insight, idx) => (
              <div key={idx} style={{ padding: '9px 10px', borderLeft: '3px solid #3b82f6', background: 'rgba(30,64,175,0.12)', marginBottom: '8px', borderRadius: '8px' }}>
                {insight}
              </div>
            ))}
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '14px' }}>
            <h4 style={{ marginTop: 0 }}>Action Recommendations</h4>
            {d.recommendations.map((r, idx) => (
              <div key={idx} style={{ padding: '9px 10px', borderLeft: '3px solid #22c55e', background: 'rgba(34,197,94,0.12)', marginBottom: '8px', borderRadius: '8px' }}>
                {r}
              </div>
            ))}
          </div>
        </div>

        {['degree_centrality', 'closeness_centrality', 'betweenness_centrality', 'pagerank'].map(metricKey => {
          if (!d[metricKey]) return null;
          const entries = Object.entries(d[metricKey]).sort((a, b) => b[1] - a[1]).slice(0, 7);
          const maxVal = Math.max(...entries.map(e => e[1]), 0.001);
          return (
            <div key={metricKey} style={{ marginTop: '18px' }}>
              <h4 style={{ textTransform: 'capitalize' }}>{metricKey.replace(/_/g, ' ')}</h4>
              {entries.map(([id, val]) => {
                const hospital = d.nodes.find(n => n.id === id);
                return (
                  <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ width: '180px', fontSize: '12px', opacity: 0.8 }}>{hospital?.name || id}</span>
                    <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.07)', borderRadius: '4px' }}>
                      <div style={{ width: `${(val / maxVal) * 100}%`, height: '100%', borderRadius: '4px', background: 'linear-gradient(90deg, #22c55e, #3b82f6)' }}></div>
                    </div>
                    <span style={{ width: '62px', textAlign: 'right', fontWeight: 700, fontSize: '12px' }}>{formatValue(val)}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  const renderBottleneckResults = () => {
    if (results?.type !== 'bottlenecks') return null;
    const d = results.data;
    return (
      <div>
        <div style={{ padding: '16px', background: d.bottleneck_count > 0 ? 'rgba(244, 67, 54, 0.08)' : 'rgba(76, 175, 80, 0.08)', borderRadius: '12px', marginBottom: '20px' }}>
          <span style={{ fontSize: '20px', fontWeight: '700' }}>{d.bottleneck_count}</span>
          <span style={{ marginLeft: '8px', opacity: 0.7 }}>bottleneck{d.bottleneck_count !== 1 ? 's' : ''} detected</span>
        </div>

        {d.bottlenecks?.map((b, i) => (
          <div key={i} style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', marginBottom: '12px', borderLeft: '3px solid #f44336' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: '700', fontSize: '16px' }}>{b.name || prettifyHospitalName(b.hospital_id, i)}</div>
                <div style={{ fontSize: '12px', opacity: 0.6 }}>{prettifyHospitalName(b.hospital_id, i)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px' }}>Betweenness: <strong>{formatValue(b.betweenness)}</strong></div>
                <div style={{ fontSize: '13px' }}>Degree: <strong>{formatValue(b.degree)}</strong></div>
                <div style={{ fontSize: '13px' }}>Stock: <strong>{b.total_stock}</strong></div>
              </div>
            </div>
            {b.risk_factors && (
              <div style={{ marginTop: '10px' }}>
                {b.risk_factors.map((rf, j) => (
                  <span key={j} style={{ display: 'inline-block', padding: '4px 10px', background: 'rgba(244, 67, 54, 0.1)', borderRadius: '6px', fontSize: '12px', marginRight: '6px', marginTop: '4px' }}>
                    ⚠️ {rf}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}

        {d.recommendations && (
          <div style={{ marginTop: '16px' }}>
            <h4>Recommendations</h4>
            {d.recommendations.map((r, i) => (
              <div key={i} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginBottom: '6px' }}>
                💡 {r}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderStabilityResults = () => {
    if (results?.type !== 'stability') return null;
    const d = results.data;
    const ratingColors = { stable: '#4caf50', moderate: '#ff9800', unstable: '#f44336' };
    const color = ratingColors[d.rating] || '#667eea';
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '24px' }}>
          <div style={{ width: '130px', height: '130px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `conic-gradient(${color} ${d.stability_index * 360}deg, rgba(255,255,255,0.1) 0deg)`, fontSize: '30px', fontWeight: '700' }}>
            {(d.stability_index * 100).toFixed(1)}%
          </div>
          <div>
            <h3 style={{ margin: 0 }}>Network Stability</h3>
            <span style={{ color, fontWeight: '700', fontSize: '18px', textTransform: 'uppercase' }}>{d.rating}</span>
          </div>
        </div>

        {d.components && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            {Object.entries(d.components).map(([key, val]) => (
              <div key={key} style={{ padding: '16px', background: 'rgba(102, 126, 234, 0.08)', borderRadius: '10px' }}>
                <div style={{ fontSize: '12px', opacity: 0.6, textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</div>
                <div style={{ fontSize: '22px', fontWeight: '700', marginTop: '4px' }}>{(val * 100).toFixed(1)}%</div>
                <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '8px' }}>
                  <div style={{ height: '100%', width: `${val * 100}%`, background: color, borderRadius: '2px' }}></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {d.network_stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', marginTop: '20px' }}>
            <div style={{ padding: '14px', background: 'rgba(48, 207, 208, 0.08)', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', opacity: 0.6 }}>Nodes</div>
              <div style={{ fontSize: '24px', fontWeight: '700' }}>{d.network_stats.nodes}</div>
            </div>
            <div style={{ padding: '14px', background: 'rgba(240, 147, 251, 0.08)', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', opacity: 0.6 }}>Edges</div>
              <div style={{ fontSize: '24px', fontWeight: '700' }}>{d.network_stats.edges}</div>
            </div>
            <div style={{ padding: '14px', background: 'rgba(253, 219, 146, 0.08)', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', opacity: 0.6 }}>Communities</div>
              <div style={{ fontSize: '24px', fontWeight: '700' }}>{d.network_stats.communities}</div>
            </div>
          </div>
        )}

        {d.recommendations && (
          <div style={{ marginTop: '20px' }}>
            <h4>Recommendations</h4>
            {d.recommendations.map((r, i) => (
              <div key={i} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginBottom: '6px' }}>
                💡 {r}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderResults = () => {
    if (!results) return null;
    return (
      <div className="results-container" style={{ marginTop: '24px', padding: '24px', background: 'rgba(102, 126, 234, 0.05)', borderRadius: '16px' }}>
        <h3>Results</h3>
        {renderCentralityResults()}
        {renderBottleneckResults()}
        {renderStabilityResults()}
      </div>
    );
  };

  return (
    <div className="admin-layout">
      <main className="admin-main">
        <div className="admin-header">
          <div>
            <h1>🕸️ Graph Intelligence Network</h1>
            <p>Graph theory-based analysis of hospital blood supply network topology and resilience</p>
          </div>
        </div>

        <div className="ml-tabs" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
          {tabs.map(tab => (
            <button key={tab.id} className={`ml-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(tab.id); setResults(null); setError(''); }}
              style={{ padding: '10px 20px', borderRadius: '10px', border: activeTab === tab.id ? '2px solid #667eea' : '2px solid transparent', background: activeTab === tab.id ? 'rgba(102, 126, 234, 0.15)' : 'rgba(255,255,255,0.05)', cursor: 'pointer', color: 'inherit', fontWeight: activeTab === tab.id ? '600' : '400' }}>
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ padding: '12px 20px', background: 'rgba(244, 67, 54, 0.1)', borderRadius: '10px', marginBottom: '16px', color: '#f44336' }}>
            {error}
          </div>
        )}

        {activeTab === 'centrality' && renderCentralityForm()}
        {activeTab === 'bottlenecks' && renderBottleneckForm()}
        {activeTab === 'stability' && renderStabilityForm()}

        {renderResults()}
      </main>
    </div>
  );
}

export default GraphIntelligencePage;
