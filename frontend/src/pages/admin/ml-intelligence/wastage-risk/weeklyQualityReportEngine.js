import { WASTAGE_AUDIT_EVENTS, WASTAGE_FEATURE_KEYS } from './constants';
import WasteAuditLogger from './auditLogger';
import { assertFeatureAccess } from './rbac';
import { createId } from './utils';

function buildFallbackNarrative(data) {
  return [
    'EXECUTIVE SUMMARY',
    `Weekly assessment covered ${data.portfolio_risk.total_units_assessed} units with ${data.portfolio_risk.critical_risk_units} critical-risk units and ${data.portfolio_risk.high_risk_units} high-risk units.`,
    'KEY FINDINGS THIS WEEK',
    `FIFO compliance is ${data.fifo_compliance.overall_pct}% with worst ward ${data.fifo_compliance.worst_ward} at ${data.fifo_compliance.worst_ward_pct}%.`,
    `Over-ordering anomaly rate is ${data.over_ordering.anomaly_rate_pct}% and caused ${data.over_ordering.waste_from_over_ordering_usd} USD waste this week.`,
    'ROOT CAUSE ANALYSIS',
    `Top cost driver is ${data.financial.top_cost_driver} (${data.financial.top_cost_driver_pct}%). Active bottlenecks: ${data.donor_flow.active_bottlenecks.join(', ') || 'none'}.`,
    'FINANCIAL IMPACT',
    `Actual waste this week is ${data.financial.actual_waste_this_week_usd} USD and projected month total is ${data.financial.projected_month_total_usd} USD.`,
    'RECOMMENDED ACTIONS THIS WEEK (ranked 1-3)',
    '1) BLOOD_BANK_COORDINATOR to execute all today-priority transfers within 24h, expected benefit based on transfer savings log.',
    '2) BLOOD_BANK_QUALITY_MANAGER to run FIFO retraining for worst ward within 72h, expected reduction in violation-linked waste.',
    '3) SUPPLY_CHAIN_MANAGER to apply optimal order quantities before next order cycle, expected reduction in over-order losses.',
    'TREND OUTLOOK',
    `Week trend is ${data.fifo_compliance.trend}; projected variance vs target is ${data.financial.vs_target_usd} USD.`,
  ].join('\n');
}

export class WeeklyQualityReportEngine {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.REACT_APP_ANTHROPIC_API_KEY;
    this.model = 'claude-sonnet-4-20250514';
    this.reportHistory = [];
    this.lastManualGenerationDate = null;
  }

  async callAnthropic(dataSnapshot) {
    if (!this.apiKey) {
      return buildFallbackNarrative(dataSnapshot);
    }

    const systemPrompt =
      'You are a blood bank quality analyst AI embedded in a hospital management system. ' +
      'Write plain text with exact section headers: EXECUTIVE SUMMARY, KEY FINDINGS THIS WEEK, ROOT CAUSE ANALYSIS, FINANCIAL IMPACT, RECOMMENDED ACTIONS THIS WEEK (ranked 1-3), TREND OUTLOOK. ' +
      'Use specific numbers, no jargon, max 600 words, do not mention model names.';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 800,
        stream: false,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: JSON.stringify(dataSnapshot),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error('Anthropic report generation failed');
    }

    const json = await response.json();
    const text = (json?.content || []).map((part) => part?.text || '').join('\n').trim();
    return text || buildFallbackNarrative(dataSnapshot);
  }

  canGenerateManually(requestedByRole) {
    const today = new Date().toISOString().slice(0, 10);
    if (this.lastManualGenerationDate === today) return false;
    return requestedByRole === 'BLOOD_BANK_QUALITY_MANAGER' || requestedByRole === 'HOSPITAL_ADMINISTRATOR';
  }

  async generateReport(input, options = {}) {
    const generatedBy = options.generated_by || 'scheduled';
    const requestedBy = options.requested_by || null;
    const requestedByRole = options.requested_by_role || null;

    if (generatedBy === 'manual') {
      assertFeatureAccess(requestedByRole, WASTAGE_FEATURE_KEYS.WEEKLY_REPORT_GENERATE, 'Weekly report generation denied');
      if (!this.canGenerateManually(requestedByRole)) {
        throw new Error('Manual report generation limit reached for today');
      }
      this.lastManualGenerationDate = new Date().toISOString().slice(0, 10);
    }

    const reportText = await this.callAnthropic(input);

    const report = {
      report_id: createId('WQR'),
      generated_at: new Date().toISOString(),
      week_ending: input.week_ending,
      generated_by: generatedBy,
      requested_by: requestedBy,
      report_text: reportText,
      data_snapshot: input,
      acknowledged_by: [],
      acknowledged_at: null,
      actions_committed: [],
      api_metadata: {
        model: this.model,
        max_tokens: 800,
        stream: false,
      },
    };

    this.reportHistory.unshift(report);
    WasteAuditLogger.log(WASTAGE_AUDIT_EVENTS.WASTE_REPORT_GENERATED, { id: requestedBy || 'system', role: requestedByRole || 'SYSTEM' }, {
      report_id: report.report_id,
      generated_by: generatedBy,
    });

    return report;
  }

  getReportHistory(count = 4, role = 'BLOOD_BANK_QUALITY_MANAGER') {
    assertFeatureAccess(role, WASTAGE_FEATURE_KEYS.WEEKLY_REPORT_VIEW, 'Weekly report view denied');
    return this.reportHistory.slice(0, count);
  }

  commitToAction(reportId, actionIndex, user, dueDate) {
    assertFeatureAccess(user.role, WASTAGE_FEATURE_KEYS.WEEKLY_REPORT_COMMIT, 'Commit action denied');
    const report = this.reportHistory.find((r) => r.report_id === reportId);
    if (!report) throw new Error('Report not found');

    const lines = report.report_text.split('\n').filter(Boolean);
    const recommendedLines = lines.filter((line) => /^\d\)/.test(line));
    const selected = recommendedLines[actionIndex];
    if (!selected) throw new Error('Action index out of range');

    report.actions_committed.push({
      action_text: selected,
      committed_by: user.id,
      committed_by_role: user.role,
      due_date: new Date(dueDate).toISOString(),
      completed: false,
    });

    WasteAuditLogger.log(WASTAGE_AUDIT_EVENTS.QUALITY_ACTION_COMMITTED, user, {
      report_id: reportId,
      action_index: actionIndex,
      due_date: dueDate,
    });

    return report;
  }

  markActionCompleted(reportId, actionIndex, user) {
    const report = this.reportHistory.find((r) => r.report_id === reportId);
    if (!report) throw new Error('Report not found');

    const action = report.actions_committed[actionIndex];
    if (!action) throw new Error('Action not found');

    action.completed = true;
    WasteAuditLogger.log(WASTAGE_AUDIT_EVENTS.QUALITY_ACTION_COMPLETED, user, {
      report_id: reportId,
      action_index: actionIndex,
    });
    return action;
  }

  getActionCompletionRate() {
    const actions = this.reportHistory.flatMap((r) => r.actions_committed || []);
    if (!actions.length) return 0;
    const completed = actions.filter((a) => a.completed).length;
    return Number(((completed / actions.length) * 100).toFixed(1));
  }

  exportReport(reportId, role = 'HOSPITAL_ADMINISTRATOR') {
    assertFeatureAccess(role, WASTAGE_FEATURE_KEYS.EXPORT, 'Report export denied');
    const report = this.reportHistory.find((r) => r.report_id === reportId);
    if (!report) throw new Error('Report not found');

    const pseudoPdf = [
      'WEEKLY QUALITY REPORT',
      `Report ID: ${report.report_id}`,
      `Generated At: ${report.generated_at}`,
      '',
      report.report_text,
    ].join('\n');

    return pseudoPdf;
  }
}

export default WeeklyQualityReportEngine;
