import React, { useState } from 'react';
import * as mlAPI from '../../services/mlAPI';
import '../../styles/admin.css';

function GraphIntelligencePage() {
  const [activeTab, setActiveTab] = useState('centrality');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

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
      const resp = await mlAPI.graphCentrality(centralityMetric);
      setResults({ type: 'centrality', data: resp.data });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'ML Service unavailable');
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
    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          <div style={{ padding: '16px', background: 'rgba(102, 126, 234, 0.1)', borderRadius: '12px' }}>
            <div style={{ fontSize: '13px', opacity: 0.7 }}>Nodes</div>
            <div style={{ fontSize: '26px', fontWeight: '700' }}>{d.node_count}</div>
          </div>
          <div style={{ padding: '16px', background: 'rgba(240, 147, 251, 0.1)', borderRadius: '12px' }}>
            <div style={{ fontSize: '13px', opacity: 0.7 }}>Edges</div>
            <div style={{ fontSize: '26px', fontWeight: '700' }}>{d.edge_count}</div>
          </div>
        </div>

        {d.top_hospitals && (
          <div>
            <h4>Top Hospitals by Composite Score</h4>
            <div style={{ maxHeight: '400px', overflow: 'auto' }}>
              {d.top_hospitals.map((h, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', marginBottom: '8px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px' }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600' }}>{h.name || prettifyHospitalName(h.hospital_id, i)}</div>
                    <div style={{ fontSize: '12px', opacity: 0.6 }}>{prettifyHospitalName(h.hospital_id, i)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '700', color: '#667eea' }}>{formatValue(h.composite_score)}</div>
                    <div style={{ fontSize: '12px', opacity: 0.6 }}>{h.total_stock} units</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {['degree_centrality', 'closeness_centrality', 'betweenness_centrality', 'pagerank'].map(metric => {
          if (!d[metric]) return null;
          const entries = Object.entries(d[metric]).sort((a, b) => b[1] - a[1]).slice(0, 8);
          const maxVal = Math.max(...entries.map(e => e[1]), 0.001);
          const hospitalNameMap = new Map((d.top_hospitals || []).map((h, idx) => [h.hospital_id, h.name || prettifyHospitalName(h.hospital_id, idx)]));
          return (
            <div key={metric} style={{ marginTop: '20px' }}>
              <h4 style={{ textTransform: 'capitalize' }}>{metric.replace(/_/g, ' ')}</h4>
              {entries.map(([id, val], idx) => (
                <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', width: '140px', opacity: 0.75 }}>{hospitalNameMap.get(id) || prettifyHospitalName(id, idx)}</span>
                  <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                    <div style={{ height: '100%', width: `${(val / maxVal) * 100}%`, background: 'linear-gradient(90deg, #667eea, #764ba2)', borderRadius: '4px' }}></div>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: '600', width: '60px', textAlign: 'right' }}>{formatValue(val)}</span>
                </div>
              ))}
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
