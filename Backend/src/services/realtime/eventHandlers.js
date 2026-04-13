const eventBus = require('./eventBus');
const { emitToUser, emitToRole, emitToHospital, emitToEmergency, broadcast } = require('./socketService');
const blockchainService = require('../blockchain/blockchainService');
const User = require('../../models/User');
const HospitalProfile = require('../../models/HospitalProfile');
const { sendEmergencyAlertEmail } = require('../email.service');


function setupEventHandlers() {
  eventBus.subscribe('emergency:created', async (event) => {
    const { hospitalId, requestId, bloodGroup, urgency, toHospitalId } = event.payload;

    if (toHospitalId) {
      emitToHospital(toHospitalId, 'emergency:new', event.payload);
    }
    emitToHospital(hospitalId, 'emergency:new', event.payload);
    emitToRole('super_admin', 'emergency:new', event.payload);

    if (urgency === 'critical') {
      broadcast('emergency:critical', {
        requestId,
        bloodGroup,
        urgency,
        message: `Critical blood request for ${bloodGroup}`
      });
    }

    try {
      const message = `Emergency blood request ${requestId} requires ${bloodGroup}. Urgency: ${String(urgency || 'high').toUpperCase()}.`;

      if (toHospitalId) {
        const targetHospital = await HospitalProfile.findById(toHospitalId)
          .select('adminEmail officialEmail hospitalName')
          .lean();
        const recipientEmail = targetHospital?.adminEmail || targetHospital?.officialEmail;
        if (recipientEmail) {
          await sendEmergencyAlertEmail(
            recipientEmail,
            event.payload.requestingHospitalName || 'LifeLink Hospital',
            message
          );
        }
      }
    } catch (emailError) {
      console.error('Failed to send targeted emergency email:', emailError.message);
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
    const { requestId, newStatus, hospitalId, toHospitalId, fromHospitalId } = event.payload;
    emitToEmergency(requestId, 'emergency:update', event.payload);
    emitToHospital(hospitalId, 'emergency:update', event.payload);
    if (toHospitalId) {
      emitToHospital(toHospitalId, 'emergency:update', event.payload);
    }
    if (fromHospitalId) {
      emitToHospital(fromHospitalId, 'emergency:update', event.payload);
    }
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
    if (event.payload.deliverySession) {
      emitToHospital(fromHospital, 'delivery:tracking', event.payload.deliverySession);
      emitToHospital(toHospital, 'delivery:tracking', event.payload.deliverySession);
    }
    blockchainService.recordBloodTransfer({
      transferId,
      fromHospital,
      toHospital,
      bloodGroup: event.payload.bloodGroup,
      units: event.payload.units,
      initiatedBy: event.payload.initiatedBy
    });
  });

  eventBus.subscribe('delivery:session_created', (event) => {
    const { deliverySession } = event.payload || {};
    if (!deliverySession) {
      return;
    }

    emitToHospital(deliverySession.from?.hospitalId, 'delivery:tracking', deliverySession);
    emitToHospital(deliverySession.to?.hospitalId, 'delivery:tracking', deliverySession);
    emitToEmergency(deliverySession.requestId, 'delivery:tracking', deliverySession);
  });

  eventBus.subscribe('transfer:location_updated', (event) => {
    const { deliverySession, requestId } = event.payload || {};
    emitToEmergency(requestId, 'transfer:update', event.payload);
    if (deliverySession) {
      emitToHospital(deliverySession.from?.hospitalId, 'transfer:update', event.payload);
      emitToHospital(deliverySession.to?.hospitalId, 'transfer:update', event.payload);
      emitToEmergency(deliverySession.requestId, 'delivery:tracking', deliverySession);
      emitToHospital(deliverySession.from?.hospitalId, 'delivery:tracking', deliverySession);
      emitToHospital(deliverySession.to?.hospitalId, 'delivery:tracking', deliverySession);
    }
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
