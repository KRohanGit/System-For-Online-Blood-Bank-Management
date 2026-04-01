const eventBus = require('./eventBus');
const { emitToUser, emitToRole, emitToHospital, emitToEmergency, broadcast } = require('./socketService');
const blockchainService = require('../blockchain/blockchainService');
const User = require('../../models/User');
const { sendEmergencyAlertEmail } = require('../email.service');


function setupEventHandlers() {
  eventBus.subscribe('emergency:created', async (event) => {
    const { hospitalId, requestId, bloodGroup, urgency } = event.payload;
    emitToRole('hospital_admin', 'emergency:new', event.payload);
    emitToRole('super_admin', 'emergency:new', event.payload);
    emitToRole('doctor', 'emergency:new', event.payload);
    if (urgency === 'critical') {
      broadcast('emergency:critical', {
        requestId,
        bloodGroup,
        urgency,
        message: `Critical blood request for ${bloodGroup}`
      });
    }

    try {
      const doctors = await User.find({ role: 'doctor', isVerified: true })
        .select('email')
        .lean();

      const message = `Emergency blood request ${requestId} requires ${bloodGroup} units. Urgency: ${String(urgency || 'high').toUpperCase()}.`;
      for (const doctor of (doctors || []).filter((d) => d.email).slice(0, 20)) {
        await sendEmergencyAlertEmail(
          doctor.email,
          event.payload.requestingHospitalName || 'LifeLink Hospital',
          message
        );
      }
    } catch (emailError) {
      console.error('Failed to send doctor emergency emails:', emailError.message);
    }

    blockchainService.recordEmergencyRequest({
      requestId,
      hospitalId,
      bloodGroup,
      units: event.payload.unitsRequired,
      urgency
    });
  });

  eventBus.subscribe('emergency:status_changed', (event) => {
    const { requestId, newStatus, hospitalId } = event.payload;
    emitToEmergency(requestId, 'emergency:update', event.payload);
    emitToHospital(hospitalId, 'emergency:update', event.payload);
  });

  eventBus.subscribe('inventory:updated', (event) => {
    const { hospitalId, bloodGroup, action, units } = event.payload;
    emitToHospital(hospitalId, 'inventory:change', event.payload);
    emitToRole('super_admin', 'inventory:change', event.payload);
    blockchainService.recordInventoryChange({
      hospitalId,
      bloodGroup,
      action,
      units,
      reason: event.payload.reason || 'system_update',
      modifiedBy: event.payload.modifiedBy || 'system'
    });
  });

  eventBus.subscribe('inventory:low_stock', (event) => {
    const { hospitalId, bloodGroup, currentStock } = event.payload;
    emitToHospital(hospitalId, 'alert:low_stock', event.payload);
    emitToRole('super_admin', 'alert:low_stock', event.payload);
  });

  eventBus.subscribe('transfer:initiated', (event) => {
    const { fromHospital, toHospital, transferId } = event.payload;
    emitToHospital(fromHospital, 'transfer:update', event.payload);
    emitToHospital(toHospital, 'transfer:update', event.payload);
    blockchainService.recordBloodTransfer({
      transferId,
      fromHospital,
      toHospital,
      bloodGroup: event.payload.bloodGroup,
      units: event.payload.units,
      initiatedBy: event.payload.initiatedBy
    });
  });

  eventBus.subscribe('transfer:completed', (event) => {
    const { fromHospital, toHospital } = event.payload;
    emitToHospital(fromHospital, 'transfer:completed', event.payload);
    emitToHospital(toHospital, 'transfer:completed', event.payload);
  });

  eventBus.subscribe('donation:completed', (event) => {
    const { donorId, hospitalId } = event.payload;
    emitToUser(donorId, 'donation:confirmed', event.payload);
    emitToHospital(hospitalId, 'donation:new', event.payload);
    blockchainService.recordDonation({
      donationId: event.payload.donationId,
      donorId,
      hospitalId,
      bloodGroup: event.payload.bloodGroup,
      volume: event.payload.volume
    });
  });

  eventBus.subscribe('appointment:reminder', (event) => {
    emitToUser(event.payload.donorId, 'appointment:reminder', event.payload);
  });

  eventBus.subscribe('camp:registration', (event) => {
    emitToUser(event.payload.organizerId, 'camp:new_registration', event.payload);
  });

  eventBus.subscribe('unit:expiring_soon', (event) => {
    emitToHospital(event.payload.hospitalId, 'alert:expiring_units', event.payload);
  });

  eventBus.subscribe('system:health_degraded', (event) => {
    emitToRole('super_admin', 'system:alert', event.payload);
  });
}

module.exports = { setupEventHandlers };
