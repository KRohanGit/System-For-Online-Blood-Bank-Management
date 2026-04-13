import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceDot
} from 'recharts';
import { StatCard, RecommendationList, OkMsg, NoData, MLTable } from './MLSharedUI';

function formatMetricValue(value, decimals = 2) {
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value ?? 'N/A');
  if (Math.abs(num) >= 1000) return Math.round(num).toLocaleString();
  return num.toFixed(decimals);
}

function prettyHospitalLabel(raw, index = 0) {
  const value = String(raw || '').trim();
  if (!value) return 'Unknown Hospital';
  if (/^[0-9a-f]{24}$/i.test(value)) return `Hospital ID ${String(value).slice(-6)}`;
  if (/^\d+$/.test(value)) return `Hospital ID ${value}`;
  if (value.length > 28) return `${value.slice(0, 26)}...`;
  return value;
}

export function ResultPanel({ tab, data, color, extra = {} }) {
  if (!data) return null;

  switch (tab) {
    case 'demand': return <DemandResults data={data} color={color} />;
    case 'crisis': return <CrisisResults data={data} color={color} />;
    case 'wastage': return <WastageResults data={data} color={color} />;
    case 'anomaly': return <AnomalyResults data={data} color={color} />;
    case 'ranking': return <RankingResults data={data} color={color} latestSocketEvent={extra.latestSocketEvent} />;
    case 'simulation': return <SimulationResults data={data} color={color} />;
    case 'optimize': return <OptimizeResults data={data} color={color} history={extra.history || []} latestSocketEvent={extra.latestSocketEvent} />;
    default: return <NoData />;
  }
}

function ResultHeader({ title, color }) {
  return (
    <div className="mli-result-header">
      <div className="mli-result-title">{title}</div>
      <div className="mli-result-time">Generated {new Date().toLocaleTimeString()}</div>
    </div>
  );
}

function DemandResults({ data, color }) {
  const preds = data?.predictions || [];
  if (!preds.length) return <NoData>No prediction data returned</NoData>;

  const rows = preds.slice(0, 10).map(p => [
    p.blood_group || 'N/A',
    p.predicted_demand?.toFixed(0) || 0,
    p.confidence_percentage ? `${p.confidence_percentage}%` : '—',
    p.trend || 'Stable'
  ]);
  
  return (
    <div className="mli-result-panel">
      <ResultHeader title="📈 Demand Forecast Results" color={color} />
      <div className="mli-stat-row">
        <StatCard label="Peak Demand" value={Math.max(...preds.map(p => p.predicted_demand || 0))} color={color} unit=" units" />
        <StatCard label="Avg Demand" value={(preds.reduce((s, p) => s + (p.predicted_demand || 0), 0) / preds.length).toFixed(0)} color={color} unit=" units" />
        <StatCard label="Forecast Days" value={preds.length} color={color} />
      </div>
      {rows.length > 0 && <MLTable headers={['Blood Group', 'Predicted Units', 'Confidence', 'Trend']} rows={rows} />}
      {data.recommendations && <RecommendationList items={data.recommendations} />}
    </div>
  );
}

function CrisisResults({ data, color }) {
  if (!data) return <NoData />;

  const riskLevel = String(data.risk_level || data.crisis_level || 'medium').toUpperCase();
  const impactedHospitals = Number(data.affected_hospitals || data.impacted_hospitals || 0);
  const shortages = Array.isArray(data.shortages) ? data.shortages : [];
  const criticalGroups = Array.isArray(data.critical_blood_groups) ? data.critical_blood_groups : [];

  return (
    <div className="mli-result-panel">
      <ResultHeader title="Crisis Prediction Results" color={color} />
      <div className="mli-stat-row">
        <StatCard label="Risk Level" value={riskLevel} color={color} />
        <StatCard label="Impacted Hospitals" value={impactedHospitals} color={color} />
        <StatCard label="Critical Blood Groups" value={criticalGroups.length} color={color} />
      </div>

      {shortages.length > 0 && (
        <div className="mli-recs" style={{ marginTop: 10 }}>
          <div className="mli-recs-title">Expected Shortages</div>
          {shortages.slice(0, 6).map((s, i) => (
            <div key={i} className="mli-rec-item">
              {s.blood_group || 'Unknown'}: {formatMetricValue(s.shortage_units || 0, 0)} units likely short
            </div>
          ))}
        </div>
      )}

      {data.recommended_actions && <RecommendationList items={data.recommended_actions} />}
    </div>
  );
}

function WastageResults({ data, color }) {
  const atRisk = data?.at_risk_units || [];
  if (!atRisk.length) return <OkMsg>No wastage risks detected</OkMsg>;
  
  const wastageProb = data.wastage_probability || 0;
  const rows = atRisk.slice(0, 10).map(u => [
    u.blood_group || 'N/A',
    `${(u.wastage_risk * 100).toFixed(0)}%`,
    u.days_to_expiry?.toFixed(0) || 0,
    u.collection_date ? new Date(u.collection_date).toLocaleDateString() : 'N/A'
  ]);
  
  return (
    <div className="mli-result-panel">
      <ResultHeader title="⚠️ Wastage Risk Assessment" color={color} />
      <div className="mli-stat-row">
        <StatCard label="Overall Wastage Risk" value={(wastageProb * 100).toFixed(0)} color={color} unit="%" />
        <StatCard label="At-Risk Units" value={atRisk.length} color={color} />
        {data.cost_impact && <StatCard label="Potential Loss" value={`₹${data.cost_impact.estimated_loss || 0}`} color={color} />}
      </div>
      {rows.length > 0 && <MLTable headers={['Blood Group', 'Wastage Risk', 'Days to Expiry', 'Collection Date']} rows={rows} />}
      {data.fifo_recommendations && <RecommendationList items={data.fifo_recommendations.map(r => `${r.blood_group}: ${r.action}`)} />}
    </div>
  );
}

function AnomalyResults({ data, color }) {
  const anomalies = data?.anomalies || [];
  if (!anomalies.length) return <OkMsg>No anomalies detected</OkMsg>;

  const severityDist = data.severity_distribution || {};
  const selectedMetric = String(data.metricType || data.metric_type || 'inventory').toLowerCase();
  const inventorySeries = data.inventorySeries || [];
  const requestSeries = data.requestSeries || [];
  const topAnomalies = anomalies.slice(0, 5);

  const chartData = inventorySeries.map(point => {
    const isAnomaly = anomalies.find(a => a.timestamp === point.time || a.timestamp === point.isoTime);
    const matchedRequest = requestSeries.find(r => r.time === point.time || r.isoTime === point.isoTime);
    return {
      ...point,
      abMinusObservedRequests: matchedRequest?.observed,
      abMinusNormalRequests: matchedRequest?.normal,
      anomalyOminus: isAnomaly?.bloodGroup === 'O-' ? point['O-'] : null,
      anomalyABminus: isAnomaly?.bloodGroup === 'AB-' ? point['AB-'] : null
    };
  });

  const requestChartData = requestSeries.map(point => {
    const isRequestSpike = anomalies.some(a =>
      (a.timestamp === point.time || a.timestamp === point.isoTime) &&
      (a.bloodGroup === 'AB-' || a.blood_group === 'AB-' || a.type === 'demand_spike')
    );
    return {
      ...point,
      anomalyObserved: isRequestSpike ? point.observed : null
    };
  });

  const peakObservedRequest = requestSeries.length
    ? Math.max(...requestSeries.map(r => Number(r.observed || 0)))
    : 0;
  const peakNormalRequest = requestSeries.length
    ? Math.max(...requestSeries.map(r => Number(r.normal || 0)))
    : 0;
  const requestDeltaPct = peakNormalRequest > 0
    ? ((peakObservedRequest - peakNormalRequest) / peakNormalRequest) * 100
    : 0;

  return (
    <div className="mli-result-panel">
      <ResultHeader title="Anomaly Detection Report" color={color} />
      <div className="mli-stat-row">
        <StatCard label="Total Anomalies" value={data.anomaly_count || 0} color={color} />
        <StatCard label="High Risk" value={severityDist.high || 0} color="#ef4444" />
        <StatCard label="Medium Risk" value={severityDist.medium || 0} color="#f59e0b" />
        <StatCard label="Low Risk" value={severityDist.low || 0} color="#16a34a" />
      </div>

      {requestSeries.length > 0 && (
        <div className="mli-stat-row" style={{ marginTop: 8 }}>
          <StatCard label="Peak Observed Requests" value={formatMetricValue(peakObservedRequest, 1)} color="#8b5cf6" />
          <StatCard label="Expected Baseline" value={formatMetricValue(peakNormalRequest, 1)} color="#0ea5e9" />
          <StatCard
            label="Request Spike"
            value={`${requestDeltaPct >= 0 ? '+' : ''}${formatMetricValue(requestDeltaPct, 0)}%`}
            color={requestDeltaPct >= 0 ? '#dc2626' : '#16a34a'}
          />
        </div>
      )}

      {chartData.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ marginBottom: 8 }}>
            {selectedMetric === 'requests' ? '24-Hour Inventory Context (supporting view)' : '24-Hour Blood Inventory Trend'}
          </h4>
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(148, 163, 184, 0.25)" />
                <XAxis dataKey="time" tick={{ fill: '#334155', fontSize: 11 }} />
                <YAxis tick={{ fill: '#334155', fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="O+" stroke="#1d4ed8" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="B+" stroke="#0f766e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="AB-" stroke="#7c3aed" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="O-" stroke="#f59e0b" strokeWidth={2} dot={false} />

                {chartData.map((d, idx) => (
                  d.anomalyOminus != null ? (
                    <ReferenceDot
                      key={`o-minus-anomaly-${idx}`}
                      x={d.time}
                      y={d['O-']}
                      r={6}
                      fill="#dc2626"
                      stroke="#991b1b"
                    />
                  ) : null
                ))}
                {chartData.map((d, idx) => (
                  d.anomalyABminus != null ? (
                    <ReferenceDot
                      key={`ab-minus-anomaly-${idx}`}
                      x={d.time}
                      y={d['AB-']}
                      r={6}
                      fill="#dc2626"
                      stroke="#991b1b"
                    />
                  ) : null
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {requestChartData.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ marginBottom: 8 }}>
            {selectedMetric === 'requests' ? '24-Hour Request Volume Trend (primary view)' : '24-Hour Request Volume Trend'}
          </h4>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={requestChartData}>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(148, 163, 184, 0.25)" />
                <XAxis dataKey="time" tick={{ fill: '#334155', fontSize: 11 }} />
                <YAxis tick={{ fill: '#334155', fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="normal" name="Expected Requests" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="observed" name="Observed Requests" stroke="#8b5cf6" strokeWidth={2.2} dot={false} />
                {requestChartData.map((d, idx) => (
                  d.anomalyObserved != null ? (
                    <ReferenceDot
                      key={`request-anomaly-${idx}`}
                      x={d.time}
                      y={d.observed}
                      r={6}
                      fill="#dc2626"
                      stroke="#991b1b"
                    />
                  ) : null
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <MLTable
        headers={['Blood Group', 'Anomaly Type', 'Risk', 'Time', 'Impact']}
        rows={topAnomalies.map(a => [
          a.bloodGroup || a.blood_group || 'Unknown',
          (a.type || 'pattern_shift').replace(/_/g, ' '),
          (a.risk || a.severity || 'medium').toUpperCase(),
          a.timestamp || '-',
          typeof a.deltaPct === 'number' ? `${a.deltaPct}%` : '-'
        ])}
      />

      {(data.explanations?.length > 0 || topAnomalies.some(a => a.explanation)) && (
        <div className="mli-recs" style={{ marginTop: 12 }}>
          <div className="mli-recs-title">Plain-Language Explanation</div>
          {(data.explanations?.length ? data.explanations : topAnomalies.map(a => a.explanation).filter(Boolean)).map((line, idx) => (
            <div key={idx} className="mli-rec-item">{line}</div>
          ))}
        </div>
      )}

      {(data.recommendations?.length > 0 || topAnomalies.some(a => a.recommendation)) && (
        <div className="mli-recs" style={{ marginTop: 12 }}>
          <div className="mli-recs-title">Recommended Actions</div>
          {(data.recommendations?.length ? data.recommendations : topAnomalies.map(a => a.recommendation).filter(Boolean)).map((line, idx) => (
            <div key={idx} className="mli-rec-item">{line}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function RankingResults({ data, color, latestSocketEvent = null }) {
  const hospitals = data?.ranked_hospitals || [];
  if (!hospitals.length) return <NoData>No hospitals matched the selected filters. Try increasing Max Distance.</NoData>;

  const analysisFlow = Array.isArray(data?.analysisFlow) && data.analysisFlow.length
    ? data.analysisFlow
    : ['Checking nearby hospitals...', 'Evaluating best options...'];

  const rows = hospitals.slice(0, 20).map((h, i) => [
    `#${h.rank || i + 1}`,
    h.hospitalName || h.hospital_name || 'Unknown Hospital',
    `${formatMetricValue(h.score ?? h.final_score ?? 0, 1)}`,
    h.availabilityPct != null ? `${formatMetricValue(h.availabilityPct, 0)}%` : 'N/A',
    `${formatMetricValue(h.confidence ?? 0, 1)}%`,
    `${formatMetricValue(h.estimatedResponseTime ?? h.estimated_response_time ?? 0, 1)} min`,
    `${formatMetricValue(h.distanceKm ?? h.distance_km ?? 0, 1)} km`
  ]);
  
  return (
    <div className="mli-result-panel">
      <ResultHeader title="Hospital Ranking Results" color={color} />

      {data?.displayMessage && (
        <div className="mli-ci-row" style={{ marginBottom: 12 }}>
          {data.displayMessage}
        </div>
      )}

      <div className="mli-recs" style={{ marginBottom: 12 }}>
        <div className="mli-recs-title">How ranking was decided</div>
        {analysisFlow.map((line, idx) => (
          <div key={`${line}-${idx}`} className="mli-rec-item">{line}</div>
        ))}
      </div>

      {latestSocketEvent && (
        <div className="mli-ci-row" style={{ marginBottom: 12 }}>
          Ranking refreshed at {new Date(latestSocketEvent.generatedAt || Date.now()).toLocaleTimeString()} with {latestSocketEvent.totalEvaluated || hospitals.length} hospitals checked.
        </div>
      )}

      <div className="mli-stat-row">
        <StatCard label="Hospitals Evaluated" value={data.total_evaluated || 0} color={color} />
        <StatCard label="Fulfillment Probability" value={(data.fulfillment_probability * 100).toFixed(0)} color={color} unit="%" />
        <StatCard label="Top Confidence" value={`${formatMetricValue(hospitals[0]?.confidence || 0, 1)}%`} color={color} />
        <StatCard label="Top ETA" value={`${formatMetricValue(hospitals[0]?.estimatedResponseTime || hospitals[0]?.estimated_response_time || 0, 1)} min`} color={color} />
      </div>

      {rows.length > 0 && <MLTable headers={['Rank', 'Hospital', 'Priority Score', 'Stock Available', 'Confidence', 'Est. Response', 'Distance']} rows={rows} />}

      {hospitals[0]?.explanation && (
        <div className="mli-recs" style={{ marginTop: 12 }}>
          <div className="mli-recs-title">Top hospital note</div>
          <div className="mli-rec-item">{hospitals[0].explanation}</div>
        </div>
      )}
    </div>
  );
}

function SimulationResults({ data, color }) {
  if (!data) return <NoData />;
  
  const stats = data.simulation_statistics || {};
  
  return (
    <div className="mli-result-panel">
      <ResultHeader title="🎲 Simulation Results" color={color} />
      <div className="mli-stat-row">
        <StatCard label="Scenario" value={data.scenario_type?.replace(/_/g, ' ') || 'Unknown'} color={color} />
        <StatCard label="Success Rate" value={stats.success_rate ? `${(stats.success_rate * 100).toFixed(0)}%` : 'N/A'} color={color} />
        <StatCard label="MC Runs" value={data.monte_carlo_runs || 100} color={color} />
      </div>
      {stats.mean_outcome && (
        <div className="mli-stat-row">
          <StatCard label="Mean Outcome" value={stats.mean_outcome.toFixed(2)} color={color} />
          <StatCard label="Std Deviation" value={stats.std_deviation?.toFixed(2) || 'N/A'} color={color} />
        </div>
      )}
      {data.confidence_intervals && (
        <div className="mli-ci-row">
          📊 95% Confidence Interval: [{data.confidence_intervals[0]?.toFixed(2)}, {data.confidence_intervals[1]?.toFixed(2)}]
        </div>
      )}
      {data.recommendations && <RecommendationList items={data.recommendations} />}
    </div>
  );
}

function OptimizeResults({ data, color, history = [], latestSocketEvent = null }) {
  const transfers = data?.transfers || [];
  if (!transfers.length) return <OkMsg>No transfers needed right now - current stock is already well balanced</OkMsg>;

  const impact = data?.impactMetrics || {};
  const compare = data?.compare || {};
  const analysisFlow = Array.isArray(data?.analysisFlow) ? data.analysisFlow : [];
  const historyRows = Array.isArray(history)
    ? history.slice(0, 8).map((row) => [
      new Date(row.createdAt).toLocaleString(),
      row.mode || 'auto',
      row.totalUnitsMoved || 0,
      `${formatMetricValue(row.wastageReducedPct || 0, 1)}%`,
      `${formatMetricValue(row.emergencyCoveragePct || 0, 1)}%`,
      `${formatMetricValue(row.runtimeMs || 0, 0)} ms`
    ])
    : [];
  const rows = transfers.slice(0, 20).map((t, idx) => [
    prettyHospitalLabel(t.fromHospitalName || t.from_hospital, idx),
    prettyHospitalLabel(t.toHospitalName || t.to_hospital, idx),
    t.bloodGroup || t.blood_group || 'N/A',
    t.units || 0,
    t.etaMinutes != null ? `${formatMetricValue(t.etaMinutes, 1)} min` : 'N/A',
    t.distanceKm != null ? `${formatMetricValue(t.distanceKm, 1)} km` : 'N/A'
  ]);
  const compareRows = compare?.baseline && compare?.optimized ? [
    ['Coverage %', `${formatMetricValue(compare.baseline.coveragePct, 1)}%`, `${formatMetricValue(compare.optimized.coveragePct, 1)}%`, `${formatMetricValue(compare.improvementPct?.coverage || 0, 1)}%`],
    ['Avg Response (min)', formatMetricValue(compare.baseline.avgResponseMinutes, 1), formatMetricValue(compare.optimized.avgResponseMinutes, 1), `${formatMetricValue(compare.improvementPct?.responseTime || 0, 1)}%`],
    ['Wastage Risk Units', formatMetricValue(compare.baseline.wastageRiskUnits, 1), formatMetricValue(compare.optimized.wastageRiskUnits, 1), `${formatMetricValue(compare.improvementPct?.wastage || 0, 1)}%`]
  ] : [];

  return (
    <div className="mli-result-panel">
      <ResultHeader title="Transfer Coordination Plan" color={color} />

      {analysisFlow.length > 0 && (
        <div className="mli-recs" style={{ marginBottom: 12 }}>
          <div className="mli-recs-title">Planning Flow</div>
          {analysisFlow.map((line, idx) => (
            <div key={`${line}-${idx}`} className="mli-rec-item">{line}</div>
          ))}
        </div>
      )}

      <div className="mli-stat-row">
        <StatCard label="Transfer Routes" value={transfers.length} accent={color} />
        <StatCard label="Total Units Moved" value={impact.totalUnitsMoved || data.totalUnitsMoved || 0} accent={color} />
        <StatCard label="Wastage Reduced" value={`${formatMetricValue(impact.wastageReducedPct || data.wastageReduced || 0, 1)}%`} accent={color} />
        <StatCard label="Time Saved" value={`${formatMetricValue(impact.estimatedTimeSavedPct || data.estimatedTimeSaved || 0, 1)}%`} accent={color} />
        <StatCard label="Emergency Coverage" value={`${formatMetricValue(impact.emergencyCoveragePct || data.emergencyCoverage || 0, 1)}%`} accent={color} />
      </div>

      {latestSocketEvent && (
        <div className="mli-ci-row" style={{ marginBottom: 12 }}>
          Live transfer update received at {new Date(latestSocketEvent.generatedAt || Date.now()).toLocaleTimeString()} with {latestSocketEvent.totalUnitsMoved || 0} units moved.
        </div>
      )}

      {rows.length > 0 && <MLTable headers={['From Hospital', 'To Hospital', 'Blood Group', 'Units', 'ETA', 'Distance']} rows={rows} />}

      {data?.explanation && (
        <div className="mli-recs" style={{ marginTop: 12 }}>
          <div className="mli-recs-title">Why this plan is recommended</div>
          <div className="mli-rec-item">{data.explanation}</div>
        </div>
      )}

      {compareRows.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div className="mli-recs-title">Current Plan vs Recommended Plan</div>
          <MLTable headers={['Metric', 'Current', 'Optimized', 'Improvement']} rows={compareRows} />
        </div>
      )}

      {historyRows.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div className="mli-recs-title">Transfer Planning History</div>
          <MLTable headers={['Created', 'Mode', 'Units', 'Wastage Reduced', 'Coverage', 'Runtime']} rows={historyRows} />
        </div>
      )}
    </div>
  );
}
