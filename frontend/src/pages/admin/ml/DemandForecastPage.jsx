import React, { useMemo, useState } from 'react';
import * as mlAPI from '../../../services/mlAPI';

const BLOOD_GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

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

export default function DemandForecastPage() {
  const [form, setForm] = useState({ bloodGroup: 'O+', horizonDays: 7 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const rows = useMemo(() => normalizeRows(result), [result]);

  const runForecast = async () => {
    setError('');
    setLoading(true);
    try {
      const hospitalId = decodeUserId();
      if (!hospitalId) {
        setError('Unable to resolve logged-in hospital identity. Please sign in again.');
        return;
      }
      const resp = await mlAPI.predictDemand(hospitalId, form.bloodGroup, Number(form.horizonDays));
      setResult(resp?.data || resp || null);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Demand forecast failed.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ml-form">
      <h3>Demand Forecast</h3>
      <p>API-backed blood demand forecast with no local mock data.</p>

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
          <label>Forecast Horizon (days)</label>
          <input
            type="number"
            min="1"
            max="30"
            value={form.horizonDays}
            onChange={(e) => setForm((prev) => ({ ...prev, horizonDays: e.target.value }))}
          />
        </div>
      </div>

      <button className="btn-primary" onClick={runForecast} disabled={loading}>
        {loading ? 'Running...' : 'Run Forecast'}
      </button>

      {error && (
        <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
          {error}
        </div>
      )}

      {result && !error && (
        <div className="results-container" style={{ marginTop: 16 }}>
          <h4>Forecast Results</h4>
          {rows.length ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid rgba(255,255,255,0.12)' }}>Day</th>
                    <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid rgba(255,255,255,0.12)' }}>Predicted Units</th>
                    <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid rgba(255,255,255,0.12)' }}>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={`${row.day}-${idx}`}>
                      <td style={{ padding: 8, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{row.day}</td>
                      <td style={{ padding: 8, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{row.predictedUnits}</td>
                      <td style={{ padding: 8, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{row.confidence ? `${row.confidence}%` : 'N/A'}</td>
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
    </div>
  );
}
