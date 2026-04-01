import {
  generateMockBloodUnitEvents,
  generateMockBloodUnits,
  generateMockDispensingTransactions,
  generateMockPurchaseOrders,
  generateMockWardConfigs,
  generateMockWasteRecords,
  generateMockWeeklyReportHistory,
} from './mockData';
import SurvivalAnalysisEngine from './survivalAnalysisEngine';
import FIFOComplianceMonitor from './fifoComplianceMonitor';
import RedistributionOptimiser from './redistributionOptimiser';
import DonorFlowAnalyser from './donorFlowAnalyser';
import OverOrderingDetector from './overOrderingDetector';
import FinancialWasteEngine from './financialWasteEngine';
import WeeklyQualityReportEngine from './weeklyQualityReportEngine';
import WasteAuditLogger, { WASTAGE_AUDIT_EVENTS } from './auditLogger';
import { WASTAGE_FEATURE_KEYS, WASTAGE_RISK_ROLES } from './constants';
import { assertFeatureAccess, mapTokenRoleToWastageRole } from './rbac';

export class WastageRiskModule {
  constructor(options = {}) {
    this.survivalEngine = new SurvivalAnalysisEngine(options.survival);
    this.fifoMonitor = new FIFOComplianceMonitor(options.fifo);
    this.redistributionOptimiser = new RedistributionOptimiser(options.redistribution);
    this.donorFlowAnalyser = new DonorFlowAnalyser(options.flow);
    this.overOrderingDetector = new OverOrderingDetector(options.overOrdering);
    this.financialEngine = new FinancialWasteEngine();
    this.weeklyReportEngine = new WeeklyQualityReportEngine(options.weeklyReport);

    this.seeded = false;
    this.units = [];
    this.transactions = [];
    this.wardConfigs = [];
    this.events = [];
    this.orders = [];
    this.wasteRecords = [];
  }

  seedMockData(now = new Date()) {
    this.units = generateMockBloodUnits(now);
    this.transactions = generateMockDispensingTransactions(this.units, now);
    this.wardConfigs = generateMockWardConfigs();
    this.events = generateMockBloodUnitEvents(this.units, now);
    this.orders = generateMockPurchaseOrders(now);
    this.wasteRecords = generateMockWasteRecords(now);
    this.weeklyReportEngine.reportHistory = generateMockWeeklyReportHistory(now);
    this.seeded = true;
    return {
      units: this.units.length,
      transactions: this.transactions.length,
      wards: this.wardConfigs.length,
      events: this.events.length,
      orders: this.orders.length,
      waste_records: this.wasteRecords.length,
    };
  }

  ensureSeeded() {
    if (!this.seeded) this.seedMockData();
  }

  resolveRole(tokenRole) {
    return mapTokenRoleToWastageRole(tokenRole);
  }

  runSurvivalAnalysis(role) {
    this.ensureSeeded();
    assertFeatureAccess(role, WASTAGE_FEATURE_KEYS.SURVIVAL_ANALYSIS);
    const unitRisks = this.units.map((u) => this.survivalEngine.computeUnitRisk(u));
    const portfolio = this.survivalEngine.computePortfolioRisk(this.units);

    return {
      portfolio: this.survivalEngine.getRoleScopedPortfolio(portfolio, role),
      unit_level: unitRisks.map((u) => this.survivalEngine.getRoleScopedUnitRisk(u, role)),
    };
  }

  runFifoCompliance(role, userContext = {}) {
    this.ensureSeeded();
    const report = this.fifoMonitor.analyseCompliance(this.transactions, 30);
    return {
      report: this.fifoMonitor.getRoleScopedComplianceReport(role, userContext),
      patterns: this.fifoMonitor.getViolationPatterns(role),
      correlations: role === WASTAGE_RISK_ROLES.BLOOD_BANK_QUALITY_MANAGER ? this.fifoMonitor.getWardCorrelations() : [],
      _raw: report,
    };
  }

  runRedistribution(role) {
    this.ensureSeeded();
    assertFeatureAccess(role, WASTAGE_FEATURE_KEYS.REDISTRIBUTION_VIEW);
    return this.redistributionOptimiser.runOptimisation(this.units, this.wardConfigs);
  }

  acceptTransfer(transferId, user) {
    this.ensureSeeded();
    return this.redistributionOptimiser.acceptTransfer(transferId, user, user.role, this.units);
  }

  rejectTransfer(transferId, user, reason) {
    this.ensureSeeded();
    return this.redistributionOptimiser.rejectTransfer(transferId, user, reason);
  }

  runDonorFlow(role) {
    this.ensureSeeded();
    this.donorFlowAnalyser.mineProcessModel(this.events);
    this.donorFlowAnalyser.computeFlowEfficiency(this.events);
    return this.donorFlowAnalyser.getRoleScopedFlow(role);
  }

  runOverOrdering(role) {
    this.ensureSeeded();
    this.overOrderingDetector.generateReport(this.orders, 90);
    return this.overOrderingDetector.getRoleScopedReport(role);
  }

  runFinancial(role) {
    this.ensureSeeded();
    const transferSaved = this.redistributionOptimiser.getDailyRecommendations().reduce((s, t) => s + (t.status === 'accepted' ? t.waste_value_saved_usd : 0), 0);

    this.financialEngine.generateDashboard(this.wasteRecords, {
      waste_prevented_this_month_usd: transferSaved || 1640,
      fifo_compliance_pct: 81.3,
      over_order_ratio: 1.92,
      flow_efficiency_score: 71.4,
      avg_age_on_storage: 3.1,
      demand_variance: 5.2,
    });

    return this.financialEngine.getRoleScopedDashboard(role);
  }

  async generateWeeklyReport(role, user, manual = false) {
    this.ensureSeeded();

    const survival = this.survivalEngine.computePortfolioRisk(this.units);
    const fifo = this.fifoMonitor.analyseCompliance(this.transactions, 7);
    const redistribution = this.redistributionOptimiser.lastRun || this.redistributionOptimiser.runOptimisation(this.units, this.wardConfigs);
    const donorFlow = this.donorFlowAnalyser.computeFlowEfficiency(this.events);
    const overOrder = this.overOrderingDetector.generateReport(this.orders, 7);
    const financial = this.financialEngine.generateDashboard(this.wasteRecords, {
      fifo_compliance_pct: fifo.overall.total_compliance_pct,
      over_order_ratio: 1.9,
      flow_efficiency_score: donorFlow.overall_efficiency_score,
      avg_age_on_storage: 3,
      demand_variance: 5,
    });

    const input = {
      week_ending: new Date().toISOString().slice(0, 10),
      portfolio_risk: {
        total_units_assessed: survival.total_units_assessed,
        critical_risk_units: survival.by_risk_class.critical_risk,
        high_risk_units: survival.by_risk_class.high_risk,
        total_value_at_risk_usd: survival.total_value_at_risk_usd,
        expected_waste_this_week_units: survival.expected_waste_units_this_week,
      },
      fifo_compliance: {
        overall_pct: fifo.overall.total_compliance_pct,
        worst_ward: fifo.by_ward.sort((a, b) => a.compliance_pct - b.compliance_pct)[0]?.ward || 'ward_b',
        worst_ward_pct: fifo.by_ward.sort((a, b) => a.compliance_pct - b.compliance_pct)[0]?.compliance_pct || 0,
        trend: 'worsening',
        estimated_waste_from_violations_usd: fifo.overall.estimated_waste_from_violations_usd,
      },
      redistribution: {
        recommendations_this_week: redistribution.total_transfers_recommended,
        accepted_count: redistribution.transfers.filter((t) => t.status === 'accepted').length,
        rejected_count: redistribution.transfers.filter((t) => t.status === 'rejected').length,
        waste_prevented_usd: redistribution.total_waste_value_saved_usd,
      },
      donor_flow: {
        flow_efficiency_score: donorFlow.overall_efficiency_score,
        active_bottlenecks: this.donorFlowAnalyser.getBottlenecks().map((b) => b.step),
        bottleneck_waste_impact_usd: 980,
      },
      over_ordering: {
        anomaly_rate_pct: overOrder.anomaly_rate_pct,
        over_ordered_units_this_week: overOrder.total_over_ordered_units,
        waste_from_over_ordering_usd: overOrder.over_order_waste_cost_usd,
        worst_blood_type: Object.entries(overOrder.by_blood_type).sort((a, b) => b[1].avg_over_order_ratio - a[1].avg_over_order_ratio)[0]?.[0] || 'AB-',
      },
      financial: {
        actual_waste_this_week_usd: 3650,
        projected_month_total_usd: financial.projected_waste_this_month_usd,
        vs_target_usd: financial.vs_budget_target_delta_usd,
        top_cost_driver: 'over_order_ratio',
        top_cost_driver_pct: 31,
      },
    };

    const report = await this.weeklyReportEngine.generateReport(input, {
      generated_by: manual ? 'manual' : 'scheduled',
      requested_by: user?.id || null,
      requested_by_role: role,
    });

    return report;
  }

  viewReportHistory(role, count = 4) {
    const reports = this.weeklyReportEngine.getReportHistory(count, role);
    WasteAuditLogger.log(WASTAGE_AUDIT_EVENTS.WASTE_REPORT_VIEWED, { id: 'viewer', role }, { count });
    return reports;
  }

  requestStaffPatternDeanonymisation(user, reason) {
    if (user.role !== WASTAGE_RISK_ROLES.BLOOD_BANK_QUALITY_MANAGER) {
      throw new Error('Only quality manager may request de-anonymised staff patterns');
    }

    if (!reason || reason.length < 8) {
      throw new Error('Reason is required for sensitive de-anonymisation');
    }

    WasteAuditLogger.log(WASTAGE_AUDIT_EVENTS.STAFF_PATTERN_DEANONYMISED, user, {
      reason,
      approved: true,
    });

    return { approved: true, reason };
  }
}

export default WastageRiskModule;
