const BloodUnit = require('../models/BloodUnit');
const BloodLifecycleEvent = require('../models/BloodLifecycleEvent');
const HospitalProfile = require('../models/HospitalProfile');
const PublicUser = require('../models/PublicUser');
const Notification = require('../models/Notification');
const crypto = require('crypto');
const QRCode = require('qrcode');

/**
 * Blood Tracing Service
 * 
 * Core functionality:
 * - QR code generation for blood units
 * - Lifecycle event tracking
 * - Location history management
 * - AI monitoring and alerts
 * - Blockchain audit trail (optional)
 * - Impact tracking (anonymized)
 */

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateUnitId() {
  const timestamp = Date.now();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `BU-${timestamp}-${random}`;
}

function generateQRString(unitId, bloodGroup) {
  const data = `${unitId}|${bloodGroup}|${Date.now()}`;
  return Buffer.from(data).toString('base64');
}

async function generateQRCode(qrString) {
  try {
    const qrDataUrl = await QRCode.toDataURL(qrString, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 1,
      width: 300,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return qrDataUrl;
  } catch (err) {
    console.error('Error generating QR code:', err.message);
    throw new Error('Failed to generate QR code');
  }
}

function calculateBlockchainHash(data) {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

// ============================================================================
// BLOOD UNIT CREATION & QR GENERATION
// ============================================================================

async function createBloodUnit(donorId, bloodGroup, component, volume = 450) {
  try {
    const unitId = generateUnitId();
    const collectionDate = new Date();
    
    // Calculate expiry based on component type
    const expiryDate = new Date(collectionDate);
    switch (component) {
      case 'WHOLE_BLOOD':
        expiryDate.setDate(expiryDate.getDate() + 35); // 35 days
        break;
      case 'RED_CELLS':
        expiryDate.setDate(expiryDate.getDate() + 42); // 42 days
        break;
      case 'PLASMA':
        expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1 year
        break;
      case 'PLATELETS':
        expiryDate.setDate(expiryDate.getDate() + 5); // 5 days
        break;
      default:
        expiryDate.setDate(expiryDate.getDate() + 42);
    }

    // Generate QR
    const qrString = generateQRString(unitId, bloodGroup);
    const qrCode = await generateQRCode(qrString);

    // Create blood unit
    const bloodUnit = new BloodUnit({
      unitId,
      bloodGroup,
      component,
      volume: { amount: volume, unit: 'mL' },
      donorId,
      collectionDate,
      expiryDate,
      status: 'COLLECTED',
      qrMetadata: {
        qrCode,
        qrString,
        generatedAt: collectionDate,
        scanCount: 0
      },
      currentLocation: {
        type: 'COLLECTION_CENTER',
        updatedAt: collectionDate
      }
    });

    await bloodUnit.save();

    // Create lifecycle event
    await logLifecycleEvent(bloodUnit._id, 'DONATION', {
      status: 'COLLECTED',
      facility: 'COLLECTION_CENTER',
      description: `Blood unit collected from donor`
    });

    return bloodUnit;
  } catch (err) {
    console.error('Error creating blood unit:', err.message);
    throw err;
  }
}

// ============================================================================
// LIFECYCLE EVENT LOGGING
// ============================================================================

async function logLifecycleEvent(unitId, eventType, options = {}) {
  try {
    const bloodUnit = await BloodUnit.findById(unitId);
    if (!bloodUnit) throw new Error('Blood unit not found');

    const {
      facility = null,
      facilityName = null,
      description = '',
      metadata = {},
      previousStatus = bloodUnit.status,
      newStatus = bloodUnit.status,
      recordedBy = null,
      recordedByName = 'System',
      patientAgeGroup = 'UNKNOWN',
      procedure = 'OTHER',
      urgency = 'ROUTINE'
    } = options;

    // Create location history entry
    if (options.location) {
      bloodUnit.locationHistory.push({
        timestamp: new Date(),
        location: options.location,
        storageType: options.storageType || 'COLLECTION_CENTER',
        temperature: metadata.temperature,
        humidity: metadata.humidity,
        notes: description,
        recordedBy
      });
    }

    // Calculate blockchain hash (optional)
    const eventData = {
      unitId,
      eventType,
      timestamp: new Date(),
      facility,
      description
    };

    const blockchainHash = calculateBlockchainHash(eventData);

    // Get previous blockchain hash if exists
    const previousEvent = await BloodLifecycleEvent.findOne({ unitId })
      .sort({ timestamp: -1 })
      .limit(1);

    // Create lifecycle event
    const lifecycleEvent = new BloodLifecycleEvent({
      unitId,
      unitUniqueId: bloodUnit.unitId,
      eventType,
      location: options.location,
      facility,
      facilityName,
      previousStatus,
      newStatus,
      description,
      metadata,
      anonymizedPatientInfo: {
        ageGroup: patientAgeGroup,
        procedure,
        urgency
      },
      recordedBy,
      recordedByName,
      blockchainHash,
      previousBlockHash: previousEvent?.blockchainHash || null,
      timestamp: new Date()
    });

    if (options.alerts) {
      lifecycleEvent.alerts = options.alerts;
    }

    if (options.impactInfo) {
      lifecycleEvent.impactInfo = options.impactInfo;
    }

    await lifecycleEvent.save();

    // Add to blockchain events array
    if (bloodUnit.blockchainEvents) {
      bloodUnit.blockchainEvents.push({
        eventType,
        eventHash: blockchainHash,
        previousHash: previousEvent?.blockchainHash || null,
        timestamp: new Date(),
        data: eventData
      });
    }

    // Update last modified
    bloodUnit.lastModifiedBy = recordedBy;
    await bloodUnit.save();

    return lifecycleEvent;
  } catch (err) {
    console.error('Error logging lifecycle event:', err.message);
    throw err;
  }
}

// ============================================================================
// QR CODE SCANNING & TRACE RETRIEVAL
// ============================================================================

async function traceBloodUnit(unitId) {
  try {
    const bloodUnit = await BloodUnit.findById(unitId)
      .populate('donorId', 'fullName')
      .populate('currentLocation.facility', 'hospitalName');

    if (!bloodUnit) throw new Error('Blood unit not found');

    // Increment scan count
    bloodUnit.qrMetadata.lastScannedAt = new Date();
    bloodUnit.qrMetadata.scanCount += 1;
    await bloodUnit.save();

    // Get all lifecycle events
    const events = await BloodLifecycleEvent.find({ unitId })
      .sort({ timestamp: 1 })
      .populate('recordedBy', 'name email');

    // Build anonymized trace
    const trace = {
      unitId: bloodUnit.unitId,
      bloodGroup: bloodUnit.bloodGroup,
      component: bloodUnit.component,
      volume: bloodUnit.volume,
      status: bloodUnit.status,
      collectionDate: bloodUnit.collectionDate,
      expiryDate: bloodUnit.expiryDate,
      daysToExpiry: bloodUnit.daysToExpiry,
      currentLocation: bloodUnit.currentLocation,
      timeline: events.map(event => ({
        eventType: event.eventType,
        timestamp: event.timestamp,
        location: event.location,
        facilityName: event.facilityName,
        description: event.description,
        urgency: event.anonymizedPatientInfo?.urgency,
        procedure: event.anonymizedPatientInfo?.procedure
      })),
      impactInfo: bloodUnit.impactInfo,
      scans: {
        totalScans: bloodUnit.qrMetadata.scanCount,
        lastScanned: bloodUnit.qrMetadata.lastScannedAt
      }
    };

    return trace;
  } catch (err) {
    console.error('Error tracing blood unit:', err.message);
    throw err;
  }
}

// ============================================================================
// TRANSFER MANAGEMENT
// ============================================================================

async function initiateTransfer(unitId, toFacility, toFacilityName, recordedBy) {
  try {
    const bloodUnit = await BloodUnit.findById(unitId);
    if (!bloodUnit) throw new Error('Blood unit not found');

    bloodUnit.status = 'IN_TRANSIT';
    bloodUnit.lastTransferDate = new Date();
    bloodUnit.lastTransferFrom = bloodUnit.currentLocation?.facilityName || 'Unknown';
    bloodUnit.lastTransferTo = toFacilityName;

    await logLifecycleEvent(unitId, 'TRANSFER_INITIATED', {
      location: 'TRANSIT',
      storageType: 'TRANSIT',
      facility: toFacility,
      facilityName: toFacilityName,
      description: `Transfer initiated from ${bloodUnit.lastTransferFrom} to ${toFacilityName}`,
      newStatus: 'IN_TRANSIT',
      recordedBy
    });

    await bloodUnit.save();
    return bloodUnit;
  } catch (err) {
    console.error('Error initiating transfer:', err.message);
    throw err;
  }
}

async function completeTransfer(unitId, facility, facilityName, recordedBy, metadata = {}) {
  try {
    const bloodUnit = await BloodUnit.findById(unitId);
    if (!bloodUnit) throw new Error('Blood unit not found');

    bloodUnit.status = 'STORED';
    bloodUnit.currentLocation = {
      type: 'HOSPITAL',
      facility,
      facilityName,
      updatedAt: new Date()
    };

    await logLifecycleEvent(unitId, 'TRANSFER_RECEIVED', {
      location: 'HOSPITAL',
      storageType: 'HOSPITAL',
      facility,
      facilityName,
      description: `Transfer completed at ${facilityName}`,
      metadata,
      newStatus: 'STORED',
      recordedBy
    });

    await bloodUnit.save();
    return bloodUnit;
  } catch (err) {
    console.error('Error completing transfer:', err.message);
    throw err;
  }
}

// ============================================================================
// USAGE TRACKING
// ============================================================================

async function recordUsage(unitId, hospital, ageGroup, procedure, urgency, outcome, recordedBy) {
  try {
    const bloodUnit = await BloodUnit.findById(unitId);
    if (!bloodUnit) throw new Error('Blood unit not found');

    const usageTime = new Date();
    const timeToUsage = Math.floor((usageTime - bloodUnit.collectionDate) / (1000 * 60 * 60 * 24));

    // Update usage info
    bloodUnit.usageInfo = {
      usedAt: usageTime,
      hospital,
      patientAgeGroup: ageGroup,
      procedure,
      urgency,
      outcome: outcome || 'SUCCESSFUL',
      recordedBy,
      notes: ''
    };

    bloodUnit.status = 'TRANSFUSED';
    bloodUnit.impactInfo = {
      wasUsed: true,
      timeToUsage,
      lifesSaved: outcome === 'SUCCESSFUL' ? 1 : 0,
      procedureType: procedure,
      outcomeMessage: `This unit helped save a life in ${urgency.toLowerCase()} ${procedure ? procedure.toLowerCase() : 'transfusion'}`
    };

    await logLifecycleEvent(unitId, 'TRANSFUSED', {
      location: 'IN_USE',
      facility: hospital,
      description: outcome === 'SUCCESSFUL' 
        ? `Unit transfused successfully - helped save a life` 
        : `Unit transfused but outcome was unsuccessful`,
      anonymizedPatientInfo: {
        ageGroup,
        procedure,
        urgency
      },
      impactInfo: bloodUnit.impactInfo,
      newStatus: 'TRANSFUSED',
      recordedBy
    });

    await bloodUnit.save();
    return bloodUnit;
  } catch (err) {
    console.error('Error recording usage:', err.message);
    throw err;
  }
}

// ============================================================================
// AI MONITORING & ALERTS
// ============================================================================

async function checkNearExpiryUnits() {
  try {
    const alertThreshold = 7; // Alert if 7 days or less
    const today = new Date();
    const alertDate = new Date(today.getTime() + alertThreshold * 24 * 60 * 60 * 1000);

    const expiringUnits = await BloodUnit.find({
      status: { $in: ['COLLECTED', 'STORED', 'RESERVED'] },
      expiryDate: { $lte: alertDate, $gte: today },
      'monitoring.nearExpiryAlert': false
    }).populate('donorId', 'fullName email');

    for (const unit of expiringUnits) {
      unit.monitoring.nearExpiryAlert = true;
      unit.monitoring.nearExpiryAlertSentAt = new Date();
      await unit.save();

      // Log alert event
      await logLifecycleEvent(unit._id, 'QUALITY_ALERT', {
        description: `Blood unit expiring in ${unit.daysToExpiry} days`,
        alerts: ['EXPIRY_WARNING']
      });

      // Create notification
      await createAlert(unit, 'NEAR_EXPIRY', unit.daysToExpiry);
    }

    return { count: expiringUnits.length, units: expiringUnits };
  } catch (err) {
    console.error('Error checking near expiry units:', err.message);
    throw err;
  }
}

async function checkDelayedTransfers() {
  try {
    const delayThreshold = 48; // Alert if in transit for 48+ hours
    const now = new Date();
    const thresholdTime = new Date(now.getTime() - delayThreshold * 60 * 60 * 1000);

    const delayedUnits = await BloodUnit.find({
      status: 'IN_TRANSIT',
      lastTransferDate: { $lt: thresholdTime },
      'monitoring.delayedTransferAlert': false
    });

    for (const unit of delayedUnits) {
      unit.monitoring.delayedTransferAlert = true;
      unit.monitoring.delayedTransferAlertSentAt = new Date();
      await unit.save();

      await logLifecycleEvent(unit._id, 'QUALITY_ALERT', {
        description: `Blood unit transfer delayed - in transit for ${delayThreshold}+ hours`,
        alerts: ['TRANSFER_DELAY']
      });

      await createAlert(unit, 'TRANSFER_DELAY', delayThreshold);
    }

    return { count: delayedUnits.length, units: delayedUnits };
  } catch (err) {
    console.error('Error checking delayed transfers:', err.message);
    throw err;
  }
}

async function checkUnusedInventory() {
  try {
    const unusedThreshold = 30; // Alert if stored for 30+ days
    const now = new Date();
    const thresholdDate = new Date(now.getTime() - unusedThreshold * 24 * 60 * 60 * 1000);

    const unusedUnits = await BloodUnit.find({
      status: 'STORED',
      collectionDate: { $lt: thresholdDate },
      'usageInfo.usedAt': null,
      'monitoring.unusedInventoryAlert': false
    });

    for (const unit of unusedUnits) {
      unit.monitoring.unusedInventoryAlert = true;
      unit.monitoring.unusedInventoryAlertSentAt = new Date();
      await unit.save();

      await logLifecycleEvent(unit._id, 'QUALITY_ALERT', {
        description: `Blood unit unused in inventory for ${unusedThreshold}+ days`,
        alerts: ['INVENTORY_CONCERN']
      });

      await createAlert(unit, 'UNUSED_INVENTORY', unusedThreshold);
    }

    return { count: unusedUnits.length, units: unusedUnits };
  } catch (err) {
    console.error('Error checking unused inventory:', err.message);
    throw err;
  }
}

async function runAIMonitoring() {
  try {
    console.log('[Blood Tracing] Running AI monitoring...');
    
    const results = {
      nearExpiry: await checkNearExpiryUnits(),
      delayedTransfers: await checkDelayedTransfers(),
      unusedInventory: await checkUnusedInventory()
    };

    return results;
  } catch (err) {
    console.error('Error running AI monitoring:', err.message);
    throw err;
  }
}

// ============================================================================
// NOTIFICATIONS & ALERTS
// ============================================================================

async function createAlert(bloodUnit, alertType, details) {
  try {
    const messages = {
      NEAR_EXPIRY: `Blood unit ${bloodUnit.unitId} (${bloodUnit.bloodGroup}) expiring in ${details} days`,
      TRANSFER_DELAY: `Blood unit ${bloodUnit.unitId} transfer delayed - in transit for ${details}+ hours`,
      UNUSED_INVENTORY: `Blood unit ${bloodUnit.unitId} unused in inventory for ${details}+ days`
    };

    const notification = new Notification({
      recipientType: 'BLOOD_BANK_ADMIN',
      recipients: [],
      title: `Blood Unit Alert: ${alertType}`,
      message: messages[alertType] || 'Blood unit alert',
      type: 'BLOOD_TRACE_ALERT',
      priority: 'HIGH',
      data: {
        bloodUnitId: bloodUnit._id,
        bloodUnitNumber: bloodUnit.unitId,
        alertType,
        details
      }
    });

    await notification.save();
    return notification;
  } catch (err) {
    console.error('Error creating alert:', err.message);
  }
}

// ============================================================================
// DONOR VISIBILITY
// ============================================================================

async function getDonorBloodUnitTraces(donorId) {
  try {
    const units = await BloodUnit.find({ donorId })
      .select('-blockchainEvents -locationHistory -testing')
      .sort({ createdAt: -1 });

    const tracedUnits = await Promise.all(
      units.map(async (unit) => {
        const events = await BloodLifecycleEvent.find({ unitId: unit._id })
          .select('eventType timestamp location procedure urgency outcome')
          .limit(10);

        return {
          unitId: unit.unitId,
          bloodGroup: unit.bloodGroup,
          status: unit.status,
          collectionDate: unit.collectionDate,
          expiryDate: unit.expiryDate,
          impactInfo: unit.impactInfo,
          lifesSaved: unit.impactInfo?.lifesSaved || 0,
          recentEvents: events.slice(0, 5).map(e => ({
            type: e.eventType,
            date: e.timestamp,
            location: e.location
          }))
        };
      })
    );

    return tracedUnits;
  } catch (err) {
    console.error('Error getting donor blood unit traces:', err.message);
    throw err;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Creation
  createBloodUnit,
  generateQRCode,
  generateUnitId,

  // Lifecycle & Events
  logLifecycleEvent,
  traceBloodUnit,

  // Transfers
  initiateTransfer,
  completeTransfer,

  // Usage
  recordUsage,

  // AI Monitoring
  checkNearExpiryUnits,
  checkDelayedTransfers,
  checkUnusedInventory,
  runAIMonitoring,

  // Alerts
  createAlert,

  // Donor Visibility
  getDonorBloodUnitTraces
};
