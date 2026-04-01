import {
  BLOOD_TYPE_DEMAND_RATE,
  COMPONENT_SHELF_LIFE_DAYS,
  LOCATION_FACTOR,
  WASTAGE_FEATURE_KEYS,
} from './constants';
import { assertFeatureAccess } from './rbac';
import {
  classifyWasteRiskBySurvivalToday,
  clamp,
  getUnitCostUsd,
  isRareType,
  toCyclicalDow,
} from './utils';

function componentHazardMultiplier(component, ageDays) {
  if (component === 'platelets') {
    if (ageDays > 3) return 2.8;
    return 1.8;
  }
  if (component === 'red_cells') {
    if (ageDays > 28) return 1.4;
    return 1.0;
  }
  if (component === 'plasma') return 0.35;
  if (component === 'cryo') return 0.4;
  return 1.0;
}

function weekendPenalty(dayOfWeek) {
  // Friday/Saturday consumption drop raises expiry hazard.
  if (dayOfWeek === 5 || dayOfWeek === 6) return 1.2;
  return 1.0;
}

export class SurvivalAnalysisEngine {
  constructor(options = {}) {
    this.baselineHazard = options.baselineHazard || 0.48;
    this.ageCoefficient = options.ageCoefficient || 0.08;
  }

  computeHazard(unit, referenceDate = new Date()) {
    const { dayOfWeek, sin, cos } = toCyclicalDow(referenceDate);
    const demandRate = BLOOD_TYPE_DEMAND_RATE[unit.blood_type] || 0.2;
    const location = LOCATION_FACTOR[unit.current_location] || 0.8;
    const agePenalty = Math.max(0, unit.age_days - 28) * this.ageCoefficient;
    const rarityPenalty = isRareType(unit.blood_type) ? 0.42 : 0;
    const cyclicalPenalty = (1 - sin) * 0.06 + (1 - cos) * 0.03;

    const linear =
      this.baselineHazard +
      agePenalty -
      (demandRate * 1.7) -
      (location * 0.45) +
      rarityPenalty +
      cyclicalPenalty;

    const hazard = Math.exp(linear) * componentHazardMultiplier(unit.component, unit.age_days) * weekendPenalty(dayOfWeek);
    return clamp(hazard, 0.05, 6);
  }

  computeSurvivalCurve(unit, referenceDate = new Date()) {
    const points = [];
    const daysRemaining = Math.max(0, unit.days_remaining);
    const baseHazard = this.computeHazard(unit, referenceDate);

    for (let t = 0; t <= daysRemaining; t += 1) {
      const ageAtT = unit.age_days + t;
      const componentAdjusted = baseHazard * componentHazardMultiplier(unit.component, ageAtT);
      const survival = Math.exp(-componentAdjusted * (t + 1));
      points.push({
        days_from_now: t,
        survival_prob: Number(clamp(survival, 0.001, 0.999).toFixed(2)),
      });
    }

    return points;
  }

  recommendationForRisk(riskClass, unit) {
    if (riskClass === 'critical_risk') {
      return `Immediate redistribution from ${unit.current_location} within 4h; priority issue today`;
    }
    if (riskClass === 'high_risk') {
      return 'Move to high-throughput ward today and enforce strict FIFO pick order';
    }
    if (riskClass === 'medium_risk') {
      return 'Monitor in morning rounds and pre-assign to next likely compatible request';
    }
    return 'No immediate intervention required';
  }

  computeUnitRisk(unit, referenceDate = new Date()) {
    const curve = this.computeSurvivalCurve(unit, referenceDate);
    const survivalToday = curve[0]?.survival_prob ?? 0;
    const survivalByExpiry = curve[curve.length - 1]?.survival_prob ?? survivalToday;
    const wasteProbToday = Number((1 - survivalToday).toFixed(2));
    const wasteProbByExpiry = Number((1 - survivalByExpiry).toFixed(2));
    const riskClass = classifyWasteRiskBySurvivalToday(survivalToday);
    const estimatedValue = Number((wasteProbByExpiry * getUnitCostUsd(unit.blood_type, unit.component)).toFixed(2));

    return {
      unit_id: unit.unit_id,
      survival_curve: curve,
      waste_probability_today: wasteProbToday,
      waste_probability_by_expiry: wasteProbByExpiry,
      risk_class: riskClass,
      recommended_action: this.recommendationForRisk(riskClass, unit),
      estimated_waste_value_usd: estimatedValue,
    };
  }

  computePortfolioRisk(units, referenceDate = new Date()) {
    const risks = units.map((u) => this.computeUnitRisk(u, referenceDate));
    const byClass = risks.reduce((acc, r) => {
      acc[r.risk_class] = (acc[r.risk_class] || 0) + 1;
      return acc;
    }, { low_risk: 0, medium_risk: 0, high_risk: 0, critical_risk: 0 });

    const totalValue = risks.reduce((sum, r) => sum + r.estimated_waste_value_usd, 0);
    const expectedToday = risks.reduce((sum, r) => sum + r.waste_probability_today, 0);
    const expectedWeek = risks.reduce((sum, r) => {
      const day7 = r.survival_curve.find((p) => p.days_from_now === 7) || r.survival_curve[r.survival_curve.length - 1];
      return sum + (1 - (day7?.survival_prob || 0));
    }, 0);

    return {
      total_units_assessed: units.length,
      by_risk_class: byClass,
      total_value_at_risk_usd: Number(totalValue.toFixed(2)),
      highest_risk_units: [...risks]
        .sort((a, b) => b.waste_probability_by_expiry - a.waste_probability_by_expiry)
        .slice(0, 10),
      expected_waste_units_today: Number(expectedToday.toFixed(2)),
      expected_waste_units_this_week: Number(expectedWeek.toFixed(2)),
    };
  }

  getRoleScopedUnitRisk(unitRisk, role) {
    if (role === 'BLOOD_BANK_QUALITY_MANAGER' || role === 'BLOOD_BANK_COORDINATOR' || role === 'IT_ADMIN') {
      return unitRisk;
    }

    return {
      unit_id: unitRisk.unit_id,
      risk_class: unitRisk.risk_class,
      waste_probability_today: unitRisk.waste_probability_today,
      estimated_waste_value_usd: unitRisk.estimated_waste_value_usd,
    };
  }

  getRoleScopedPortfolio(portfolio, role) {
    if (role === 'HOSPITAL_ADMINISTRATOR') {
      return {
        total_units_assessed: portfolio.total_units_assessed,
        by_risk_class: portfolio.by_risk_class,
        total_value_at_risk_usd: portfolio.total_value_at_risk_usd,
      };
    }

    if (role === 'SUPPLY_CHAIN_MANAGER' || role === 'MEDICAL_DIRECTOR') {
      return {
        total_units_assessed: portfolio.total_units_assessed,
        by_risk_class: portfolio.by_risk_class,
        total_value_at_risk_usd: portfolio.total_value_at_risk_usd,
      };
    }

    return portfolio;
  }

  computeRoleAwareRisk(units, role, referenceDate = new Date()) {
    assertFeatureAccess(role, WASTAGE_FEATURE_KEYS.SURVIVAL_ANALYSIS, 'Survival analysis access denied');
    const portfolio = this.computePortfolioRisk(units, referenceDate);
    return this.getRoleScopedPortfolio(portfolio, role);
  }

  static computeDerivedUnitFields(unit, referenceDate = new Date()) {
    const storageStart = new Date(unit.storage_start_date);
    const expiryDate = new Date(unit.expiry_date);
    const ageDays = Math.max(0, Math.floor((referenceDate.getTime() - storageStart.getTime()) / (24 * 3600 * 1000)));
    const daysRemaining = Math.max(0, Math.floor((expiryDate.getTime() - referenceDate.getTime()) / (24 * 3600 * 1000)));

    return {
      ...unit,
      shelf_life_days: unit.shelf_life_days || COMPONENT_SHELF_LIFE_DAYS[unit.component] || 42,
      age_days: ageDays,
      days_remaining: daysRemaining,
    };
  }
}

export default SurvivalAnalysisEngine;
