/**
 * Emergency Coordination Controller
 * 
 * Manages emergency blood requests between hospitals
 * Features: Request creation, matching, acceptance, logistics tracking
 */

const EmergencyRequest = require('../models/EmergencyRequest');
const BloodTransfer = require('../models/BloodTransfer');
const HospitalTrustLedger = require('../models/HospitalTrustLedger');
const BloodInventory = require('../models/BloodInventory');
const User = require('../models/User');
const { 
  findMatchingHospitals, 
  getEscalationHospitals,
  predictResponseProbability 
} = require('../services/hospitalMatchingService');

/**
 * Create new emergency request
 * POST /api/emergency-coordination/request
 */
exports.createEmergencyRequest = async (req, res) => {
  try {
    const requestingHospitalId = req.user._id;
    const {
      bloodGroup,
      unitsRequired,
      severityLevel,
      medicalJustification,
      patientDetails,
      requiredBy
    } = req.body;

    // Validate requesting hospital
    const requestingHospital = await User.findById(requestingHospitalId);
    if (!requestingHospital) {
      return res.status(404).json({ message: 'Requesting hospital not found' });
    }

    // Calculate urgency score
    const urgencyFactors = {
      severityLevel,
      unitsRequired,
      requiredBy: new Date(requiredBy)
    };

    // Create emergency request
    const emergencyRequest = new EmergencyRequest({
      requestingHospital: {
        hospitalId: requestingHospitalId,
        hospitalName: requestingHospital.hospitalName,
        location: requestingHospital.location,
        contactPerson: requestingHospital.contactPerson || 'Blood Bank Manager',
        phone: requestingHospital.phone
      },
      bloodGroup,
      unitsRequired,
      severityLevel,
      medicalJustification,
      patientDetails: {
        age: patientDetails.age,
        gender: patientDetails.gender,
        diagnosis: patientDetails.diagnosis,
        bloodPressure: patientDetails.bloodPressure,
        hemoglobin: patientDetails.hemoglobin
      },
      requiredBy: new Date(requiredBy),
      status: 'CREATED'
    });

    // Calculate urgency score
    emergencyRequest.urgencyScore = emergencyRequest.calculateUrgencyScore();

    // Add audit log
    emergencyRequest.addAuditLog('CREATED', requestingHospitalId, 'Emergency request created');

    // Find matching hospitals
    const matchingHospitals = await findMatchingHospitals({
      requestingHospitalId,
      bloodGroup,
      unitsRequired,
      severityLevel,
      requestingLocation: requestingHospital.location?.coordinates
    });

    // Store matching recommendations
    emergencyRequest.matchingRecommendations = matchingHospitals.slice(0, 10).map(match => ({
      hospitalId: match.hospitalId,
      hospitalName: match.hospitalName,
      matchScore: match.matchScore,
      distance: match.distance,
      availableUnits: match.availableUnits,
      estimatedResponseTime: match.responseTime,
      confidenceLevel: match.confidenceLevel
    }));

    await emergencyRequest.save();
    // io.emit('new-emergency-request', emergencyRequest);

    res.status(201).json({
      message: 'Emergency request created successfully',
      request: emergencyRequest,
      matchingHospitals: matchingHospitals.slice(0, 5), // Top 5
      urgencyScore: emergencyRequest.urgencyScore
    });

  } catch (error) {
    console.error('Error creating emergency request:', error);
    res.status(500).json({ 
      message: 'Error creating emergency request', 
      error: error.message 
    });
  }
};

/**
 * Get matching hospitals for request
 * GET /api/emergency-coordination/request/:requestId/matches
 */
exports.getMatchingHospitals = async (req, res) => {
  try {
    const { requestId } = req.params;
    
    const request = await EmergencyRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Emergency request not found' });
    }

    const matches = await findMatchingHospitals({
      requestingHospitalId: request.requestingHospital.hospitalId,
      bloodGroup: request.bloodGroup,
      unitsRequired: request.unitsRequired,
      severityLevel: request.severityLevel,
      requestingLocation: request.requestingHospital.location?.coordinates
    });

    res.json({
      totalMatches: matches.length,
      matches
    });

  } catch (error) {
    console.error('Error fetching matching hospitals:', error);
    res.status(500).json({ message: 'Error fetching matches', error: error.message });
  }
};

/**
 * Accept emergency request (partner hospital)
 * POST /api/emergency-coordination/request/:requestId/accept
 */
exports.acceptEmergencyRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const partnerHospitalId = req.user._id;
    const { unitsCommitted, estimatedDeliveryTime, notes } = req.body;

    const request = await EmergencyRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Emergency request not found' });
    }

    if (request.status !== 'CREATED' && request.status !== 'MEDICAL_VERIFICATION_PENDING') {
      return res.status(400).json({ message: 'Request cannot be accepted in current status' });
    }

    const partnerHospital = await User.findById(partnerHospitalId);
    if (!partnerHospital) {
      return res.status(404).json({ message: 'Partner hospital not found' });
    }

    // Check blood availability
    const inventory = await BloodInventory.findOne({
      hospitalId: partnerHospitalId,
      bloodGroup: request.bloodGroup
    });

    if (!inventory || inventory.unitsAvailable < unitsCommitted) {
      return res.status(400).json({ 
        message: 'Insufficient blood units available',
        available: inventory?.unitsAvailable || 0,
        required: unitsCommitted
      });
    }

    // Update request with partner details
    request.partnerHospital = {
      hospitalId: partnerHospitalId,
      hospitalName: partnerHospital.hospitalName,
      location: partnerHospital.location,
      contactPerson: partnerHospital.contactPerson || 'Blood Bank Manager',
      phone: partnerHospital.phone
    };
    request.unitsCommitted = unitsCommitted;
    request.estimatedDeliveryTime = new Date(estimatedDeliveryTime);
    request.status = 'PARTNER_ACCEPTED';
    request.acceptedAt = new Date();

    // Add audit log
    request.addAuditLog(
      'PARTNER_ACCEPTED',
      partnerHospitalId,
      `Partner accepted request, committing ${unitsCommitted} units`
    );

    // Add to communication log
    request.communicationLog.push({
      timestamp: new Date(),
      senderId: partnerHospitalId,
      senderName: partnerHospital.hospitalName,
      recipientId: request.requestingHospital.hospitalId,
      recipientName: request.requestingHospital.hospitalName,
      message: `Request accepted. Committing ${unitsCommitted} units. ${notes || ''}`,
      type: 'ACCEPTANCE'
    });

    // Lock blood units in inventory
    inventory.unitsReserved = (inventory.unitsReserved || 0) + unitsCommitted;
    inventory.unitsAvailable -= unitsCommitted;
    await inventory.save();

    // Store resource lock
    request.resourceLock = {
      hospitalId: partnerHospitalId,
      bloodGroup: request.bloodGroup,
      unitsLocked: unitsCommitted,
      lockedAt: new Date()
    };

    await request.save();
    // io.emit('request-accepted', request);

    res.json({
      message: 'Emergency request accepted successfully',
      request
    });

  } catch (error) {
    console.error('Error accepting emergency request:', error);
    res.status(500).json({ message: 'Error accepting request', error: error.message });
  }
};

/**
 * Decline emergency request
 * POST /api/emergency-coordination/request/:requestId/decline
 */
exports.declineEmergencyRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const hospitalId = req.user._id;
    const { reason } = req.body;

    const request = await EmergencyRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Emergency request not found' });
    }

    const hospital = await User.findById(hospitalId);

    // Add to communication log
    request.communicationLog.push({
      timestamp: new Date(),
      senderId: hospitalId,
      senderName: hospital.hospitalName,
      recipientId: request.requestingHospital.hospitalId,
      recipientName: request.requestingHospital.hospitalName,
      message: `Request declined. Reason: ${reason}`,
      type: 'DECLINED'
    });

    request.addAuditLog('DECLINED', hospitalId, `Request declined: ${reason}`);
    await request.save();

    // Update trust ledger - track decline
    let trustLedger = await HospitalTrustLedger.findOne({ hospitalId });
    if (trustLedger) {
      trustLedger.responseMetrics.totalRequestsReceived += 1;
      trustLedger.responseMetrics.declined += 1;
      trustLedger.responseMetrics.acceptanceRate = 
        (trustLedger.responseMetrics.accepted / trustLedger.responseMetrics.totalRequestsReceived) * 100;
      trustLedger.calculateTrustScores();
      await trustLedger.save();
    }

    res.json({
      message: 'Request declined',
      request
    });

  } catch (error) {
    console.error('Error declining emergency request:', error);
    res.status(500).json({ message: 'Error declining request', error: error.message });
  }
};

/**
 * Dispatch blood transfer
 * POST /api/emergency-coordination/request/:requestId/dispatch
 */
exports.dispatchBloodTransfer = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { vehicleDetails, driverDetails, dispatchChecklist } = req.body;

    const request = await EmergencyRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Emergency request not found' });
    }

    if (request.status !== 'PARTNER_ACCEPTED') {
      return res.status(400).json({ message: 'Request must be accepted before dispatch' });
    }

    // Create blood transfer record
    const bloodTransfer = new BloodTransfer({
      emergencyRequestId: requestId,
      fromHospital: {
        hospitalId: request.partnerHospital.hospitalId,
        hospitalName: request.partnerHospital.hospitalName,
        location: request.partnerHospital.location
      },
      toHospital: {
        hospitalId: request.requestingHospital.hospitalId,
        hospitalName: request.requestingHospital.hospitalName,
        location: request.requestingHospital.location
      },
      bloodGroup: request.bloodGroup,
      unitsTransferred: request.unitsCommitted,
      vehicleDetails: {
        vehicleNumber: vehicleDetails.vehicleNumber,
        vehicleType: vehicleDetails.vehicleType,
        driverName: driverDetails.name,
        driverPhone: driverDetails.phone,
        driverLicense: driverDetails.license
      },
      dispatchChecklist,
      status: 'DISPATCHED',
      dispatchedAt: new Date()
    });

    // Add initial tracking point (departure)
    bloodTransfer.addTrackingPoint(
      request.partnerHospital.location.coordinates[1], // lat
      request.partnerHospital.location.coordinates[0], // lng
      'DEPARTED',
      'Blood units dispatched from partner hospital'
    );

    await bloodTransfer.save();

    // Update emergency request
    request.status = 'LOGISTICS_DISPATCH';
    request.bloodTransferId = bloodTransfer._id;
    request.addAuditLog('LOGISTICS_DISPATCH', request.partnerHospital.hospitalId, 'Blood units dispatched');
    await request.save();

    res.json({
      message: 'Blood transfer dispatched successfully',
      transfer: bloodTransfer,
      request
    });

  } catch (error) {
    console.error('Error dispatching blood transfer:', error);
    res.status(500).json({ message: 'Error dispatching transfer', error: error.message });
  }
};

/**
 * Update transfer location (GPS tracking)
 * POST /api/emergency-coordination/transfer/:transferId/location
 */
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
    // io.emit('transfer-location-update', transfer);

    res.json({
      message: 'Location updated successfully',
      currentLocation: transfer.trackingPoints[transfer.trackingPoints.length - 1]
    });

  } catch (error) {
    console.error('Error updating transfer location:', error);
    res.status(500).json({ message: 'Error updating location', error: error.message });
  }
};

/**
 * Log temperature reading
 * POST /api/emergency-coordination/transfer/:transferId/temperature
 */
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

    res.json({
      message: 'Temperature logged successfully',
      compliant: transfer.temperatureCompliant
    });

  } catch (error) {
    console.error('Error logging temperature:', error);
    res.status(500).json({ message: 'Error logging temperature', error: error.message });
  }
};

/**
 * Complete delivery
 * POST /api/emergency-coordination/transfer/:transferId/complete
 */
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

    // Update transfer
    transfer.receivalChecklist = receivalChecklist;
    transfer.receiverSignature = receiverSignature;
    transfer.status = 'COMPLETED';
    transfer.deliveredAt = new Date();

    // Add final tracking point
    transfer.addTrackingPoint(
      request.requestingHospital.location.coordinates[1],
      request.requestingHospital.location.coordinates[0],
      'DELIVERED',
      'Blood units successfully delivered'
    );

    // Calculate performance metrics
    transfer.calculatePerformance();
    await transfer.save();

    // Update emergency request
    request.status = 'DELIVERED';
    request.deliveredAt = new Date();
    request.unitsDelivered = unitsReceived;
    request.qualityChecklist = receivalChecklist;
    request.addAuditLog('DELIVERED', request.requestingHospital.hospitalId, 'Blood units delivered and verified');
    await request.save();

    // Release resource lock and update inventory
    const partnerInventory = await BloodInventory.findOne({
      hospitalId: request.partnerHospital.hospitalId,
      bloodGroup: request.bloodGroup
    });
    if (partnerInventory) {
      partnerInventory.unitsReserved -= request.unitsCommitted;
      await partnerInventory.save();
    }

    // Add to requesting hospital inventory
    const requestingInventory = await BloodInventory.findOne({
      hospitalId: request.requestingHospital.hospitalId,
      bloodGroup: request.bloodGroup
    });
    if (requestingInventory) {
      requestingInventory.unitsAvailable += unitsReceived;
      await requestingInventory.save();
    }

    // Update trust ledgers
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

/**
 * Get all emergency requests (with filters)
 * GET /api/emergency-coordination/requests
 */
exports.getEmergencyRequests = async (req, res) => {
  try {
    const { status, bloodGroup, severityLevel, hospitalId } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (severityLevel) query.severityLevel = severityLevel;
    if (hospitalId) {
      query.$or = [
        { 'requestingHospital.hospitalId': hospitalId },
        { 'partnerHospital.hospitalId': hospitalId }
      ];
    }

    const requests = await EmergencyRequest.find(query)
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      total: requests.length,
      requests
    });

  } catch (error) {
    console.error('Error fetching emergency requests:', error);
    res.status(500).json({ message: 'Error fetching requests', error: error.message });
  }
};

/**
 * Get request details
 * GET /api/emergency-coordination/request/:requestId
 */
exports.getRequestDetails = async (req, res) => {
  try {
    const { requestId } = req.params;
    
    const request = await EmergencyRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Emergency request not found' });
    }

    // Get transfer details if exists
    let transfer = null;
    if (request.bloodTransferId) {
      transfer = await BloodTransfer.findById(request.bloodTransferId);
    }

    res.json({
      request,
      transfer
    });

  } catch (error) {
    console.error('Error fetching request details:', error);
    res.status(500).json({ message: 'Error fetching details', error: error.message });
  }
};

/**
 * Helper: Update trust ledgers after successful delivery
 */
async function updateTrustLedgers(request, transfer) {
  try {
    // Update partner hospital (donor) ledger
    let partnerLedger = await HospitalTrustLedger.findOne({
      hospitalId: request.partnerHospital.hospitalId
    });

    if (!partnerLedger) {
      partnerLedger = new HospitalTrustLedger({
        hospitalId: request.partnerHospital.hospitalId,
        hospitalName: request.partnerHospital.hospitalName
      });
    }

    partnerLedger.recordTransaction('LENT', request.unitsCommitted);
    
    // Update delivery metrics
    const onTime = transfer.performanceMetrics.onTimeDelivery;
    const tempCompliant = transfer.temperatureCompliant;
    
    if (onTime) partnerLedger.deliveryMetrics.onTimeDeliveries += 1;
    partnerLedger.deliveryMetrics.totalDeliveries += 1;
    partnerLedger.deliveryMetrics.onTimeRate = 
      (partnerLedger.deliveryMetrics.onTimeDeliveries / partnerLedger.deliveryMetrics.totalDeliveries) * 100;

    if (tempCompliant) partnerLedger.deliveryMetrics.temperatureCompliant += 1;
    partnerLedger.deliveryMetrics.temperatureComplianceRate =
      (partnerLedger.deliveryMetrics.temperatureCompliant / partnerLedger.deliveryMetrics.totalDeliveries) * 100;

    // Reward for successful delivery
    partnerLedger.addReward(10, 'Successful emergency delivery');

    partnerLedger.calculateTrustScores();
    await partnerLedger.save();

    // Update requesting hospital (borrower) ledger
    let requestingLedger = await HospitalTrustLedger.findOne({
      hospitalId: request.requestingHospital.hospitalId
    });

    if (!requestingLedger) {
      requestingLedger = new HospitalTrustLedger({
        hospitalId: request.requestingHospital.hospitalId,
        hospitalName: request.requestingHospital.hospitalName
      });
    }

    requestingLedger.recordTransaction('BORROWED', request.unitsCommitted);
    requestingLedger.calculateTrustScores();
    await requestingLedger.save();

  } catch (error) {
    console.error('Error updating trust ledgers:', error);
  }
}

module.exports = exports;
