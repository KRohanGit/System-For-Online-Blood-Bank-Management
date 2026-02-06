/**
 * Escalation Service
 * 
 * Handles automatic escalation of emergency requests
 * when partner hospitals don't respond in time
 */

const EmergencyRequest = require('../models/EmergencyRequest');
const { getEscalationHospitals } = require('./hospitalMatchingService');

// Escalation configuration (in minutes)
const ESCALATION_CONFIG = {
  LEVEL_1: 8,   // 8 minutes - notify 3 nearest hospitals
  LEVEL_2: 15,  // 15 minutes - notify all network hospitals
  LEVEL_3: 25   // 25 minutes - notify city health authority
};

/**
 * Check and escalate requests that need attention
 * Should be called periodically (every 2-3 minutes)
 */
async function checkAndEscalateRequests() {
  try {
    // Find requests that are pending response
    const pendingRequests = await EmergencyRequest.find({
      status: { $in: ['CREATED', 'MEDICAL_VERIFICATION_PENDING'] },
      escalationLevel: { $lt: 3 } // Not yet at max escalation
    });

    const now = new Date();
    const escalatedRequests = [];

    for (const request of pendingRequests) {
      const minutesElapsed = (now - request.createdAt) / 1000 / 60;

      // Determine if escalation is needed
      let shouldEscalate = false;
      let newLevel = request.escalationLevel;

      if (minutesElapsed >= ESCALATION_CONFIG.LEVEL_3 && request.escalationLevel < 3) {
        shouldEscalate = true;
        newLevel = 3;
      } else if (minutesElapsed >= ESCALATION_CONFIG.LEVEL_2 && request.escalationLevel < 2) {
        shouldEscalate = true;
        newLevel = 2;
      } else if (minutesElapsed >= ESCALATION_CONFIG.LEVEL_1 && request.escalationLevel < 1) {
        shouldEscalate = true;
        newLevel = 1;
      }

      if (shouldEscalate) {
        await escalateRequest(request, newLevel);
        escalatedRequests.push({
          requestId: request._id,
          level: newLevel
        });
      }
    }

    return escalatedRequests;

  } catch (error) {
    console.error('Error checking escalations:', error);
    throw error;
  }
}

/**
 * Escalate a specific request
 */
async function escalateRequest(request, level) {
  try {
    // Get hospitals to notify based on escalation level
    const hospitalsToNotify = await getEscalationHospitals(
      {
        requestingHospitalId: request.requestingHospital.hospitalId,
        bloodGroup: request.bloodGroup,
        unitsRequired: request.unitsRequired,
        severityLevel: request.severityLevel,
        requestingLocation: request.requestingHospital.location?.coordinates
      },
      level
    );

    // Update request
    request.escalate(level);
    
    // Add communication log entry
    const escalationMessage = getEscalationMessage(level, hospitalsToNotify.length);
    request.communicationLog.push({
      timestamp: new Date(),
      senderId: 'SYSTEM',
      senderName: 'Emergency Escalation System',
      recipientId: request.requestingHospital.hospitalId,
      recipientName: request.requestingHospital.hospitalName,
      message: escalationMessage,
      type: 'ESCALATION'
    });

    await request.save();
    await notifyHospitals(request, hospitalsToNotify, level);

    console.log(`Request ${request._id} escalated to level ${level}`);

  } catch (error) {
    console.error('Error escalating request:', error);
    throw error;
  }
}

/**
 * Get escalation message based on level
 */
function getEscalationMessage(level, hospitalCount) {
  const messages = {
    1: `🔔 ESCALATION LEVEL 1: No response in 8 minutes. Notifying ${hospitalCount} nearest hospitals with matching blood availability.`,
    2: `⚠️ ESCALATION LEVEL 2: No response in 15 minutes. Broadcasting to ALL ${hospitalCount} network hospitals. URGENT ASSISTANCE NEEDED.`,
    3: `🚨 ESCALATION LEVEL 3: CRITICAL - No response in 25 minutes. City health authority notified. All ${hospitalCount} available resources mobilized.`
  };
  return messages[level] || 'Escalation in progress';
}

/**
 * Notify hospitals about escalated request
 */
async function notifyHospitals(request, hospitals, level) {
  try {
    // In production, this would:
    // 1. Send email notifications
    // 2. Send SMS to emergency contacts
    // 3. Emit socket.io events for real-time dashboard updates
    // 4. Log to notification system

    console.log(`Notifying ${hospitals.length} hospitals about escalated request`);
    // - Email via nodemailer
    // - SMS via Twilio
    // - Socket.io events
    // - Mobile push notifications
    
    for (const hospital of hospitals) {
      console.log(`  - Notifying ${hospital.hospitalName} (Match Score: ${hospital.matchScore})`);
    }

    // If level 3, notify authorities
    if (level === 3) {
      await notifyCityHealthAuthority(request);
    }

  } catch (error) {
    console.error('Error notifying hospitals:', error);
  }
}

/**
 * Notify city health authority (Level 3 escalation)
 */
async function notifyCityHealthAuthority(request) {
  try {
    console.log(`🚨 CRITICAL: Notifying city health authority about request ${request._id}`);
    // - Email to health department
    // - SMS to emergency coordinator
    // - Alert to regional blood bank network
    
    const alertDetails = {
      requestId: request._id,
      bloodGroup: request.bloodGroup,
      unitsRequired: request.unitsRequired,
      severityLevel: request.severityLevel,
      urgencyScore: request.urgencyScore,
      requestingHospital: request.requestingHospital.hospitalName,
      patientAge: request.patientDetails.age,
      diagnosis: request.patientDetails.diagnosis,
      timeElapsed: Math.floor((new Date() - request.createdAt) / 1000 / 60) + ' minutes'
    };

    console.log('Authority Alert Details:', alertDetails);

  } catch (error) {
    console.error('Error notifying health authority:', error);
  }
}

/**
 * Manually escalate a request (override automatic timing)
 */
async function manualEscalation(requestId, level, reason) {
  try {
    const request = await EmergencyRequest.findById(requestId);
    if (!request) {
      throw new Error('Request not found');
    }

    request.escalate(level);
    request.addAuditLog('MANUAL_ESCALATION', 'SYSTEM', `Manual escalation to level ${level}: ${reason}`);
    await request.save();

    // Get hospitals and notify
    const hospitals = await getEscalationHospitals(
      {
        requestingHospitalId: request.requestingHospital.hospitalId,
        bloodGroup: request.bloodGroup,
        unitsRequired: request.unitsRequired,
        severityLevel: request.severityLevel,
        requestingLocation: request.requestingHospital.location?.coordinates
      },
      level
    );

    await notifyHospitals(request, hospitals, level);

    return { success: true, request, hospitalsNotified: hospitals.length };

  } catch (error) {
    console.error('Error in manual escalation:', error);
    throw error;
  }
}

/**
 * Get escalation statistics
 */
async function getEscalationStats(timeRange = 'week') {
  try {
    const dateFilter = getDateFilter(timeRange);
    
    const stats = await EmergencyRequest.aggregate([
      { $match: { createdAt: { $gte: dateFilter } } },
      {
        $group: {
          _id: '$escalationLevel',
          count: { $sum: 1 },
          averageResponseTime: { $avg: { $subtract: ['$acceptedAt', '$createdAt'] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return stats;

  } catch (error) {
    console.error('Error fetching escalation stats:', error);
    throw error;
  }
}

/**
 * Helper: Get date filter based on time range
 */
function getDateFilter(timeRange) {
  const now = new Date();
  const filters = {
    'day': new Date(now.setDate(now.getDate() - 1)),
    'week': new Date(now.setDate(now.getDate() - 7)),
    'month': new Date(now.setMonth(now.getMonth() - 1)),
    'year': new Date(now.setFullYear(now.getFullYear() - 1))
  };
  return filters[timeRange] || filters.week;
}

// Start escalation monitoring (call this when server starts)
function startEscalationMonitoring(intervalMinutes = 2) {
  console.log(`Starting escalation monitoring (check every ${intervalMinutes} minutes)`);
  
  // Check immediately on start
  checkAndEscalateRequests();
  
  // Then check periodically
  setInterval(async () => {
    const escalated = await checkAndEscalateRequests();
    if (escalated.length > 0) {
      console.log(`Escalated ${escalated.length} requests:`, escalated);
    }
  }, intervalMinutes * 60 * 1000);
}

module.exports = {
  checkAndEscalateRequests,
  escalateRequest,
  manualEscalation,
  getEscalationStats,
  startEscalationMonitoring,
  ESCALATION_CONFIG
};
