import {
  BLOOD_TYPES,
  BLOOD_UNIT_BASE_COST_USD,
  COMPONENT_COST_ADJUSTMENT,
  COMPONENT_SHELF_LIFE_DAYS,
  RARE_TYPES,
  WASTE_RISK_THRESHOLDS,
} from './constants';

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

export function randomInt(min, max) {
  return Math.floor(randomBetween(min, max + 1));
}

export function choose(values) {
  return values[randomInt(0, values.length - 1)];
}

export function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function daysBetween(from, to) {
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return Math.max(0, Math.floor(ms / (24 * 3600 * 1000)));
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function bloodTypeCode(type) {
  return Math.max(0, BLOOD_TYPES.indexOf(type));
}

export function componentCode(component) {
  const order = ['red_cells', 'platelets', 'plasma', 'cryo'];
  return Math.max(0, order.indexOf(component));
}

export function getUnitCostUsd(bloodType, component) {
  const base = BLOOD_UNIT_BASE_COST_USD[bloodType] || 220;
  if (component === 'platelets') return base + COMPONENT_COST_ADJUSTMENT.platelets_surcharge;
  if (component === 'plasma') return base * COMPONENT_COST_ADJUSTMENT.plasma_discount;
  return base;
}

export function getShelfLifeDays(component) {
  return COMPONENT_SHELF_LIFE_DAYS[component] || 42;
}

export function isRareType(bloodType) {
  return RARE_TYPES.has(bloodType);
}

export function classifyWasteRiskBySurvivalToday(survivalToday) {
  if (survivalToday >= WASTE_RISK_THRESHOLDS.LOW_MIN) return 'low_risk';
  if (survivalToday >= WASTE_RISK_THRESHOLDS.MEDIUM_MIN) return 'medium_risk';
  if (survivalToday >= WASTE_RISK_THRESHOLDS.HIGH_MIN) return 'high_risk';
  return 'critical_risk';
}

export function toCyclicalDow(dateLike) {
  const d = new Date(dateLike).getDay();
  const angle = (2 * Math.PI * d) / 7;
  return { sin: Math.sin(angle), cos: Math.cos(angle), dayOfWeek: d };
}

export function mean(values) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function stdDev(values) {
  if (values.length <= 1) return 0;
  const m = mean(values);
  const v = mean(values.map((x) => (x - m) ** 2));
  return Math.sqrt(v);
}

export function pearsonCorrelation(x, y) {
  if (x.length !== y.length || x.length < 3) {
    return { r: 0, p_value: 1 };
  }
  const mx = mean(x);
  const my = mean(y);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < x.length; i += 1) {
    const ax = x[i] - mx;
    const ay = y[i] - my;
    num += ax * ay;
    dx += ax * ax;
    dy += ay * ay;
  }
  const denom = Math.sqrt(dx * dy) || 1;
  const r = num / denom;

  // Coarse p-value approximation for dashboard-level significance hint.
  const n = x.length;
  const t = Math.abs(r) * Math.sqrt((n - 2) / Math.max(1e-6, 1 - r * r));
  const p = clamp(Math.exp(-0.65 * t), 0.001, 1);
  return { r, p_value: p };
}

export function toMonthString(dateLike) {
  const d = new Date(dateLike);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function anonymiseStaff(staffId, shift) {
  return `${shift}_shift_coordinator_${String(staffId).slice(-2)}`;
}
