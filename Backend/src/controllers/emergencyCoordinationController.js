const EmergencyRequest = require('../models/EmergencyRequest');
const BloodTransfer = require('../models/BloodTransfer');
const HospitalTrustLedger = require('../models/HospitalTrustLedger');
const BloodInventory = require('../models/BloodInventory');
const HospitalProfile = require('../models/HospitalProfile');
const { 
  findMatchingHospitals, 
  getEscalationHospitals,
  predictResponseProbability 
} = require('../services/hospitalMatchingService');
const eventBus = require('../services/realtime/eventBus');

const VALID_BLOOD_GROUPS = new Set(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);

exports.createEmergencyRequest = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      bloodGroup,
      unitsRequired,
      severityLevel,
      medicalJustification,
      patientDetails,
      requiredBy
    } = req.body;

    if (!VALID_BLOOD_GROUPS.has(bloodGroup)) {
      return res.status(400).json({ message: 'Invalid blood group' });
    }

    if (!Number.isInteger(unitsRequired) || unitsRequired <= 0) {
      return res.status(400).json({ message: 'unitsRequired must be a positive integer' });
    }

    const normalizedSeverityLevel = severityLevel === 'MEDIUM' ? 'MODERATE' : severityLevel;

    if (!['CRITICAL', 'HIGH', 'MODERATE'].includes(normalizedSeverityLevel)) {
      return res.status(400).json({ message: 'Invalid severity level' });
    }

    const hospitalProfile = await HospitalProfile.findOne({ userId });
    if (!hospitalProfile) {
      return res.status(404).json({ message: 'Hospital profile not found' });
    }

    const emergencyRequest = new EmergencyRequest({
      requestingHospitalId: hospitalProfile._id,
      requestingHospitalName: hospitalProfile.hospitalName,
      bloodGroup,
      unitsRequired,
      severityLevel: normalizedSeverityLevel,
      patientInfo: {
        age: patientDetails?.age,
        gender: patientDetails?.gender,
        diagnosis: patientDetails?.diagnosis,
        requiredBy: requiredBy ? new Date(requiredBy) : undefined,
        isLifeThreatening: normalizedSeverityLevel === 'CRITICAL'
      },
      lifecycleStatus: 'CREATED'
    });

    emergencyRequest.urgencyScore = emergencyRequest.calculateUrgencyScore();
    emergencyRequest.addAuditLog('CREATED', userId, 'Emergency request created');

    const matchingHospitals = await findMatchingHospitals({
      requestingHospitalId: hospitalProfile._id,
      bloodGroup,
      unitsRequired,
      severityLevel: normalizedSeverityLevel,
      requestingLocation: hospitalProfile.location?.coordinates
    });

    emergencyRequest.matchingRecommendations = matchingHospitals.slice(0, 10).map(match => ({
      hospitalId: match.hospitalId,
      hospitalName: match.hospitalName,
      matchScore: match.matchScore,
      distance: match.distance,
      availableUnits: match.availableUnits,
      responseTime: match.responseTime,
      confidenceLevel: match.confidenceLevel
    }));

    await emergencyRequest.save();

    const emergencyPayload = {
      requestId: emergencyRequest._id,
      hospitalId: hospitalProfile._id,
      requestingHospitalName: hospitalProfile.hospitalName,
      bloodGroup,
      unitsRequired,
      urgency: String(normalizedSeverityLevel || 'HIGH').toLowerCase(),
      urgencyScore: emergencyRequest.urgencyScore
    };
    eventBus.publish('emergency:created', emergencyPayload);
    eventBus.publish('emergency_created', emergencyPayload);

    res.status(201).json({
      message: 'Emergency request created successfully',
      request: emergencyRequest,
      matchingHospitals: matchingHospitals.slice(0, 5),
      urgencyScore: emergencyRequest.urgencyScore
    });
  } catch (error) {
    console.error('Error creating emergency request:', error);
    res.status(500).json({ message: 'Error creating emergency request', error: error.message });
  }
};

exports.getMatchingHospitals = async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await EmergencyRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Emergency request not found' });
    }
    const hospitalProfile = await HospitalProfile.findById(request.requestingHospitalId);
    const matches = await findMatchingHospitals({
      requestingHospitalId: request.requestingHospitalId,
      bloodGroup: request.bloodGroup,
      unitsRequired: request.unitsRequired,
      severityLevel: request.severityLevel,
      requestingLocation: hospitalProfile?.location?.coordinates
    });
    res.json({ totalMatches: matches.length, matches });
  } catch (error) {
    console.error('Error fetching matching hospitals:', error);
    res.status(500).json({ message: 'Error fetching matches', error: error.message });
  }
};

exports.acceptEmergencyRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const partnerUserId = req.user._id;
    const { unitsCommitted, estimatedDeliveryTime, notes } = req.body;
    const request = await EmergencyRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Emergency request not found' });
    }
    if (request.lifecycleStatus !== 'CREATED' && request.lifecycleStatus !== 'MEDICAL_VERIFICATION_PENDING') {
      return res.status(400).json({ message: 'Request cannot be accepted in current status' });
    }
    const partnerHospital = await HospitalProfile.findOne({ userId: partnerUserId });
    if (!partnerHospital) {
      return res.status(404).json({ message: 'Partner hospital not found' });
    }
    const inventory = await BloodInventory.find({
      hospitalId: partnerHospital._id,
      bloodGroup: request.bloodGroup,
      status: 'Available'
    });
    const totalAvailable = inventory.length;
    if (totalAvailable < unitsCommitted) {
      return res.status(400).json({ 
        message: 'Insufficient blood units available',
        available: totalAvailable,
        required: unitsCommitted
      });
    }
    request.assignedHospitalId = partnerHospital._id;
    request.assignedHospitalName = partnerHospital.hospitalName;
    request.acceptedAt = new Date();
    request.acceptedBy = { userId: partnerUserId, name: partnerHospital.hospitalName };
    request.lifecycleStatus = 'PARTNER_ACCEPTED';
    request.addAuditLog('PARTNER_ACCEPTED', partnerUserId, 'Partner accepted request, committing ' + unitsCommitted + ' units');
    request.communicationLogs.push({
      timestamp: new Date(),
      fromHospitalId: partnerHospital._id,
      toHospitalId: request.requestingHospitalId,
      messageType: 'SYSTEM_NOTIFICATION',
      message: 'Request accepted. Committing ' + unitsCommitted + ' units. ' + (notes || '')
    });
    const unitsToReserve = inventory.slice(0, unitsCommitted);
    for (const unit of unitsToReserve) {
      unit.status = 'Reserved';
      unit.reservationInfo = { reservedFor: request._id, reservedAt: new Date() };
      await unit.save();
    }
    request.resourceLock = {
      isLocked: true,
      lockedUnits: unitsCommitted,
      lockedAt: new Date(),
      lockExpiry: new Date(Date.now() + 4 * 60 * 60 * 1000),
      inventoryIds: unitsToReserve.map(u => u._id)
    };
    await request.save();
    res.json({ message: 'Emergency request accepted successfully', request });
  } catch (error) {
    console.error('Error accepting emergency request:', error);
    res.status(500).json({ message: 'Error accepting request', error: error.message });
  }
};

exports.declineEmergencyRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user._id;
    const { reason } = req.body;
    const request = await EmergencyRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Emergency request not found' });
    }
    const hospital = await HospitalProfile.findOne({ userId });
    request.communicationLogs.push({
      timestamp: new Date(),
      fromHospitalId: hospital?._id,
      toHospitalId: request.requestingHospitalId,
      messageType: 'SYSTEM_NOTIFICATION',
      message: 'Request declined. Reason: ' + reason
    });
    request.addAuditLog('DECLINED', userId, 'Request declined: ' + reason);
    await request.save();
    let trustLedger = await HospitalTrustLedger.findOne({ hospitalId: hospital?._id });
    if (trustLedger) {
      trustLedger.responseMetrics.totalRequestsReceived += 1;
      trustLedger.responseMetrics.declined += 1;
      trustLedger.responseMetrics.acceptanceRate = 
        (trustLedger.responseMetrics.accepted / trustLedger.responseMetrics.totalRequestsReceived) * 100;
      trustLedger.calculateTrustScores();
      await trustLedger.save();
    }
    res.json({ message: 'Request declined', request });
  } catch (error) {
    console.error('Error declining emergency request:', error);
    res.status(500).json({ message: 'Error declining request', error: error.message });
  }
};

exports.dispatchBloodTransfer = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { vehicleDetails, driverDetails, dispatchChecklist } = req.body;
    const request = await EmergencyRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Emergency request not found' });
    }
    if (request.lifecycleStatus !== 'PARTNER_ACCEPTED') {
      return res.status(400).json({ message: 'Request must be accepted before dispatch' });
    }
    const partnerHospital = await HospitalProfile.findById(request.assignedHospitalId);
    const requestingHospital = await HospitalProfile.findById(request.requestingHospitalId);
    const bloodTransfer = new BloodTransfer({
      emergencyRequestId: requestId,
      fromHospital: {
        hospitalId: request.assignedHospitalId,
        hospitalName: request.assignedHospitalName,
        location: partnerHospital?.location
      },
      toHospital: {
        hospitalId: request.requestingHospitalId,
        hospitalName: request.requestingHospitalName,
        location: requestingHospital?.location
      },
      bloodGroup: request.bloodGroup,
      unitsTransferred: request.resourceLock?.lockedUnits || 0,
      vehicleDetails: {
        vehicleNumber: vehicleDetails?.vehicleNumber,
        vehicleType: vehicleDetails?.vehicleType,
        driverName: driverDetails?.name,
        driverPhone: driverDetails?.phone,
        driverLicense: driverDetails?.license
      },
      dispatchChecklist,
      status: 'DISPATCHED',
      dispatchedAt: new Date()
    });
    if (partnerHospital?.location?.coordinates) {
      bloodTransfer.addTrackingPoint(
        partnerHospital.location.coordinates[1],
        partnerHospital.location.coordinates[0],
        'DEPARTED',
        'Blood units dispatched from partner hospital'
      );
    }
    await bloodTransfer.save();

    eventBus.publish('transfer:initiated', {
      transferId: bloodTransfer._id,
      requestId: request._id,
      fromHospital: String(request.assignedHospitalId),
      toHospital: String(request.requestingHospitalId),
      bloodGroup: request.bloodGroup,
      units: request.resourceLock?.lockedUnits || 0,
      initiatedBy: req.user?._id
    });

    request.lifecycleStatus = 'LOGISTICS_DISPATCH';
    request.logisticsDetails = {
      dispatchMethod: vehicleDetails?.vehicleType || 'AMBULANCE',
      dispatchedAt: new Date(),
      dispatchedBy: { userId: req.user._id, name: partnerHospital?.hospitalName },
      vehicleInfo: { type: vehicleDetails?.vehicleType, number: vehicleDetails?.vehicleNumber }
    };
    request.addAuditLog('LOGISTICS_DISPATCH', request.assignedHospitalId, 'Blood units dispatched');
    await request.save();
    res.json({ message: 'Blood transfer dispatched successfully', transfer: bloodTransfer, request });
  } catch (error) {
    console.error('Error dispatching blood transfer:', error);
    res.status(500).json({ message: 'Error dispatching transfer', error: error.message });
  }
};

exports.updateTransferLocation = async (req, res) => {
  try {
    const { transferId } = req.params;
    const { latitude, longitude, status, notes } = req.body;
    const transfer = await BloodTransfer.findById(transferId);
    if (!transfer) {
      return res.status(404).json({ message: 'Blood transfer not found' });
    }
    transfer.addTrackingPoint(latitude, longitude, status, notes);
    await transfer.save();
    res.json({
      message: 'Location updated successfully',
      currentLocation: transfer.trackingPoints[transfer.trackingPoints.length - 1]
    });
  } catch (error) {
    console.error('Error updating transfer location:', error);
    res.status(500).json({ message: 'Error updating location', error: error.message });
  }
};

exports.logTemperature = async (req, res) => {
  try {
    const { transferId } = req.params;
    const { temperature, location } = req.body;
    const transfer = await BloodTransfer.findById(transferId);
    if (!transfer) {
      return res.status(404).json({ message: 'Blood transfer not found' });
    }
    transfer.logTemperature(temperature, location);
    await transfer.save();
    res.json({ message: 'Temperature logged successfully', compliant: transfer.temperatureCompliant });
  } catch (error) {
    console.error('Error logging temperature:', error);
    res.status(500).json({ message: 'Error logging temperature', error: error.message });
  }
};

exports.completeDelivery = async (req, res) => {
  try {
    const { transferId } = req.params;
    const { receivalChecklist, receiverSignature, unitsReceived } = req.body;
    const transfer = await BloodTransfer.findById(transferId);
    if (!transfer) {
      return res.status(404).json({ message: 'Blood transfer not found' });
    }
    const request = await EmergencyRequest.findById(transfer.emergencyRequestId);
    if (!request) {
      return res.status(404).json({ message: 'Emergency request not found' });
    }
    const requestingHospital = await HospitalProfile.findById(request.requestingHospitalId);
    transfer.receivalChecklist = receivalChecklist;
    transfer.receiverSignature = receiverSignature;
    transfer.status = 'COMPLETED';
    transfer.deliveredAt = new Date();
    if (requestingHospital?.location?.coordinates) {
      transfer.addTrackingPoint(
        requestingHospital.location.coordinates[1],
        requestingHospital.location.coordinates[0],
        'DELIVERED',
        'Blood units successfully delivered'
      );
    }
    transfer.calculatePerformance();
    await transfer.save();

    eventBus.publish('transfer:completed', {
      transferId: transfer._id,
      requestId: request._id,
      fromHospital: String(request.assignedHospitalId),
      toHospital: String(request.requestingHospitalId),
      bloodGroup: request.bloodGroup,
      units: unitsReceived || request.resourceLock?.lockedUnits || 0,
      completedBy: req.user?._id
    });

    request.lifecycleStatus = 'DELIVERED';
    request.qualityChecklist = receivalChecklist;
    request.addAuditLog('DELIVERED', request.requestingHospitalId, 'Blood units delivered and verified');
    await request.save();
    if (request.resourceLock?.inventoryIds?.length) {
      for (const unitId of request.resourceLock.inventoryIds) {
        await BloodInventory.findByIdAndUpdate(unitId, { status: 'Issued' });
      }
    }
    await updateTrustLedgers(request, transfer);
    res.json({
      message: 'Delivery completed successfully',
      transfer,
      request,
      performanceMetrics: transfer.performanceMetrics
    });
  } catch (error) {
    console.error('Error completing delivery:', error);
    res.status(500).json({ message: 'Error completing delivery', error: error.message });
  }
};

exports.getEmergencyRequests = async (req, res) => {
  try {
    const { status, bloodGroup, severityLevel, hospitalId } = req.query;
    const query = {};
    if (status) query.lifecycleStatus = status;
    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (severityLevel) query.severityLevel = severityLevel;
    if (hospitalId) {
      query.$or = [
        { requestingHospitalId: hospitalId },
        { assignedHospitalId: hospitalId }
      ];
    }
    const requests = await EmergencyRequest.find(query).sort({ createdAt: -1 }).limit(50);
    res.json({ total: requests.length, requests });
  } catch (error) {
    console.error('Error fetching emergency requests:', error);
    res.status(500).json({ message: 'Error fetching requests', error: error.message });
  }
};

exports.getRequestDetails = async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await EmergencyRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Emergency request not found' });
    }

    const role = String(req.userRole || '').toLowerCase();
    if (role !== 'super_admin') {
      const hospitalProfile = await HospitalProfile.findOne({ userId: req.user._id }).select('_id');
      if (!hospitalProfile) {
        return res.status(403).json({ message: 'Hospital profile not found for current user' });
      }

      const profileId = String(hospitalProfile._id);
      const requesterId = String(request.requestingHospitalId || '');
      const assignedId = String(request.assignedHospitalId || '');

      if (profileId !== requesterId && profileId !== assignedId) {
        return res.status(403).json({ message: 'Access denied to this emergency request' });
      }
    }

    let transfer = null;
    const transfers = await BloodTransfer.find({ emergencyRequestId: requestId });
    if (transfers.length > 0) {
      transfer = transfers[0];
    }
    res.json({ request, transfer });
  } catch (error) {
    console.error('Error fetching request details:', error);
    res.status(500).json({ message: 'Error fetching details', error: error.message });
  }
};

async function updateTrustLedgers(request, transfer) {
  try {
    let partnerLedger = await HospitalTrustLedger.findOne({ hospitalId: request.assignedHospitalId });
    if (!partnerLedger) {
      partnerLedger = new HospitalTrustLedger({
        hospitalId: request.assignedHospitalId,
        hospitalName: request.assignedHospitalName
      });
    }
    partnerLedger.recordTransaction('LENT', request.resourceLock?.lockedUnits || 0);
    const onTime = transfer.performanceMetrics?.onTimeDelivery;
    const tempCompliant = transfer.temperatureCompliant;
    if (onTime) partnerLedger.deliveryMetrics.onTimeDeliveries += 1;
    partnerLedger.deliveryMetrics.totalDeliveries += 1;
    partnerLedger.deliveryMetrics.onTimeRate = 
      (partnerLedger.deliveryMetrics.onTimeDeliveries / partnerLedger.deliveryMetrics.totalDeliveries) * 100;
    if (tempCompliant) partnerLedger.deliveryMetrics.temperatureCompliant += 1;
    partnerLedger.deliveryMetrics.temperatureComplianceRate =
      (partnerLedger.deliveryMetrics.temperatureCompliant / partnerLedger.deliveryMetrics.totalDeliveries) * 100;
    partnerLedger.addReward(10, 'Successful emergency delivery');
    partnerLedger.calculateTrustScores();
    await partnerLedger.save();
    let requestingLedger = await HospitalTrustLedger.findOne({ hospitalId: request.requestingHospitalId });
    if (!requestingLedger) {
      requestingLedger = new HospitalTrustLedger({
        hospitalId: request.requestingHospitalId,
        hospitalName: request.requestingHospitalName
      });
    }
    requestingLedger.recordTransaction('BORROWED', request.resourceLock?.lockedUnits || 0);
    requestingLedger.calculateTrustScores();
    await requestingLedger.save();
  } catch (error) {
    console.error('Error updating trust ledgers:', error);
  }
}

module.exports = exports;
