const STORAGE_KEY = 'crisis_audit_log';

function nowIso() {
  return new Date().toISOString();
}

function uid(prefix = 'log') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readLogs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLogs(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

class CrisisAuditLogger {
  log(event_type, performed_by, crisis_state_snapshot, details = {}, outcome = 'success') {
    const entry = {
      log_id: uid('audit'),
      event_type,
      timestamp: nowIso(),
      performed_by: {
        user_id: performed_by?.id || performed_by?.user_id || 'unknown',
        name: performed_by?.name || 'Unknown',
        role: performed_by?.role || 'UNKNOWN',
        ip_address: performed_by?.ip_address || '0.0.0.0',
      },
      crisis_state_snapshot: {
        crisis_score: crisis_state_snapshot?.crisis_score ?? 0,
        severity: crisis_state_snapshot?.severity || 'SAFE',
        critical_types: crisis_state_snapshot?.critical_types || [],
      },
      details,
      outcome,
    };
    const logs = readLogs();
    logs.push(entry);
    writeLogs(logs);
    return entry;
  }

  query(filters = {}) {
    const logs = readLogs();
    return logs.filter((entry) => {
      if (filters.role && entry.performed_by.role !== filters.role) return false;
      if (filters.event_type && entry.event_type !== filters.event_type) return false;
      if (filters.date_range?.from) {
        if (new Date(entry.timestamp).getTime() < new Date(filters.date_range.from).getTime()) return false;
      }
      if (filters.date_range?.to) {
        if (new Date(entry.timestamp).getTime() > new Date(filters.date_range.to).getTime()) return false;
      }
      return true;
    });
  }

  export(filters = {}) {
    const rows = this.query(filters);
    const headers = ['log_id', 'event_type', 'timestamp', 'user_id', 'name', 'role', 'ip_address', 'crisis_score', 'severity', 'critical_types', 'outcome', 'details'];
    const csv = [headers.join(',')];
    rows.forEach((r) => {
      csv.push([
        r.log_id,
        r.event_type,
        r.timestamp,
        r.performed_by.user_id,
        `"${r.performed_by.name}"`,
        r.performed_by.role,
        r.performed_by.ip_address,
        r.crisis_state_snapshot.crisis_score,
        r.crisis_state_snapshot.severity,
        `"${(r.crisis_state_snapshot.critical_types || []).join('|')}"`,
        r.outcome,
        `"${JSON.stringify(r.details).replace(/"/g, '""')}"`,
      ].join(','));
    });
    return csv.join('\n');
  }
}

const AuditLogger = new CrisisAuditLogger();

export const CRISIS_AUDIT_EVENTS = {
  CRISIS_SCORE_CALCULATED: 'CRISIS_SCORE_CALCULATED',
  ALERT_FIRED: 'ALERT_FIRED',
  ALERT_ACKNOWLEDGED: 'ALERT_ACKNOWLEDGED',
  ALERT_ESCALATED: 'ALERT_ESCALATED',
  AI_BRIEF_GENERATED: 'AI_BRIEF_GENERATED',
  AI_BRIEF_ACKNOWLEDGED: 'AI_BRIEF_ACKNOWLEDGED',
  ACTION_TAKEN: 'ACTION_TAKEN',
  ACTION_SKIPPED: 'ACTION_SKIPPED',
  EMERGENCY_PROTOCOL_ACTIVATED: 'EMERGENCY_PROTOCOL_ACTIVATED',
  REORDER_INITIATED: 'REORDER_INITIATED',
  ROLE_ACCESS_DENIED: 'ROLE_ACCESS_DENIED',
  SESSION_STARTED: 'SESSION_STARTED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  REPORT_EXPORTED: 'REPORT_EXPORTED',
  MANUAL_SCORE_OVERRIDE: 'MANUAL_SCORE_OVERRIDE',
};

export default AuditLogger;
