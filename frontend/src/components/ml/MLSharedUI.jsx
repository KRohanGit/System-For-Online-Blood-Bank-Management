import React from 'react';

export function Field({ label, children }) {
  return (
    <div className="mli-field">
      <label className="mli-field-label">{label}</label>
      {children}
    </div>
  );
}

export function FieldRow({ children }) {
  return <div className="mli-field-row">{children}</div>;
}

export function RunBtn({ label, onClick, loading, color }) {
  return (
    <button
      className="mli-run-btn"
      onClick={onClick}
      disabled={loading}
      style={color ? { background: `linear-gradient(135deg, ${color}, ${color}cc)` } : {}}
    >
      {loading ? <><span className="mli-spinner" /> Running…</> : label}
    </button>
  );
}

export function StatCard({ label, value, accent }) {
  return (
    <div className="mli-stat-card" style={{ borderTopColor: accent }}>
      <div className="mli-stat-value">{value}</div>
      <div className="mli-stat-label">{label}</div>
    </div>
  );
}

export function StatRow({ children }) {
  return <div className="mli-stat-row">{children}</div>;
}

export function RecommendationList({ items }) {
  if (!items?.length) return null;
  return (
    <div className="mli-recs">
      <div className="mli-recs-title">💡 Recommendations</div>
      {items.map((r, i) => (
        <div key={i} className="mli-rec-item">{r}</div>
      ))}
    </div>
  );
}

export function OkMsg({ children }) {
  return <div className="mli-ok-msg">{children}</div>;
}

export function NoData({ children }) {
  return <div className="mli-no-data">{children}</div>;
}

export function MLTable({ headers, rows }) {
  return (
    <div className="mli-table-wrap">
      <table className="mli-table">
        <thead>
          <tr>{headers.map(h => <th key={h}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => <td key={j}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RiskPill({ severity, color, label }) {
  const sevColors = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#10b981' };
  const c = sevColors[severity] || color;
  return (
    <span className="mli-risk-pill" style={{ background: `${c}22`, color: c }}>
      {label || severity}
    </span>
  );
}

export function Badge({ value, color }) {
  return (
    <span className="mli-badge" style={{ background: `${color}22`, color }}>
      {value}
    </span>
  );
}
