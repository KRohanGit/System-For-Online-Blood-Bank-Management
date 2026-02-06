/**
 * Dummy Data Service for Doctor Clinical Features
 * 
 * Provides mock data for:
 * - Clinical Load & Burnout Guard
 * - Emergency Decision Justification & Defense Log
 * 
 * TODO: Replace with real API calls when backend is ready
 */

// ============================================
// CLINICAL LOAD DATA
// ============================================

/**
 * Get current clinical load metrics for the logged-in doctor
 * Returns real-time load indicators
 */
export const getClinicalLoadMetrics = () => {
  // Simulate different load scenarios based on time of day
  const hour = new Date().getHours();
  
  // Peak hours (10am-2pm, 6pm-10pm) show higher load
  const isPeakHour = (hour >= 10 && hour <= 14) || (hour >= 18 && hour <= 22);
  
  return {
    emergencyConsults1Hour: isPeakHour ? 4 : 1,
    validationsToday: isPeakHour ? 12 : 5,
    continuousOnCallHours: isPeakHour ? 7.5 : 3.2,
    lastBreakTime: isPeakHour ? '6 hours ago' : '2 hours ago',
    upcomingShiftEnd: isPeakHour ? '4 hours' : '8 hours',
    lastUpdated: new Date().toISOString()
  };
};

/**
 * Calculate Clinical Load Score using rule-based logic
 * Returns: { score: 0-100, status: 'LOW'|'MODERATE'|'HIGH', recommendation: string }
 */
export const calculateClinicalLoadScore = (metrics) => {
  let score = 0;
  let reasons = [];
  
  // Factor 1: Emergency Consults (weight: 40%)
  if (metrics.emergencyConsults1Hour >= 5) {
    score += 40;
    reasons.push('High emergency consult volume');
  } else if (metrics.emergencyConsults1Hour >= 3) {
    score += 25;
    reasons.push('Moderate emergency consult load');
  } else if (metrics.emergencyConsults1Hour >= 1) {
    score += 10;
  }
  
  // Factor 2: Daily Validations (weight: 30%)
  if (metrics.validationsToday >= 15) {
    score += 30;
    reasons.push('High daily validation count');
  } else if (metrics.validationsToday >= 8) {
    score += 20;
    reasons.push('Moderate validation workload');
  } else if (metrics.validationsToday >= 4) {
    score += 10;
  }
  
  // Factor 3: Continuous On-Call Duration (weight: 30%)
  if (metrics.continuousOnCallHours >= 8) {
    score += 30;
    reasons.push('Extended on-call duration');
  } else if (metrics.continuousOnCallHours >= 6) {
    score += 20;
    reasons.push('Long on-call hours');
  } else if (metrics.continuousOnCallHours >= 4) {
    score += 10;
  }
  
  // Determine status and recommendation
  let status, recommendation, color;
  
  if (score >= 60) {
    status = 'HIGH';
    color = '#e74c3c';
    recommendation = '⚠️ Critical Load: Route new emergencies to another available doctor. Consider taking a break.';
  } else if (score >= 35) {
    status = 'MODERATE';
    color = '#f39c12';
    recommendation = '⚡ Moderate Load: Monitor workload closely. Prepare for potential handover.';
  } else {
    status = 'LOW';
    color = '#27ae60';
    recommendation = '✅ Optimal Load: Operating within safe capacity. Ready for new cases.';
  }
  
  return {
    score: Math.min(score, 100),
    status,
    color,
    recommendation,
    reasons: reasons.length > 0 ? reasons : ['Normal operating conditions']
  };
};

// ============================================
// CLINICAL DECISION LOG DATA
// ============================================

/**
 * Dummy decision log entries
 * In production, this would fetch from MongoDB
 */
const DUMMY_DECISIONS = [
  {
    _id: 'dec_001',
    actionType: 'APPROVED',
    caseType: 'Blood Unit Validation',
    caseId: 'BU-2026-0205-001',
    patientInitials: 'R.K.',
    justification: 'Patient hemoglobin levels are within acceptable range. No contraindications found. Medical history reviewed ',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    doctorId: 'DR-2024-001',
    linkedRecords: ['PAT-001', 'UNIT-1234']
  },
  {
    _id: 'dec_002',
    actionType: 'REJECTED',
    caseType: 'Emergency Consult',
    caseId: 'EC-2026-0205-089',
    patientInitials: 'S.M.',
    justification: 'Patient recently received blood transfusion 18 days ago.',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    doctorId: 'DR-2024-001',
    linkedRecords: ['PAT-045', 'PREV-TRANS-2025-12']
  },
  {
    _id: 'dec_003',
    actionType: 'DOWNGRADED',
    caseType: 'Emergency Urgency',
    caseId: 'EMG-2026-0205-012',
    patientInitials: 'A.P.',
    justification: 'Initial assessment marked as CRITICAL. Upon detailed review, patient vitals stable (BP: 120/80, HR: 78).',
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
    doctorId: 'DR-2024-001',
    linkedRecords: ['EMG-012', 'HOSP-ALT-789']
  },
  {
    _id: 'dec_004',
    actionType: 'APPROVED',
    caseType: 'Camp Blood Unit',
    caseId: 'CAMP-VZG-2026-234',
    patientInitials: 'D.R.',
    justification: 'Donor screening completed successfully. Pre-donation vitals normal (BP: 118/76, temp: 98.4°F, pulse: 72 bpm).',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    doctorId: 'DR-2024-001',
    linkedRecords: ['DONOR-234', 'CAMP-VZG-001']
  },
  {
    _id: 'dec_005',
    actionType: 'CANCELLED',
    caseType: 'Emergency Consult',
    caseId: 'EC-2026-0204-156',
    patientInitials: 'M.L.',
    justification: 'Patient family confirmed blood unit sourced from alternative hospital network (Apollo Blood Bank). ',
    timestamp: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(), // 30 hours ago
    doctorId: 'DR-2024-001',
    linkedRecords: ['PAT-156', 'ALT-HOSP-APOLLO']
  }
];

/**
 * Get recent clinical decisions for the logged-in doctor
 * @param {number} limit - Number of recent decisions to return (default: 5)
 * @returns {Array} Array of decision objects
 */
export const getRecentDecisions = (limit = 5) => {
  // In production: const response = await api.get(`/doctor/decisions?limit=${limit}`);
  return DUMMY_DECISIONS.slice(0, limit);
};

/**
 * Get full decision log with pagination
 * @param {number} page - Page number (default: 1)
 * @param {number} pageSize - Items per page (default: 20)
 * @returns {Object} { decisions: Array, total: number, page: number }
 */
export const getFullDecisionLog = (page = 1, pageSize = 20) => {
  // In production: const response = await api.get(`/doctor/decisions?page=${page}&limit=${pageSize}`);
  
  // Simulate pagination
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  
  return {
    decisions: DUMMY_DECISIONS.slice(startIndex, endIndex),
    total: DUMMY_DECISIONS.length,
    page,
    pageSize,
    totalPages: Math.ceil(DUMMY_DECISIONS.length / pageSize)
  };
};

/**
 * Submit a new clinical decision (for future use)
 * @param {Object} decisionData - { actionType, caseType, caseId, justification }
 * @returns {Object} Saved decision object
 */
export const submitClinicalDecision = async (decisionData) => {
  // TODO: Implement POST /api/doctor/decisions
  console.log('📝 Clinical Decision Submitted:', decisionData);
  
  // Simulate API response
  return {
    success: true,
    message: 'Decision logged successfully',
    data: {
      _id: `dec_${Date.now()}`,
      ...decisionData,
      timestamp: new Date().toISOString(),
      doctorId: 'DR-2024-001' // From auth context in production
    }
  };
};

/**
 * Format timestamp for display
 */
export const formatDecisionTime = (timestamp) => {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now - then;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffHours < 1) {
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return `${diffMins} minutes ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hours ago`;
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return then.toLocaleDateString();
  }
};
