import React from 'react';
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
    case 'synthetic': return <SyntheticResults data={data} color={color} history={extra.history || []} latestSocketEvent={extra.latestSocketEvent} />;
    default: return <NoData />;
  }
}

function renderDistributionBars(distribution = {}, color) {
  const entries = Object.entries(distribution || {});
  if (!entries.length) return null;

  const maxValue = Math.max(...entries.map(([, value]) => Number(value) || 0), 1);

  return (
    <div className="mli-bar-chart" style={{ height: 150 }}>
      {entries.map(([label, value]) => {
        const numValue = Number(value) || 0;
        const heightPct = Math.max(6, Math.round((numValue / maxValue) * 100));

        return (
          <div key={label} className="mli-bar-col">
            <div className="mli-bar-track">
              <div className="mli-bar-fill" style={{ height: `${heightPct}%`, background: color }} />
            </div>
            <div className="mli-bar-label">{label}</div>
            <div className="mli-bar-val">{numValue}</div>
          </div>
        );
      })}
    </div>
  );
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
  
  const crisisProb = data.crisis_probability || 0;
  const riskLevel = data.risk_level || 'Unknown';
  const factors = data.contributing_factors || [];
  
  return (
    <div className="mli-result-panel">
      <ResultHeader title="🚨 Crisis Prediction Results" color={color} />
      <div className="mli-crisis-gauge">
        <div className="mli-gauge-ring" style={{
          background: `conic-gradient(${color} 0deg ${crisisProb * 360}deg, rgba(255,255,255,0.1) 0deg)`
        }}>
          <div className="mli-gauge-inner">
            <div className="mli-gauge-pct">{(crisisProb * 100).toFixed(0)}%</div>
            <div className="mli-gauge-lbl">Crisis Risk</div>
          </div>
        </div>
        <div className="mli-crisis-meta">
          <div className="mli-risk-badge" style={{
            background: crisisProb > 0.7 ? 'rgba(239,68,68,0.12)' : 'rgba(107,114,128,0.12)',
            color: crisisProb > 0.7 ? '#f87171' : '#9ca3af'
          }}>
            {riskLevel.toUpperCase()}
          </div>
          {factors.length > 0 && (
            <>
              <div className="mli-factors-title">Contributing Factors</div>
              {factors.map((f, i) => (
                <div key={i} className="mli-factor-row">
                  <div className="mli-factor-name">{f.factor || `Factor ${i + 1}`}</div>
                  <div className="mli-factor-bar-track">
                    <div className="mli-factor-bar" style={{
                      width: `${(f.severity || 0.5) * 100}%`,
                      background: color
                    }} />
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
      {data.predicted_shortages && data.predicted_shortages.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: 'rgba(255,255,255,0.65)', marginBottom: '10px' }}>
            Predicted Shortages
          </div>
          {data.predicted_shortages.map((s, i) => (
            <div key={i} className="mli-stat-row">
              <StatCard label={`${s.blood_group} Shortage`} value={s.shortage_units || 0} color={color} unit=" units" />
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
  
  const rows = anomalies.slice(0, 10).map(a => [
    a.type?.replace(/_/g, ' ') || 'Unknown',
    a.blood_group || 'N/A',
    a.value?.toFixed(2) || 0,
    a.severity || 'medium'
  ]);
  
  const severityDist = data.severity_distribution || {};
  
  return (
    <div className="mli-result-panel">
      <ResultHeader title="🔍 Anomaly Detection Results" color={color} />
      <div className="mli-stat-row">
        <StatCard label="Total Anomalies" value={data.anomaly_count || 0} color={color} />
        <StatCard label="High Severity" value={severityDist.high || 0} color="#ef4444" />
        <StatCard label="Medium Severity" value={severityDist.medium || 0} color="#f59e0b" />
      </div>
      {rows.length > 0 && <MLTable headers={['Anomaly Type', 'Blood Group', 'Value', 'Severity']} rows={rows} />}
    </div>
  );
}

function RankingResults({ data, color, latestSocketEvent = null }) {
  const hospitals = data?.ranked_hospitals || [];
  if (!hospitals.length) return <NoData>No hospitals found within criteria</NoData>;

  const analysisFlow = Array.isArray(data?.analysisFlow) && data.analysisFlow.length
    ? data.analysisFlow
    : ['AI analyzing hospital network...', 'Evaluating best options...'];

  const rows = hospitals.slice(0, 20).map((h, i) => [
    `#${h.rank || i + 1}`,
    h.hospitalName || h.hospital_name || 'Unknown Hospital',
    `${formatMetricValue(h.score ?? h.final_score ?? 0, 1)}`,
    `${formatMetricValue(h.confidence ?? 0, 1)}%`,
    `${formatMetricValue(h.estimatedResponseTime ?? h.estimated_response_time ?? 0, 1)} min`,
    `${formatMetricValue(h.distanceKm ?? h.distance_km ?? 0, 1)} km`
  ]);
  
  return (
    <div className="mli-result-panel">
      <ResultHeader title="AI Hospital Decision Ranking" color={color} />

      <div className="mli-recs" style={{ marginBottom: 12 }}>
        <div className="mli-recs-title">Decision Flow</div>
        {analysisFlow.map((line, idx) => (
          <div key={`${line}-${idx}`} className="mli-rec-item">{line}</div>
        ))}
      </div>

      {latestSocketEvent && (
        <div className="mli-ci-row" style={{ marginBottom: 12 }}>
          Live ranking refresh at {new Date(latestSocketEvent.generatedAt || Date.now()).toLocaleTimeString()} with {latestSocketEvent.totalEvaluated || hospitals.length} evaluated hospitals.
        </div>
      )}

      <div className="mli-stat-row">
        <StatCard label="Hospitals Evaluated" value={data.total_evaluated || 0} color={color} />
        <StatCard label="Fulfillment Probability" value={(data.fulfillment_probability * 100).toFixed(0)} color={color} unit="%" />
        <StatCard label="Top Confidence" value={`${formatMetricValue(hospitals[0]?.confidence || 0, 1)}%`} color={color} />
        <StatCard label="Top ETA" value={`${formatMetricValue(hospitals[0]?.estimatedResponseTime || hospitals[0]?.estimated_response_time || 0, 1)} min`} color={color} />
      </div>

      {rows.length > 0 && <MLTable headers={['Rank', 'Hospital', 'Score', 'Confidence', 'Est. Response', 'Distance']} rows={rows} />}

      {hospitals.slice(0, 6).map((h, i) => (
        <div key={i} className="mli-hospital-row">
          <div className="mli-hospital-rank" style={{ background: color }}>#{i + 1}</div>
          <div className="mli-hospital-info">
            <div className="mli-hospital-name">{h.hospitalName || h.hospital_name || 'Unknown Hospital'}</div>
            <div className="mli-hospital-meta">
              <span>📍 {formatMetricValue(h.distanceKm ?? h.distance_km ?? 0, 1)} km</span>
              <span>⏱ ETA: {formatMetricValue(h.estimatedResponseTime ?? h.estimated_response_time ?? 0, 1)} min</span>
              <span>🎯 Confidence: {formatMetricValue(h.confidence ?? 0, 1)}%</span>
            </div>
            {h.explanation && <div className="mli-factor-row" style={{ marginTop: 6 }}>{h.explanation}</div>}
          </div>
          <div className="mli-hospital-score" style={{ color }}>
            {formatMetricValue(h.score ?? h.final_score ?? 0, 1)}
          </div>
        </div>
      ))}
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
  if (!transfers.length) return <OkMsg>No transfers recommended - inventory is already optimized</OkMsg>;

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
      <ResultHeader title="AI-Assisted Transfer Optimization" color={color} />

      {analysisFlow.length > 0 && (
        <div className="mli-recs" style={{ marginBottom: 12 }}>
          <div className="mli-recs-title">Optimization Flow</div>
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
          Live optimization event received at {new Date(latestSocketEvent.generatedAt || Date.now()).toLocaleTimeString()} with {latestSocketEvent.totalUnitsMoved || 0} units moved.
        </div>
      )}

      {rows.length > 0 && <MLTable headers={['From Hospital', 'To Hospital', 'Blood Group', 'Units', 'ETA', 'Distance']} rows={rows} />}

      {data?.explanation && (
        <div className="mli-recs" style={{ marginTop: 12 }}>
          <div className="mli-recs-title">AI Explanation</div>
          <div className="mli-rec-item">{data.explanation}</div>
        </div>
      )}

      {compareRows.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div className="mli-recs-title">Current System vs Optimized System</div>
          <MLTable headers={['Metric', 'Current', 'Optimized', 'Improvement']} rows={compareRows} />
        </div>
      )}

      {historyRows.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div className="mli-recs-title">Optimization History</div>
          <MLTable headers={['Created', 'Mode', 'Units', 'Wastage Reduced', 'Coverage', 'Runtime']} rows={historyRows} />
        </div>
      )}
    </div>
  );
}

function SyntheticResults({ data, color, history = [], latestSocketEvent = null }) {
  if (!data?.generated_count || data.generated_count === 0) return <NoData>No synthetic data generated</NoData>;

  const summary = data.summary || {};
  const preview = Array.isArray(data.preview) ? data.preview : [];
  const clusters = Array.isArray(summary.clusters) ? summary.clusters : [];
  const narrative = Array.isArray(summary.narrative) ? summary.narrative : [];
  const historyRows = history.slice(0, 8).map((item) => [
    new Date(item.createdAt).toLocaleString(),
    item.scenario,
    item.district,
    item.count,
    `${item.qualityScore || 0}`
  ]);

  return (
    <div className="mli-result-panel">
      <ResultHeader title="Synthetic Donor Data Generation" color={color} />

      <div className="mli-stat-row">
        <StatCard label="Records Generated" value={data.generated_count} accent={color} />
        <StatCard label="Scenario" value={data.scenario?.replace(/_/g, ' ') || 'normal'} accent={color} />
        <StatCard label="Quality Score" value={data.quality_score || 0} accent={color} />
        <StatCard label="Seed" value={data.seed || 42} accent={color} />
      </div>

      {latestSocketEvent && (
        <div className="mli-ci-row" style={{ marginBottom: 14 }}>
          Live event: generation #{String(latestSocketEvent.generationId || '').slice(-6)} received at {new Date(latestSocketEvent.generatedAt || Date.now()).toLocaleTimeString()} with {latestSocketEvent.generatedCount || 0} records.
        </div>
      )}

      {narrative.length > 0 && (
        <div className="mli-recs" style={{ marginBottom: 14 }}>
          <div className="mli-recs-title">Generation Narrative</div>
          {narrative.map((line, idx) => (
            <div key={`${line}-${idx}`} className="mli-rec-item">{line}</div>
          ))}
        </div>
      )}

      <div className="mli-synth-grid">
        <div className="mli-synth-block">
          <div className="mli-recs-title">Blood Group Distribution</div>
          {renderDistributionBars(summary.bloodGroupDistribution, color)}
        </div>
        <div className="mli-synth-block">
          <div className="mli-recs-title">Availability Bands</div>
          {renderDistributionBars(summary.availabilityBands, '#10b981')}
        </div>
      </div>

      {preview.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div className="mli-recs-title">Preview Records</div>
          <MLTable
            headers={['ID', 'Name', 'Blood', 'Age', 'Availability', 'City', 'Eligible']}
            rows={preview.slice(0, 10).map((item) => [
              item.syntheticId,
              item.fullName,
              item.bloodGroup,
              item.age,
              `${Math.round((item.availabilityScore || 0) * 100)}%`,
              item.city,
              item.eligibleNow ? 'Yes' : 'No'
            ])}
          />
        </div>
      )}

      {clusters.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div className="mli-recs-title">Cluster Map Summary</div>
          <MLTable
            headers={['City', 'State', 'Donors', 'High Availability', 'Rare Group Donors']}
            rows={clusters.slice(0, 10).map((cluster) => [
              cluster.city,
              cluster.state,
              cluster.donors,
              cluster.highAvailability,
              cluster.rareGroupDonors
            ])}
          />
        </div>
      )}

      {historyRows.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div className="mli-recs-title">Generation History</div>
          <MLTable headers={['Created', 'Scenario', 'District', 'Count', 'Quality']} rows={historyRows} />
        </div>
      )}
    </div>
  );
}
