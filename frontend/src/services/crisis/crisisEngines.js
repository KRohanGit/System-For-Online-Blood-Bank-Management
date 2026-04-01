import AuditLogger, { CRISIS_AUDIT_EVENTS } from './crisisAuditLogger';
import { HOSPITAL_ROLES } from './crisisAccessControl';

export const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

const severityOrder = { SAFE: 0, WATCH: 1, WARNING: 2, CRITICAL: 3 };

const wardCompatibility = {
  surgery: ['O+', 'O-', 'A+', 'A-', 'B+', 'B-'],
  icu: ['O-', 'A-', 'AB-', 'O+'],
  emergency: ['O-', 'O+', 'A+', 'B+'],
  general: BLOOD_TYPES,
};

export function getWardCompatibleTypes(department = 'general') {
  return wardCompatibility[department] || BLOOD_TYPES;
}

export const mockHospitalState = {
  inventory: {
    'O+': { current: 0, safe: 0, expiring24h: 0, expiring12h: 0 },
    'O-': { current: 0, safe: 0, expiring24h: 0, expiring12h: 0 },
    'A+': { current: 0, safe: 0, expiring24h: 0, expiring12h: 0 },
    'A-': { current: 0, safe: 0, expiring24h: 0, expiring12h: 0 },
    'B+': { current: 0, safe: 0, expiring24h: 0, expiring12h: 0 },
    'B-': { current: 0, safe: 0, expiring24h: 0, expiring12h: 0 },
    'AB+': { current: 0, safe: 0, expiring24h: 0, expiring12h: 0 },
    'AB-': { current: 0, safe: 0, expiring24h: 0, expiring12h: 0 },
  },
  timeToExhaustionHours: {
    'O+': 0,
    'O-': 0,
    'A+': 0,
    'A-': 0,
    'B+': 0,
    'B-': 0,
    'AB+': 0,
    'AB-': 0,
  },
  er_queue: [],
  surgeries: [],
  icu: { occupancy_pct: 0, trend: 'stable', critical_count: 0 },
  emergencyHistory: [],
};

export function getSeverity(score) {
  if (score <= 30) return 'SAFE';
  if (score <= 60) return 'WATCH';
  if (score <= 80) return 'WARNING';
  return 'CRITICAL';
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function getTimeMultiplier() {
  const h = new Date().getHours();
  if (h >= 22 || h < 6) return 1.3;
  if (h >= 6 && h < 12) return 1.1;
  if (h >= 12 && h < 18) return 1.0;
  return 1.15;
}

function severityFromRatio(ratio) {
  if (ratio >= 1) return 'safe';
  if (ratio >= 0.7) return 'watch';
  if (ratio >= 0.4) return 'warning';
  return 'critical';
}

export function buildAdmissionPressure(state = mockHospitalState) {
  const by2h = BLOOD_TYPES.reduce((acc, t) => ({ ...acc, [t]: 0 }), {});
  const by6h = BLOOD_TYPES.reduce((acc, t) => ({ ...acc, [t]: 0 }), {});

  let er2h = 0;
  let er6h = 0;
  state.er_queue.forEach((p) => {
    const bt = p.blood_type_likely === 'unknown' ? 'O-' : p.blood_type_likely;
    if (p.triage_level === 1) {
      by2h[bt] += 5;
      er2h += 5;
    }
    if (p.triage_level === 2) {
      by2h[bt] += 2;
      by6h[bt] += 3;
      er2h += 2;
      er6h += 3;
    }
  });

  let surgery2h = 0;
  let surgery6h = 0;
  state.surgeries.forEach((s) => {
    const bt = s.blood_type_required;
    if (s.surgery_type === 'cardiac' && s.scheduled_in_hours < 4) {
      by2h[bt] += 7;
      surgery2h += 7;
    }
    if (s.surgery_type === 'trauma' && s.scheduled_in_hours < 2) {
      by2h[bt] += 9;
      surgery2h += 9;
    }
    if ((s.surgery_type === 'cardiac' || s.surgery_type === 'trauma') && s.scheduled_in_hours >= 4 && s.scheduled_in_hours <= 8) {
      by6h[bt] += 7;
      surgery6h += 7;
    }
  });

  let total2h = Object.values(by2h).reduce((a, b) => a + b, 0);
  let total6h = Object.values(by6h).reduce((a, b) => a + b, 0);

  if (state.icu.occupancy_pct > 85 && state.icu.trend === 'rising') {
    total2h = Math.round(total2h * 1.2);
    total6h = Math.round(total6h * 1.2);
    Object.keys(by2h).forEach((k) => {
      by2h[k] = Math.round(by2h[k] * 1.2);
      by6h[k] = Math.round(by6h[k] * 1.2);
    });
  }

  if (state.icu.critical_count > 3) {
    total2h += 4;
    total6h += 4;
    by2h['O-'] += 2;
    by2h['O+'] += 2;
    by6h['O-'] += 2;
    by6h['O+'] += 2;
  }

  const dominant = (() => {
    const icu = state.icu.critical_count > 3 ? 8 : 0;
    const er = er2h + er6h;
    const surgery = surgery2h + surgery6h;
    if (Math.max(er, surgery, icu) === surgery) return 'surgery';
    if (Math.max(er, surgery, icu) === icu) return 'icu';
    return 'er_queue';
  })();

  const imminentShortage = BLOOD_TYPES.filter((bt) => by2h[bt] > (state.inventory[bt]?.current || 0));
  const unknownCount = state.er_queue.filter((x) => x.blood_type_likely === 'unknown').length;
  const confidence = unknownCount > 1 ? 'medium' : 'high';

  return {
    pressure_2h: { total_units: total2h, by_blood_type: by2h, dominant_driver: dominant },
    pressure_6h: { total_units: total6h, by_blood_type: by6h },
    confidence,
    imminent_shortage_types: imminentShortage,
    last_updated: new Date().toISOString(),
  };
}

export function buildLiveSignals(state = mockHospitalState) {
  const erCritical = state.er_queue.filter((x) => x.triage_level === 1 || x.triage_level === 2).length;
  const oNegConsumption = 5.4;
  const oNegBaseline = 1.05;
  const z = 4.2;
  const surgeryUnits4h = state.surgeries.filter((x) => x.scheduled_in_hours <= 4).reduce((sum, x) => sum + x.blood_units_needed, 0);
  const stockRatio = (state.inventory['O-'].current / state.inventory['O-'].safe).toFixed(2);
  const totalUnits = Object.values(state.inventory).reduce((sum, x) => sum + x.current, 0);
  const expiring12 = Object.values(state.inventory).reduce((sum, x) => sum + x.expiring12h, 0);
  const expiryPct = totalUnits ? ((expiring12 / totalUnits) * 100).toFixed(1) : '0.0';
  const tod = getTimeMultiplier();

  return [
    {
      signal_id: 'er_queue_pressure',
      name: 'ER Queue Pressure',
      current_value: erCritical,
      unit: 'patients',
      baseline: 'Average 2.1 at this hour',
      deviation: `${(erCritical / 2.1).toFixed(1)}x above baseline`,
      severity: erCritical >= 4 ? 'critical' : erCritical >= 3 ? 'warning' : 'watch',
      last_updated: new Date().toISOString(),
      source: 'Emergency Triage System',
      contribution: clamp(Math.round((erCritical / 6) * 15), 0, 15),
      maxContribution: 15,
      displayValue: `${erCritical} critical patients active`,
    },
    {
      signal_id: 'consumption_velocity',
      name: 'Consumption Velocity (O-)',
      current_value: oNegConsumption,
      unit: 'units/hr',
      baseline: '30-day mean for this hour: 1.05 units/hr',
      deviation: `${z} sigma above normal`,
      severity: z > 3.5 ? 'critical' : z > 2.5 ? 'warning' : 'watch',
      last_updated: new Date().toISOString(),
      source: 'Blood Bank Dispensing System',
      anomalyDetected: z > 2.5,
      contribution: clamp(Math.round((z / 5) * 20), 0, 20),
      maxContribution: 20,
      displayValue: `${oNegConsumption} units/hr`,
    },
    {
      signal_id: 'pending_surgery_demand',
      name: 'Pending Surgery Demand',
      current_value: surgeryUnits4h,
      unit: 'units',
      baseline: 'Typical pre-op demand: 4-6 units',
      deviation: `${state.surgeries.length} high-risk surgeries`,
      severity: surgeryUnits4h >= 12 ? 'critical' : surgeryUnits4h >= 8 ? 'warning' : 'watch',
      last_updated: new Date().toISOString(),
      source: 'OT Scheduling System',
      contribution: clamp(Math.round((surgeryUnits4h / 16) * 20), 0, 20),
      maxContribution: 20,
      displayValue: `${surgeryUnits4h} units needed within 2h`,
    },
    {
      signal_id: 'stock_level_ratio',
      name: 'Stock Level Ratio',
      current_value: Number(stockRatio),
      unit: 'ratio',
      baseline: 'Safe threshold ratio >= 1.00',
      deviation: `O-: ${state.inventory['O-'].current}/${state.inventory['O-'].safe} units (${Math.round(Number(stockRatio) * 100)}% of safe threshold)`,
      severity: severityFromRatio(Number(stockRatio)),
      last_updated: new Date().toISOString(),
      source: 'Inventory Management',
      contribution: clamp(Math.round((1 - Number(stockRatio)) * 25), 0, 25),
      maxContribution: 25,
      displayValue: `${stockRatio}x safe threshold`,
    },
    {
      signal_id: 'expiry_pressure',
      name: 'Expiry Pressure',
      current_value: Number(expiryPct),
      unit: '%',
      baseline: 'Healthy expiry pressure < 4%',
      deviation: `${expiring12} units expiring in <12h (${expiryPct}% of total stock)`,
      severity: Number(expiryPct) > 8 ? 'warning' : Number(expiryPct) > 4 ? 'watch' : 'safe',
      last_updated: new Date().toISOString(),
      source: 'Unit Tracking System',
      contribution: clamp(Math.round((Number(expiryPct) / 12) * 10), 0, 10),
      maxContribution: 10,
      displayValue: `${expiryPct}%`,
    },
    {
      signal_id: 'time_of_day_risk',
      name: 'Time-of-Day Risk',
      current_value: tod,
      unit: 'x',
      baseline: 'Base multiplier 1.0x',
      deviation: `${tod > 1.2 ? 'Night shift active' : 'Current shift profile'} - ${tod}x risk multiplier applied`,
      severity: tod >= 1.3 ? 'warning' : tod >= 1.15 ? 'watch' : 'safe',
      last_updated: new Date().toISOString(),
      source: 'System Clock + Historical Pattern DB',
      contribution: clamp(Math.round((tod - 1) * 33), 0, 10),
      maxContribution: 10,
      displayValue: `${tod}x`,
    },
  ];
}

export function calculateCrisisScore(state = mockHospitalState, user = null) {
  const liveSignals = buildLiveSignals(state);
  const score = clamp(Math.round(liveSignals.reduce((sum, s) => sum + s.contribution, 0)), 0, 100);
  const severity = getSeverity(score);
  const criticalTypes = BLOOD_TYPES.filter((bt) => {
    const inv = state.inventory[bt];
    return inv.current < inv.safe || state.timeToExhaustionHours[bt] < 12;
  });

  if (user) {
    AuditLogger.log(
      CRISIS_AUDIT_EVENTS.CRISIS_SCORE_CALCULATED,
      user,
      { crisis_score: score, severity, critical_types: criticalTypes },
      { signal_count: liveSignals.length, score_formula: 'weighted_sum' }
    );
  }

  return { score, severity, liveSignals, criticalTypes, lastUpdated: new Date().toISOString() };
}

export function createRankedActions(crisisScore) {
  const templates = [
    {
      action_id: 'ACT-SUP-001',
      category: 'supply',
      description: 'Contact Regional Blood Authority - O-negative emergency',
      target_blood_type: 'O-',
      estimated_units_impact: 20,
      time_to_execute_minutes: 180,
      confidence_pct: 87,
      projected_score_delta: 18,
      requires_role: [HOSPITAL_ROLES.BLOOD_BANK_COORDINATOR, HOSPITAL_ROLES.SUPPLY_CHAIN_MANAGER],
    },
    {
      action_id: 'ACT-SUP-002',
      category: 'supply',
      description: 'Arrange inter-hospital transfer from nearest facility',
      target_blood_type: 'O-',
      estimated_units_impact: 8,
      time_to_execute_minutes: 45,
      confidence_pct: 94,
      projected_score_delta: 12,
      requires_role: [HOSPITAL_ROLES.BLOOD_BANK_COORDINATOR, HOSPITAL_ROLES.SUPPLY_CHAIN_MANAGER],
    },
    {
      action_id: 'ACT-DEM-001',
      category: 'demand_reduction',
      description: 'Defer non-urgent elective surgeries scheduled today',
      target_blood_type: null,
      estimated_units_impact: 10,
      time_to_execute_minutes: 10,
      confidence_pct: 91,
      projected_score_delta: 15,
      requires_role: [HOSPITAL_ROLES.MEDICAL_DIRECTOR],
    },
    {
      action_id: 'ACT-DEM-002',
      category: 'demand_reduction',
      description: 'Restrict O-negative to triage level 1 patients only',
      target_blood_type: 'O-',
      estimated_units_impact: 5,
      time_to_execute_minutes: 5,
      confidence_pct: 96,
      projected_score_delta: 8,
      requires_role: [HOSPITAL_ROLES.BLOOD_BANK_COORDINATOR, HOSPITAL_ROLES.MEDICAL_DIRECTOR],
    },
    {
      action_id: 'ACT-ESC-001',
      category: 'escalation',
      description: 'Activate hospital emergency blood protocol',
      target_blood_type: null,
      estimated_units_impact: 30,
      time_to_execute_minutes: 20,
      confidence_pct: 82,
      projected_score_delta: 25,
      requires_role: [HOSPITAL_ROLES.MEDICAL_DIRECTOR, HOSPITAL_ROLES.HOSPITAL_ADMINISTRATOR],
    },
  ];

  if (crisisScore < 60) {
    return templates.map((t) => ({
      ...t,
      priority_score: Number(((t.estimated_units_impact * t.confidence_pct / 100) / Math.max(1, t.time_to_execute_minutes)).toFixed(3)),
      status: 'pending',
      taken_by: null,
      taken_at: null,
    }));
  }

  return templates
    .map((t) => ({
      ...t,
      priority_score: Number(((t.estimated_units_impact * t.confidence_pct / 100) / Math.max(1, t.time_to_execute_minutes)).toFixed(3)),
      status: 'pending',
      taken_by: null,
      taken_at: null,
    }))
    .sort((a, b) => b.priority_score - a.priority_score);
}

export function getProjectedScore(currentScore, actions) {
  const reduction = actions.filter((a) => a.status === 'taken').reduce((sum, a) => sum + (a.projected_score_delta || 0), 0);
  return clamp(currentScore - reduction, 0, 100);
}

export function takeAction(actions, actionId, user, crisisState) {
  const action = actions.find((a) => a.action_id === actionId);
  if (!action) return { ok: false, reason: 'Action not found', actions };

  if (!action.requires_role.includes(user.role)) {
    AuditLogger.log(
      CRISIS_AUDIT_EVENTS.ROLE_ACCESS_DENIED,
      user,
      crisisState,
      { action_id: actionId, allowed_roles: action.requires_role },
      'failed'
    );
    return { ok: false, reason: `Requires ${action.requires_role.join(', ')}`, actions };
  }

  const updated = actions.map((a) => {
    if (a.action_id !== actionId) return a;
    return {
      ...a,
      status: 'taken',
      taken_by: { user_id: user.id, name: user.name, role: user.role },
      taken_at: new Date().toISOString(),
    };
  });

  const taken = updated.find((a) => a.action_id === actionId);
  AuditLogger.log(CRISIS_AUDIT_EVENTS.ACTION_TAKEN, user, crisisState, { action: taken, event: 'action_taken' });
  return { ok: true, actions: updated };
}

const alertCooldown = {
  WATCH: 30 * 60 * 1000,
  WARNING: 20 * 60 * 1000,
  CRITICAL: 10 * 60 * 1000,
};

const lastSentBySeverity = { WATCH: 0, WARNING: 0, CRITICAL: 0 };

function selectSeverity(score) {
  if (score >= 81) return 'CRITICAL';
  if (score >= 61) return 'WARNING';
  if (score >= 31) return 'WATCH';
  return null;
}

function recipientDirectory() {
  return [
    { user_id: 'u-bbc', name: 'On Duty Coordinator', role: HOSPITAL_ROLES.BLOOD_BANK_COORDINATOR, channel: ['IN_APP', 'EMAIL', 'SMS'] },
    { user_id: 'u-ha', name: 'Hospital Administrator', role: HOSPITAL_ROLES.HOSPITAL_ADMINISTRATOR, channel: ['IN_APP', 'EMAIL'] },
    { user_id: 'u-md', name: 'Medical Director', role: HOSPITAL_ROLES.MEDICAL_DIRECTOR, channel: ['IN_APP', 'EMAIL', 'SMS'] },
    { user_id: 'u-dh', name: 'Department Head', role: HOSPITAL_ROLES.DEPARTMENT_HEAD, channel: ['IN_APP'] },
    { user_id: 'u-scm', name: 'Supply Chain Manager', role: HOSPITAL_ROLES.SUPPLY_CHAIN_MANAGER, channel: ['IN_APP', 'EMAIL'] },
    { user_id: 'u-it', name: 'IT Admin', role: HOSPITAL_ROLES.IT_ADMIN, channel: ['IN_APP'] },
  ];
}

function routeRecipients(severity) {
  const users = recipientDirectory();
  if (severity === 'WATCH') {
    return users.filter((u) => u.role === HOSPITAL_ROLES.BLOOD_BANK_COORDINATOR);
  }
  if (severity === 'WARNING') {
    return users.filter((u) => u.role === HOSPITAL_ROLES.BLOOD_BANK_COORDINATOR || u.role === HOSPITAL_ROLES.MEDICAL_DIRECTOR);
  }
  return users.filter((u) => u.role !== HOSPITAL_ROLES.IT_ADMIN);
}

export function buildAlert(crisisScore, criticalBloodTypes, message, previousSeverity = null) {
  const severity = selectSeverity(crisisScore);
  if (!severity) return null;

  const now = Date.now();
  const cooldown = alertCooldown[severity];
  const canSend = previousSeverity !== severity && (!previousSeverity || severityOrder[severity] > severityOrder[previousSeverity])
    ? true
    : now - lastSentBySeverity[severity] > cooldown;

  if (!canSend) return null;

  lastSentBySeverity[severity] = now;
  const recipients = routeRecipients(severity);
  recipients.forEach((r) => {
    if (r.channel.includes('EMAIL')) {
      console.log(`[EMAIL] ${severity} to ${r.name}: ${message}`);
    }
    if (r.channel.includes('SMS')) {
      console.log(`[SMS] ${severity} to ${r.name}: ${message}`);
    }
  });

  return {
    alert_id: `alert-${now}`,
    severity,
    crisis_score: crisisScore,
    critical_blood_types: criticalBloodTypes,
    message,
    timestamp: new Date().toISOString(),
    recipients,
    acknowledged: false,
    acknowledged_by: null,
  };
}

export function shouldTriggerBrief({ crisisScore, imminentShortageTypes, cascadeDepth, lastBrief, lastScore }) {
  const hardTrigger = crisisScore >= 75 || imminentShortageTypes.length > 0 || cascadeDepth >= 2;
  if (!hardTrigger) return false;
  if (!lastBrief) return true;
  const ageMs = Date.now() - new Date(lastBrief.generated_at).getTime();
  if (ageMs > 15 * 60 * 1000) return true;
  return crisisScore - (lastScore || 0) >= 10;
}

function buildFallbackBrief(payload) {
  const typeText = payload.critical_types.length ? payload.critical_types.join(', ') : 'O-, AB-';
  return [
    `SITUATION: Current crisis score is ${payload.crisis_score} with immediate stress on ${typeText}; available stock is below safety for key components.`,
    `CAUSE: Elevated ER triage load and pending high-risk surgeries are consuming units faster than replenishment.`,
    `TIME TO CRITICAL: Without intervention, irreversible shortage risk starts within the next ${Math.max(1, Math.round(payload.pressure_2h_total / 6))} hours.`,
    `ACTION 1: Initiate inter-hospital transfer for O-negative and A-positive units immediately.`,
    `ACTION 2: Restrict universal donor usage to triage level one and active massive transfusion cases.`,
    `ACTION 3: Activate emergency blood protocol and escalate to regional authority if transfer is delayed beyond 45 minutes.`,
  ].join('\n');
}

async function anthropicBrief(promptPayload) {
  const key = process.env.REACT_APP_ANTHROPIC_API_KEY;
  if (!key) {
    return buildFallbackBrief(promptPayload);
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      stream: false,
      system: 'You are a blood bank crisis coordinator AI in a hospital management system. Generate a crisis brief for the duty coordinator. Use this exact format - plain text only, no markdown: SITUATION: [one sentence - what is happening, specific blood types and unit counts] CAUSE: [one sentence - root cause from the data] TIME TO CRITICAL: [one sentence - when does it become irreversible] ACTION 1: [most impactful action - start with a verb, be specific] ACTION 2: [second action - start with a verb] ACTION 3: [contingency if Action 1 fails - start with a verb] Be specific. Use blood type names in full (O-negative not O-). State exact unit counts. No jargon. Calm and precise tone.',
      messages: [{ role: 'user', content: JSON.stringify(promptPayload) }],
    }),
  });

  if (!res.ok) {
    return buildFallbackBrief(promptPayload);
  }
  const data = await res.json();
  const text = data?.content?.[0]?.text || '';
  return text || buildFallbackBrief(promptPayload);
}

export async function generateCrisisBrief(input, user, crisisState) {
  const start = performance.now();
  const text = await anthropicBrief(input);
  const responseMs = Math.round(performance.now() - start);
  const brief = {
    brief_id: `brief-${Date.now()}`,
    generated_at: new Date().toISOString(),
    crisis_score_at_generation: input.crisis_score,
    text,
    is_streaming: false,
    signal_count: [input.crisis_score >= 75, input.imminent_shortage_types.length > 0].filter(Boolean).length,
    acknowledged_by: null,
    acknowledged_at: null,
    actions_confirmed: [],
    response_ms: responseMs,
  };

  AuditLogger.log(CRISIS_AUDIT_EVENTS.AI_BRIEF_GENERATED, user, crisisState, { brief_id: brief.brief_id, response_ms: responseMs });
  return brief;
}

export function acknowledgeCrisisBrief(brief, user, actions_confirmed, crisisState) {
  const updated = {
    ...brief,
    acknowledged_by: user.name,
    acknowledged_at: new Date().toISOString(),
    actions_confirmed,
  };
  AuditLogger.log(CRISIS_AUDIT_EVENTS.AI_BRIEF_ACKNOWLEDGED, user, crisisState, {
    brief_id: brief.brief_id,
    actions_confirmed,
  });
  return updated;
}

export function acknowledgeAlert(alert, user, crisisState) {
  const updated = { ...alert, acknowledged: true, acknowledged_by: user.name };
  AuditLogger.log(CRISIS_AUDIT_EVENTS.ALERT_ACKNOWLEDGED, user, crisisState, { alert_id: alert.alert_id });
  return updated;
}

export function scheduleCriticalEscalation(alert, onEscalate, crisisState) {
  if (!alert || alert.severity !== 'CRITICAL') return () => {};
  const timer = setTimeout(() => {
    if (alert.acknowledged) return;
    const escalated = {
      ...alert,
      alert_id: `${alert.alert_id}-esc`,
      message: `UNACKNOWLEDGED ESCALATION: ${alert.message}`,
      recipients: [...alert.recipients],
      timestamp: new Date().toISOString(),
    };
    onEscalate(escalated);
    AuditLogger.log(
      CRISIS_AUDIT_EVENTS.ALERT_ESCALATED,
      { id: 'system', name: 'System Router', role: 'SYSTEM' },
      crisisState,
      { alert_id: alert.alert_id, escalated_alert_id: escalated.alert_id }
    );
  }, 15 * 60 * 1000);
  return () => clearTimeout(timer);
}
