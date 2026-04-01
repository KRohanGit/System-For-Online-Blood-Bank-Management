import React, { useMemo, useState } from 'react';
import * as mlAPI from '../../../../services/mlAPI';

const BLOOD_GROUPS = ['', 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

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

function normalizeItems(payload) {
  const candidates = payload?.predictions || payload?.units || payload?.items || payload?.results || [];
  if (!Array.isArray(candidates)) return [];
  return candidates.map((item, index) => ({
    id: item.id || item.unitId || `row-${index}`,
    bloodGroup: item.bloodGroup || item.group || 'N/A',
    riskScore: Number(item.riskScore || item.score || 0),
    riskLevel: item.riskLevel || item.level || 'unknown',
    horizonDays: item.horizonDays || payload?.horizonDays || 'N/A',
    recommendation: item.recommendation || item.action || 'No recommendation provided'
  }));
}

export default function WastageRiskPage() {
  const [form, setForm] = useState({ bloodGroup: '', horizonDays: 14 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const items = useMemo(() => normalizeItems(result), [result]);

  const runPrediction = async () => {
    setError('');
    setLoading(true);
    try {
      const hospitalId = decodeUserId();
      if (!hospitalId) {
        setError('Unable to resolve logged-in hospital identity. Please sign in again.');
        return;
      }

      const resp = await mlAPI.predictWastage(
        hospitalId,
        form.bloodGroup || null,
        Number(form.horizonDays)
      );
      setResult(resp?.data || resp || null);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Wastage prediction failed.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ml-form">
      <h3>Wastage Risk</h3>
      <p>Backend ML-driven wastage prediction. Local mock generators are not used.</p>

      <div className="form-row">
        <div className="form-group">
          <label>Blood Group (optional)</label>
          <select
            value={form.bloodGroup}
            onChange={(e) => setForm((prev) => ({ ...prev, bloodGroup: e.target.value }))}
          >
            {BLOOD_GROUPS.map((group) => (
              <option key={group || 'all'} value={group}>{group || 'All Blood Groups'}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Horizon (days)</label>
          <input
            type="number"
            min="1"
            max="90"
            value={form.horizonDays}
            onChange={(e) => setForm((prev) => ({ ...prev, horizonDays: e.target.value }))}
          />
        </div>
      </div>

      <button className="btn-primary" onClick={runPrediction} disabled={loading}>
        {loading ? 'Running...' : 'Run Wastage Risk Prediction'}
      </button>

      {error && (
        <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
          {error}
        </div>
      )}

      {result && !error && (
        <div className="results-container" style={{ marginTop: 16 }}>
          <h4>Wastage Risk Output</h4>
          {items.length ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid rgba(255,255,255,0.12)' }}>ID</th>
                    <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid rgba(255,255,255,0.12)' }}>Blood Group</th>
                    <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid rgba(255,255,255,0.12)' }}>Risk Score</th>
                    <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid rgba(255,255,255,0.12)' }}>Risk Level</th>
                    <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid rgba(255,255,255,0.12)' }}>Horizon</th>
                    <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid rgba(255,255,255,0.12)' }}>Recommendation</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id}>
                      <td style={{ padding: 8, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{row.id}</td>
                      <td style={{ padding: 8, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{row.bloodGroup}</td>
                      <td style={{ padding: 8, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{row.riskScore}</td>
                      <td style={{ padding: 8, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{row.riskLevel}</td>
                      <td style={{ padding: 8, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{row.horizonDays}</td>
                      <td style={{ padding: 8, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{row.recommendation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div>No structured item list was returned for this request.</div>
          )}
        </div>
      )}
    </div>
  );
}
