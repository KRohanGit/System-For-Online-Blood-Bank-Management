import React, { useState, useEffect } from 'react';
import * as mlAPI from '../../services/mlAPI';
import '../../styles/admin.css';

function RLAgentPage() {
  const [activeTab, setActiveTab] = useState('train');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [policyData, setPolicyData] = useState(null);

  const [trainForm, setTrainForm] = useState({
    episodes: 50,
    algorithm: 'policy_gradient',
    maxHospitals: 10
  });

  const [simForm, setSimForm] = useState({
    strategy: 'optimal',
    durationDays: 30
  });

  useEffect(() => {
    loadPolicy();
  }, []);

  const formatValue = (value, decimals = 2) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return String(value ?? 'N/A');
    if (Math.abs(num) >= 1000) return Math.round(num).toLocaleString();
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

  const loadPolicy = async () => {
    try {
      const resp = await mlAPI.rlAgentPolicy();
      setPolicyData(resp.data);
    } catch { setPolicyData(null); }
  };

  const trainAgent = async () => {
    setLoading(true);
    setError('');
    setResults(null);
    try {
      const resp = await mlAPI.rlAgentTrain(trainForm.episodes, trainForm.algorithm, trainForm.maxHospitals);
      setResults(resp.data);
      loadPolicy();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'ML Service unavailable');
    } finally { setLoading(false); }
  };

  const runSimulation = async () => {
    setLoading(true);
    setError('');
    setResults(null);
    try {
      const resp = await mlAPI.rlAgentSimulate(simForm.strategy, simForm.durationDays);
      setResults(resp.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'ML Service unavailable');
    } finally { setLoading(false); }
  };

  const tabs = [
    { id: 'train', label: '🧠 Train Agent', desc: 'Train RL allocation policy' },
    { id: 'simulate', label: '🎮 Simulate', desc: 'Test allocation strategies' },
    { id: 'policy', label: '📋 Policy Status', desc: 'View trained policy' }
  ];

  const renderTrainForm = () => (
    <div className="ml-form">
      <h3>Train RL Allocation Agent</h3>
      <p>Train a reinforcement learning agent that learns optimal blood unit allocation and transfer policies between hospitals to minimize waste and maximize fulfillment.</p>
      <details style={{ marginBottom: '12px', background: 'rgba(102, 126, 234, 0.08)', border: '1px solid rgba(102, 126, 234, 0.25)', borderRadius: '10px', padding: '10px 12px' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>What this means in simple terms</summary>
        <div style={{ marginTop: '8px', fontSize: '13px', opacity: 0.9 }}>
          The model repeatedly practices supply decisions in simulations. Over time it learns which transfer choices reduce shortages and waste.
        </div>
      </details>
      <div className="form-row">
        <div className="form-group">
          <label>Algorithm</label>
          <select value={trainForm.algorithm} onChange={e => setTrainForm({ ...trainForm, algorithm: e.target.value })}>
            <option value="policy_gradient">Policy Gradient (REINFORCE)</option>
            <option value="q_learning">Q-Learning</option>
          </select>
        </div>
        <div className="form-group">
          <label>Episodes</label>
          <input type="number" min={10} max={500} value={trainForm.episodes}
            onChange={e => setTrainForm({ ...trainForm, episodes: +e.target.value })} />
        </div>
        <div className="form-group">
          <label>Max Hospitals</label>
          <input type="number" min={2} max={50} value={trainForm.maxHospitals}
            onChange={e => setTrainForm({ ...trainForm, maxHospitals: +e.target.value })} />
        </div>
      </div>
      <button className="btn-primary" onClick={trainAgent} disabled={loading}>
        {loading ? 'Training...' : '🧠 Train RL Agent'}
      </button>
    </div>
  );

  const renderSimForm = () => (
    <div className="ml-form">
      <h3>Simulate Allocation Strategy</h3>
      <p>Compare different allocation strategies: optimal (RL-trained), greedy (balance stocks), or random baseline.</p>
      <details style={{ marginBottom: '12px', background: 'rgba(48, 207, 208, 0.08)', border: '1px solid rgba(48, 207, 208, 0.25)', borderRadius: '10px', padding: '10px 12px' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>How to interpret this simulation</summary>
        <div style={{ marginTop: '8px', fontSize: '13px', opacity: 0.9 }}>
          Choose a strategy and duration. The results will show whether that approach keeps stock balanced and reduces emergency transfers.
        </div>
      </details>
      <div className="form-row">
        <div className="form-group">
          <label>Strategy</label>
          <select value={simForm.strategy} onChange={e => setSimForm({ ...simForm, strategy: e.target.value })}>
            <option value="optimal">Optimal (RL Trained)</option>
            <option value="greedy">Greedy (Balance)</option>
            <option value="random">Random (Baseline)</option>
          </select>
        </div>
        <div className="form-group">
          <label>Duration (days)</label>
          <input type="number" min={1} max={365} value={simForm.durationDays}
            onChange={e => setSimForm({ ...simForm, durationDays: +e.target.value })} />
        </div>
      </div>
      <button className="btn-primary" onClick={runSimulation} disabled={loading}>
        {loading ? 'Simulating...' : '🎮 Run Allocation Simulation'}
      </button>
    </div>
  );

  const renderPolicyTab = () => (
    <div className="ml-form">
      <h3>Current Policy Status</h3>
      {policyData ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '20px', background: policyData.trained ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)', borderRadius: '12px' }}>
            <div style={{ fontSize: '14px', opacity: 0.7 }}>Training Status</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: policyData.trained ? '#4caf50' : '#f44336' }}>
              {policyData.trained ? 'Trained' : 'Not Trained'}
            </div>
          </div>
          {policyData.training_episodes > 0 && (
            <div style={{ padding: '20px', background: 'rgba(102, 126, 234, 0.1)', borderRadius: '12px' }}>
              <div style={{ fontSize: '14px', opacity: 0.7 }}>Episodes</div>
              <div style={{ fontSize: '22px', fontWeight: '700' }}>{policyData.training_episodes}</div>
            </div>
          )}
          {policyData.policy_info && (
            <>
              <div style={{ padding: '20px', background: 'rgba(240, 147, 251, 0.1)', borderRadius: '12px' }}>
                <div style={{ fontSize: '14px', opacity: 0.7 }}>Epsilon</div>
                <div style={{ fontSize: '22px', fontWeight: '700' }}>{formatValue(policyData.policy_info.epsilon, 3)}</div>
              </div>
              <div style={{ padding: '20px', background: 'rgba(48, 207, 208, 0.1)', borderRadius: '12px' }}>
                <div style={{ fontSize: '14px', opacity: 0.7 }}>Learning Rate</div>
                <div style={{ fontSize: '22px', fontWeight: '700' }}>{formatValue(policyData.policy_info.learning_rate, 4)}</div>
              </div>
            </>
          )}
        </div>
      ) : (
        <p style={{ opacity: 0.6 }}>No policy loaded. Train the agent first.</p>
      )}
      <button className="btn-primary" onClick={loadPolicy} style={{ marginTop: '16px' }}>
        Refresh Policy
      </button>
    </div>
  );

  const renderRewardChart = () => {
    if (!results?.reward_trend?.length) return null;
    const trend = results.reward_trend;
    const maxR = Math.max(...trend.map(Math.abs), 1);
    const midY = 100;
    return (
      <div style={{ marginTop: '24px' }}>
        <h4>Training Reward Curve</h4>
        <div style={{ position: 'relative', height: '200px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '10px', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, borderTop: '1px dashed rgba(255,255,255,0.1)' }}></div>
          <svg width="100%" height="100%" viewBox={`0 0 ${trend.length} 200`} preserveAspectRatio="none">
            <polyline fill="none" stroke="#667eea" strokeWidth="2"
              points={trend.map((r, i) => `${i},${midY - (r / maxR) * 80}`).join(' ')} />
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', opacity: 0.5, marginTop: '4px' }}>
            <span>Ep 1</span>
            <span>Ep {trend.length}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderMetrics = () => {
    if (!results?.final_metrics) return null;
    const m = results.final_metrics;
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginTop: '16px' }}>
        {Object.entries(m).map(([key, val]) => (
          <div key={key} style={{ padding: '14px', background: 'rgba(102, 126, 234, 0.08)', borderRadius: '10px' }}>
            <div style={{ fontSize: '11px', opacity: 0.6, textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</div>
            <div style={{ fontSize: '20px', fontWeight: '700', marginTop: '4px' }}>
              {typeof val === 'number' ? val.toLocaleString() : String(val)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTransfers = () => {
    if (!results?.transfers?.length) return null;
    return (
      <div style={{ marginTop: '24px' }}>
        <h4>Recommended Transfers ({results.transfer_count} total)</h4>
        <div style={{ maxHeight: '300px', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>Day</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>From</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>To</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Blood Group</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Units</th>
              </tr>
            </thead>
            <tbody>
              {results.transfers.slice(0, 20).map((t, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '8px 10px' }}>{t.day}</td>
                  <td style={{ padding: '8px 10px' }}>{prettifyHospitalName(t.from, i)}</td>
                  <td style={{ padding: '8px 10px' }}>{prettifyHospitalName(t.to, i)}</td>
                  <td style={{ padding: '8px 10px' }}><span style={{ background: 'rgba(240, 147, 251, 0.2)', padding: '2px 8px', borderRadius: '4px' }}>{t.blood_group}</span></td>
                  <td style={{ padding: '8px 10px' }}>{t.units}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderConvergence = () => {
    if (!results?.convergence) return null;
    const c = results.convergence;
    return (
      <div style={{ marginTop: '16px', padding: '16px', background: c.converged ? 'rgba(76, 175, 80, 0.08)' : 'rgba(255, 152, 0, 0.08)', borderRadius: '10px', borderLeft: `3px solid ${c.converged ? '#4caf50' : '#ff9800'}` }}>
        <strong>{c.converged ? '✅ Policy Converged' : '⏳ Training in Progress'}</strong>
        <div style={{ fontSize: '13px', opacity: 0.7, marginTop: '4px' }}>
          Improvement: {formatValue(c.improvement)} | Variance: {formatValue(c.final_variance, 4)} | Trend: {c.trend}
        </div>
      </div>
    );
  };

  const renderResults = () => {
    if (!results) return null;
    return (
      <div className="results-container" style={{ marginTop: '24px', padding: '24px', background: 'rgba(102, 126, 234, 0.05)', borderRadius: '16px' }}>
        <h3>Results</h3>
        {renderConvergence()}
        {renderRewardChart()}
        {renderMetrics()}
        {renderTransfers()}
        {results.daily_metrics && (
          <div style={{ marginTop: '24px' }}>
            <h4>Daily Stock Levels</h4>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '150px' }}>
              {results.daily_metrics.map((d, i) => {
                const maxStock = Math.max(...results.daily_metrics.map(x => x.total_stock), 1);
                return (
                  <div key={i} style={{ flex: 1, height: `${(d.total_stock / maxStock) * 130}px`, background: d.reward >= 0 ? 'linear-gradient(180deg, #4caf50, #2e7d32)' : 'linear-gradient(180deg, #f44336, #c62828)', borderRadius: '2px 2px 0 0', minHeight: '2px' }}></div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="admin-layout">
      <main className="admin-main">
        <div className="admin-header">
          <div>
            <h1>🤖 RL Allocation Agent</h1>
            <p>Reinforcement learning agent for optimal blood unit allocation and inter-hospital transfers</p>
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

        {activeTab === 'train' && renderTrainForm()}
        {activeTab === 'simulate' && renderSimForm()}
        {activeTab === 'policy' && renderPolicyTab()}

        {renderResults()}
      </main>
    </div>
  );
}

export default RLAgentPage;
