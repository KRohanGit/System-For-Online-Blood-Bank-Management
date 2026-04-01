import { WASTAGE_FEATURE_KEYS, WASTAGE_RISK_ROLES } from './constants';

const F = WASTAGE_FEATURE_KEYS;
const R = WASTAGE_RISK_ROLES;

const featureAccess = {
  [F.SURVIVAL_ANALYSIS]: [
    R.BLOOD_BANK_QUALITY_MANAGER,
    R.BLOOD_BANK_COORDINATOR,
    R.HOSPITAL_ADMINISTRATOR,
    R.SUPPLY_CHAIN_MANAGER,
    R.MEDICAL_DIRECTOR,
  ],
  [F.UNIT_LEVEL_DETAIL]: [R.BLOOD_BANK_QUALITY_MANAGER, R.BLOOD_BANK_COORDINATOR],
  [F.FIFO_COMPLIANCE]: [R.BLOOD_BANK_QUALITY_MANAGER, R.HOSPITAL_ADMINISTRATOR],
  [F.FIFO_WARD_BREAKDOWN]: [R.BLOOD_BANK_QUALITY_MANAGER],
  [F.FIFO_STAFF_PATTERNS]: [R.BLOOD_BANK_QUALITY_MANAGER],
  [F.REDISTRIBUTION_VIEW]: Object.values(R),
  [F.REDISTRIBUTION_ACTIONS]: [R.BLOOD_BANK_QUALITY_MANAGER, R.BLOOD_BANK_COORDINATOR],
  [F.DONOR_FLOW]: [R.BLOOD_BANK_QUALITY_MANAGER, R.SUPPLY_CHAIN_MANAGER],
  [F.OVER_ORDERING]: [R.BLOOD_BANK_QUALITY_MANAGER, R.SUPPLY_CHAIN_MANAGER, R.HOSPITAL_ADMINISTRATOR],
  [F.FINANCIAL_FULL]: [R.BLOOD_BANK_QUALITY_MANAGER, R.HOSPITAL_ADMINISTRATOR],
  [F.FINANCIAL_SUMMARY]: Object.values(R),
  [F.WEEKLY_REPORT_GENERATE]: [R.BLOOD_BANK_QUALITY_MANAGER, R.HOSPITAL_ADMINISTRATOR],
  [F.WEEKLY_REPORT_VIEW]: Object.values(R),
  [F.WEEKLY_REPORT_COMMIT]: [R.BLOOD_BANK_QUALITY_MANAGER, R.HOSPITAL_ADMINISTRATOR],
  [F.EXPORT]: [R.BLOOD_BANK_QUALITY_MANAGER, R.HOSPITAL_ADMINISTRATOR, R.IT_ADMIN],
};

export function mapTokenRoleToWastageRole(tokenRole) {
  const role = String(tokenRole || '').toUpperCase();
  if (role === 'BLOOD_BANK_QUALITY_MANAGER') return R.BLOOD_BANK_QUALITY_MANAGER;
  if (role === 'HOSPITAL_ADMINISTRATOR' || role === 'HOSPITAL_ADMIN') return R.HOSPITAL_ADMINISTRATOR;
  if (role === 'SUPPLY_CHAIN_MANAGER') return R.SUPPLY_CHAIN_MANAGER;
  if (role === 'BLOOD_BANK_COORDINATOR') return R.BLOOD_BANK_COORDINATOR;
  if (role === 'MEDICAL_DIRECTOR') return R.MEDICAL_DIRECTOR;
  if (role === 'IT_ADMIN') return R.IT_ADMIN;
  return R.HOSPITAL_ADMINISTRATOR;
}

export function canAccessFeature(role, featureKey) {
  return (featureAccess[featureKey] || []).includes(role);
}

export function assertFeatureAccess(role, featureKey, message = 'Access denied') {
  if (!canAccessFeature(role, featureKey)) {
    throw new Error(`${message}: ${role} cannot access ${featureKey}`);
  }
}

export function getRoleFeatureMap(role) {
  const visible = Object.keys(featureAccess).filter((k) => canAccessFeature(role, k));
  return {
    role,
    visibleFeatures: visible,
  };
}
