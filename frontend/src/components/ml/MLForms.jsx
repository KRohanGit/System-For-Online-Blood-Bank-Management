import React from 'react';
import { BLOOD_GROUPS } from '../../constants/mlConstants';
import { Field, FieldRow, RunBtn } from './MLSharedUI';

function FormWrapper({ desc, children, onRun, loading, color, btnLabel }) {
  return (
    <div className="mli-form">
      <p className="mli-form-desc">{desc}</p>
      {children}
      <RunBtn label={btnLabel} onClick={onRun} loading={loading} color={color} />
    </div>
  );
}

export function DemandForm({ form, setForm, onRun, loading, color }) {
  return (
    <FormWrapper
      desc="Forecasts blood demand per blood group using historical request data and statistical models."
      onRun={onRun} loading={loading} color={color} btnLabel="📈 Run Demand Forecast"
    >
      <FieldRow>
        <Field label="Blood Group">
          <select className="mli-select" value={form.bloodGroup} onChange={e => setForm({ ...form, bloodGroup: e.target.value })}>
            {BLOOD_GROUPS.map(g => <option key={g}>{g}</option>)}
          </select>
        </Field>
        <Field label="Forecast Horizon (days)">
          <input className="mli-input" type="number" min={1} max={90} value={form.horizonDays}
            onChange={e => setForm({ ...form, horizonDays: +e.target.value })} />
        </Field>
      </FieldRow>
    </FormWrapper>
  );
}

export function CrisisForm({ form, setForm, onRun, loading, color }) {
  return (
    <FormWrapper
      desc="Predicts the probability of a blood supply crisis within the lookahead window using inventory trends and demand volatility."
      onRun={onRun} loading={loading} color={color} btnLabel="🚨 Run Crisis Prediction"
    >
      <FieldRow>
        <Field label="Lookahead Window (hours)">
          <input className="mli-input" type="number" min={1} max={168} value={form.lookaheadHours}
            onChange={e => setForm({ lookaheadHours: +e.target.value })} />
        </Field>
      </FieldRow>
    </FormWrapper>
  );
}

export function WastageForm({ form, setForm, onRun, loading, color }) {
  return (
    <FormWrapper
      desc="Identifies blood units at risk of expiring before use. Leave blood group empty to scan all groups."
      onRun={onRun} loading={loading} color={color} btnLabel="⚠️ Check Wastage Risk"
    >
      <FieldRow>
        <Field label="Blood Group">
          <select className="mli-select" value={form.bloodGroup} onChange={e => setForm({ ...form, bloodGroup: e.target.value })}>
            <option value="">All Groups</option>
            {BLOOD_GROUPS.map(g => <option key={g}>{g}</option>)}
          </select>
        </Field>
        <Field label="Horizon (days)">
          <input className="mli-input" type="number" min={1} max={60} value={form.horizonDays}
            onChange={e => setForm({ ...form, horizonDays: +e.target.value })} />
        </Field>
      </FieldRow>
    </FormWrapper>
  );
}

export function AnomalyForm({ form, setForm, onRun, loading, color }) {
  return (
    <FormWrapper
      desc="Detects unusual statistical patterns in blood inventory levels or request volumes using Z-score analysis."
      onRun={onRun} loading={loading} color={color} btnLabel="🔍 Detect Anomalies"
    >
      <FieldRow>
        <Field label="Metric Type">
          <select className="mli-select" value={form.metricType} onChange={e => setForm({ ...form, metricType: e.target.value })}>
            <option value="inventory">Inventory Levels</option>
            <option value="requests">Request Volume</option>
          </select>
        </Field>
        <Field label="Time Window (hours)">
          <input className="mli-input" type="number" min={1} max={720} value={form.timeWindowHours}
            onChange={e => setForm({ ...form, timeWindowHours: +e.target.value })} />
        </Field>
      </FieldRow>
    </FormWrapper>
  );
}

export function RankingForm({ form, setForm, onRun, loading, color }) {
  return (
    <FormWrapper
      desc="Ranks nearby hospitals using real-time AI decision scoring across availability, distance, response performance, workload, and reliability."
      onRun={onRun} loading={loading} color={color} btnLabel="🏥 Rank Hospitals"
    >
      <FieldRow>
        <Field label="Blood Group Needed">
          <select className="mli-select" value={form.bloodGroup} onChange={e => setForm({ ...form, bloodGroup: e.target.value })}>
            {BLOOD_GROUPS.map(g => <option key={g}>{g}</option>)}
          </select>
        </Field>
        <Field label="Urgency Level">
          <select className="mli-select" value={form.urgency} onChange={e => setForm({ ...form, urgency: e.target.value })}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </Field>
        <Field label="Units Needed">
          <input className="mli-input" type="number" min={1} max={50} value={form.unitsNeeded}
            onChange={e => setForm({ ...form, unitsNeeded: +e.target.value })} />
        </Field>
        <Field label="Max Distance (km)">
          <input className="mli-input" type="number" min={1} max={200} value={form.maxDistanceKm}
            onChange={e => setForm({ ...form, maxDistanceKm: +e.target.value })} />
        </Field>
        <Field label="Latitude">
          <input
            className="mli-input"
            type="number"
            step="0.000001"
            value={form.latitude ?? ''}
            onChange={e => setForm({ ...form, latitude: parseFloat(e.target.value) })}
          />
        </Field>
        <Field label="Longitude">
          <input
            className="mli-input"
            type="number"
            step="0.000001"
            value={form.longitude ?? ''}
            onChange={e => setForm({ ...form, longitude: parseFloat(e.target.value) })}
          />
        </Field>
      </FieldRow>

      <div className="mli-toggle-row">
        <label className="mli-toggle-item">
          <input
            type="checkbox"
            checked={!!form.useOptimizationValidation}
            onChange={e => setForm({ ...form, useOptimizationValidation: e.target.checked })}
          />
          <span>Validate top routes with optimization engine</span>
        </label>
      </div>
    </FormWrapper>
  );
}

export function SimulationForm({ form, setForm, onRun, loading, color }) {
  return (
    <FormWrapper
      desc="Runs Monte Carlo simulations to model supply and demand scenarios probabilistically with confidence intervals."
      onRun={onRun} loading={loading} color={color} btnLabel="🎲 Run Simulation"
    >
      <FieldRow>
        <Field label="Scenario Type">
          <select className="mli-select" value={form.scenarioType} onChange={e => setForm({ ...form, scenarioType: e.target.value })}>
            <option value="shortage">Blood Shortage</option>
            <option value="disaster">Natural Disaster</option>
            <option value="donor_campaign">Donor Campaign</option>
          </select>
        </Field>
        <Field label="Duration (days)">
          <input className="mli-input" type="number" min={7} max={365} value={form.durationDays}
            onChange={e => setForm({ ...form, durationDays: +e.target.value })} />
        </Field>
        <Field label="Monte Carlo Runs">
          <input className="mli-input" type="number" min={10} max={1000} value={form.monteCarloRuns}
            onChange={e => setForm({ ...form, monteCarloRuns: +e.target.value })} />
        </Field>
      </FieldRow>
    </FormWrapper>
  );
}

export function OptimizeForm({ form, setForm, onRun, loading, color }) {
  return (
    <FormWrapper
      desc="Real-time multi-objective optimization over hospital inventory, emergencies, expiry risk, and transport constraints using a SciPy-backed solver."
      onRun={onRun} loading={loading} color={color} btnLabel="🔄 Optimize Transfers"
    >
      <FieldRow>
        <Field label="Optimization Mode">
          <select className="mli-select" value={form.mode} onChange={e => setForm({ ...form, mode: e.target.value })}>
            <option value="auto">Auto (Intelligent Weights)</option>
            <option value="minimize_wastage">Minimize Wastage</option>
            <option value="minimize_delivery_time">Minimize Delivery Time</option>
            <option value="maximize_emergency_coverage">Maximize Emergency Coverage</option>
            <option value="balanced">Balanced Mode</option>
          </select>
        </Field>
        <Field label="Transport Capacity / Route">
          <input className="mli-input" type="number" min={1} max={100} value={form.transportCapacity}
            onChange={e => setForm({ ...form, transportCapacity: +e.target.value })} />
        </Field>
        <Field label="Max Distance (km)">
          <input className="mli-input" type="number" min={20} max={500} value={form.maxDistanceKm}
            onChange={e => setForm({ ...form, maxDistanceKm: +e.target.value })} />
        </Field>
        <Field label="Time Horizon (days)">
          <input className="mli-input" type="number" min={1} max={30} value={form.timeHorizonDays}
            onChange={e => setForm({ ...form, timeHorizonDays: +e.target.value })} />
        </Field>
      </FieldRow>

      <div className="mli-toggle-row">
        <label className="mli-toggle-item">
          <input
            type="checkbox"
            checked={!!form.includeRLSuggestions}
            onChange={e => setForm({ ...form, includeRLSuggestions: e.target.checked })}
          />
          <span>Use RL Agent suggestions (refinement only)</span>
        </label>
        <label className="mli-toggle-item">
          <input
            type="checkbox"
            checked={!!form.includeGraphConnectivity}
            onChange={e => setForm({ ...form, includeGraphConnectivity: e.target.checked })}
          />
          <span>Use graph connectivity weighting</span>
        </label>
      </div>
    </FormWrapper>
  );
}

export function SyntheticForm({ form, setForm, onRun, loading, color }) {
  return (
    <FormWrapper
      desc="Generate realistic donor populations with scenario-driven behavior, geographic clusters, and eligibility-aware availability scoring."
      onRun={onRun} loading={loading} color={color} btnLabel="Generate Synthetic Donor Network"
    >
      <FieldRow>
        <Field label="Data Type">
          <select className="mli-select" value={form.dataType} onChange={e => setForm({ ...form, dataType: e.target.value })}>
            <option value="donors">Donor Records</option>
          </select>
        </Field>
        <Field label="Record Count">
          <input className="mli-input" type="number" min={10} max={2000} value={form.count}
            onChange={e => setForm({ ...form, count: +e.target.value })} />
        </Field>
        <Field label="Scenario">
          <select className="mli-select" value={form.scenario} onChange={e => setForm({ ...form, scenario: e.target.value })}>
            <option value="normal">Normal Baseline</option>
            <option value="festival">Festival Season</option>
            <option value="outbreak">Disease Outbreak</option>
            <option value="heatwave">Heatwave Constraints</option>
            <option value="emergency_drive">Emergency Donation Drive</option>
          </select>
        </Field>
      </FieldRow>

      <FieldRow>
        <Field label="District Filter">
          <input
            className="mli-input"
            type="text"
            placeholder="all"
            value={form.district}
            onChange={e => setForm({ ...form, district: e.target.value })}
          />
        </Field>
        <Field label="Deterministic Seed">
          <input className="mli-input" type="number" min={1} max={999999} value={form.seed}
            onChange={e => setForm({ ...form, seed: +e.target.value })} />
        </Field>
      </FieldRow>

      <div className="mli-toggle-row">
        <label className="mli-toggle-item">
          <input
            type="checkbox"
            checked={!!form.includeGeo}
            onChange={e => setForm({ ...form, includeGeo: e.target.checked })}
          />
          <span>Include geospatial coordinates</span>
        </label>
        <label className="mli-toggle-item">
          <input
            type="checkbox"
            checked={!!form.injectToSystem}
            onChange={e => setForm({ ...form, injectToSystem: e.target.checked })}
          />
          <span>Flag generated records as system-injected</span>
        </label>
      </div>
    </FormWrapper>
  );
}
