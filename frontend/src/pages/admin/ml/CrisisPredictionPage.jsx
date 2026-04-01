import React, { useState } from 'react';
import * as mlAPI from '../../../services/mlAPI';

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

function getCrisisMetrics(payload) {
  return {
    score: Number(payload?.crisisScore || payload?.score || payload?.riskScore || 0),
    level: payload?.level || payload?.riskLevel || payload?.severity || 'unknown',
    factors: payload?.factors || payload?.riskFactors || payload?.contributors || [],
    recommendations: payload?.recommendations || payload?.actions || []
  };
}

export default function CrisisPredictionPage() {
  const [lookaheadHours, setLookaheadHours] = useState(48);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const runPrediction = async () => {
    setError('');
    setLoading(true);
    try {
      const hospitalId = decodeUserId();
      if (!hospitalId) {
        setError('Unable to resolve logged-in hospital identity. Please sign in again.');
        return;
      }

      const resp = await mlAPI.predictCrisis(hospitalId, Number(lookaheadHours));
      setResult(resp?.data || resp || null);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Crisis prediction failed.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const metrics = getCrisisMetrics(result || {});

  return (
    <div className="ml-form">
      <h3>Crisis Prediction</h3>
      <p>Live crisis risk prediction from backend ML service (no simulated local crisis state).</p>

      <div className="form-row">
        <div className="form-group">
          <label>Lookahead Window (hours)</label>
          <input
            type="number"
            min="1"
            max="168"
            value={lookaheadHours}
            onChange={(e) => setLookaheadHours(e.target.value)}
          />
        </div>
      </div>

      <button className="btn-primary" onClick={runPrediction} disabled={loading}>
        {loading ? 'Running...' : 'Run Crisis Prediction'}
      </button>

      {error && (
        <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
          {error}
        </div>
      )}

      {result && !error && (
        <div className="results-container" style={{ marginTop: 16 }}>
          <h4>Prediction Results</h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 12 }}>
            <div style={{ padding: 12, borderRadius: 8, background: 'rgba(59,130,246,0.12)' }}>
              <div style={{ fontSize: 12, opacity: 0.75 }}>Crisis Score</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{metrics.score}</div>
            </div>
            <div style={{ padding: 12, borderRadius: 8, background: 'rgba(245,158,11,0.12)' }}>
              <div style={{ fontSize: 12, opacity: 0.75 }}>Risk Level</div>
              <div style={{ fontSize: 22, fontWeight: 700, textTransform: 'uppercase' }}>{metrics.level}</div>
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Risk Factors</div>
            {Array.isArray(metrics.factors) && metrics.factors.length ? (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {metrics.factors.map((factor, idx) => (
                  <li key={`factor-${idx}`}>{typeof factor === 'string' ? factor : JSON.stringify(factor)}</li>
                ))}
              </ul>
            ) : (
              <div>No explicit factor list returned.</div>
            )}
          </div>

          <div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Recommended Actions</div>
            {Array.isArray(metrics.recommendations) && metrics.recommendations.length ? (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {metrics.recommendations.map((item, idx) => (
                  <li key={`action-${idx}`}>{typeof item === 'string' ? item : JSON.stringify(item)}</li>
                ))}
              </ul>
            ) : (
              <div>No recommendation list returned.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
