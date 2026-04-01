import { WASTAGE_AUDIT_EVENTS } from './constants';

const STORAGE_KEY = 'wastage_risk_audit_log';

function uid(prefix = 'waste-audit') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function readEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

class WastageAuditLogger {
  log(eventType, performedBy, details = {}, outcome = 'success') {
    const entry = {
      log_id: uid(),
      event_type: eventType,
      timestamp: new Date().toISOString(),
      performed_by: {
        user_id: performedBy?.id || performedBy?.user_id || 'unknown',
        role: performedBy?.role || 'UNKNOWN',
        name: performedBy?.name || 'Unknown User',
      },
      details,
      outcome,
    };

    const logs = readEntries();
    logs.push(entry);
    writeEntries(logs);
    return entry;
  }

  query(filters = {}) {
    return readEntries().filter((entry) => {
      if (filters.event_type && entry.event_type !== filters.event_type) return false;
      if (filters.role && entry.performed_by.role !== filters.role) return false;
      if (filters.from && new Date(entry.timestamp).getTime() < new Date(filters.from).getTime()) return false;
      if (filters.to && new Date(entry.timestamp).getTime() > new Date(filters.to).getTime()) return false;
      return true;
    });
  }
}

const WasteAuditLogger = new WastageAuditLogger();

export { WASTAGE_AUDIT_EVENTS };
export default WasteAuditLogger;
