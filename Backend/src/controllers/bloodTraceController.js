const bloodTracingService = require('../services/bloodTracingService');
const BloodUnit = require('../models/BloodUnit');
const BloodLifecycleEvent = require('../models/BloodLifecycleEvent');

/**
 * Blood Trace Controller
 * 
 * Endpoints:
 * GET  /blood/trace/:unitId                - Public: Get anonymized blood trace
 * POST /blood/create                       - Admin: Create new blood unit
 * GET  /blood/my-donations                 - Donor: Get all their blood units
 * POST /blood/transfer/initiate            - Admin: Initiate transfer
 * POST /blood/transfer/complete            - Admin: Complete transfer
 * POST /blood/usage/record                 - Hospital: Record usage
 * GET  /blood/unit/:id                     - Admin: Get full unit details
 * GET  /blood/monitoring/status            - Admin: Get AI monitoring status
 * POST /blood/monitoring/run               - Admin: Run AI monitoring
 */

// ============================================================================
// TRACE BLOOD UNIT (PUBLIC)
// ============================================================================

const traceBloodUnit = async (req, res) => {
  try {
    const { unitId } = req.params;

    if (!unitId) {
      return res.status(400).json({
        success: false,
        message: 'Unit ID is required'
      });
    }

    // Allow both MongoDB ID and unit unique ID
    let query = {};
    if (unitId.startsWith('BU-')) {
      query = { unitId };
    } else {
      query = { _id: unitId };
    }

    const trace = await bloodTracingService.traceBloodUnit(unitId);

    return res.status(200).json({
      success: true,
      data: trace
    });
  } catch (err) {
    console.error('Error tracing blood unit:', err.message);
    return res.status(500).json({
      success: false,
      message: err.message || 'Error retrieving blood trace',
      statusCode: 500
    });
  }
};

// ============================================================================
// CREATE BLOOD UNIT (ADMIN/COLLECTION_CENTER)
// ============================================================================

const createBloodUnit = async (req, res) => {
  try {
    const { donorId, bloodGroup, component, volume } = req.body;

    // Validation
    if (!donorId || !bloodGroup || !component) {
      return res.status(400).json({
        success: false,
        message: 'donorId, bloodGroup, and component are required',
        statusCode: 400
      });
    }

    const validBloodGroups = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
    if (!validBloodGroups.includes(bloodGroup)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid blood group',
        statusCode: 400
      });
    }

    const validComponents = ['WHOLE_BLOOD', 'RED_CELLS', 'PLASMA', 'PLATELETS', 'CRYOPRECIPITATE', 'WHITE_CELLS'];
    if (!validComponents.includes(component)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid component type',
        statusCode: 400
      });
    }

    const bloodUnit = await bloodTracingService.createBloodUnit(
      donorId,
      bloodGroup,
      component,
      volume || 450
    );

    return res.status(201).json({
      success: true,
      message: 'Blood unit created successfully',
      data: bloodUnit
    });
  } catch (err) {
    console.error('Error creating blood unit:', err.message);
    return res.status(500).json({
      success: false,
      message: err.message || 'Error creating blood unit',
      statusCode: 500
    });
  }
};

// ============================================================================
// DONOR: GET MY BLOOD DONATIONS
// ============================================================================

const getDonorBloodUnits = async (req, res) => {
  try {
    const donorId = req.user?.id; // From auth middleware

    if (!donorId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        statusCode: 401
      });
    }

    const traces = await bloodTracingService.getDonorBloodUnitTraces(donorId);

    // Format for frontend with "impact" messaging
    const formattedTraces = traces.map(unit => ({
      ...unit,
      donationMessage: unit.impactInfo?.wasUsed
        ? unit.impactInfo.outcomeMessage
        : unit.status === 'EXPIRED'
        ? 'This unit expired before it could be used'
        : 'This unit is currently in our blood bank inventory',
      donationIcon: unit.impactInfo?.wasUsed ? '❤️' : '🩸'
    }));

    return res.status(200).json({
      success: true,
      count: formattedTraces.length,
      data: formattedTraces
    });
  } catch (err) {
    console.error('Error getting donor blood units:', err.message);
    return res.status(500).json({
      success: false,
      message: err.message || 'Error retrieving your donations',
      statusCode: 500
    });
  }
};

// ============================================================================
// TRANSFER: INITIATE
// ============================================================================

const initiateTransfer = async (req, res) => {
  try {
    const { unitId, toFacility, toFacilityName } = req.body;
    const recordedBy = req.user?.id;

    if (!unitId || !toFacility || !toFacilityName) {
      return res.status(400).json({
        success: false,
        message: 'unitId, toFacility, and toFacilityName are required',
        statusCode: 400
      });
    }

    const bloodUnit = await bloodTracingService.initiateTransfer(
      unitId,
      toFacility,
      toFacilityName,
      recordedBy
    );

    return res.status(200).json({
      success: true,
      message: 'Transfer initiated',
      data: bloodUnit
    });
  } catch (err) {
    console.error('Error initiating transfer:', err.message);
    return res.status(500).json({
      success: false,
      message: err.message || 'Error initiating transfer',
      statusCode: 500
    });
  }
};

// ============================================================================
// TRANSFER: COMPLETE
// ============================================================================

const completeTransfer = async (req, res) => {
  try {
    const { unitId, facility, facilityName, metadata } = req.body;
    const recordedBy = req.user?.id;

    if (!unitId || !facility || !facilityName) {
      return res.status(400).json({
        success: false,
        message: 'unitId, facility, and facilityName are required',
        statusCode: 400
      });
    }

    const bloodUnit = await bloodTracingService.completeTransfer(
      unitId,
      facility,
      facilityName,
      recordedBy,
      metadata
    );

    return res.status(200).json({
      success: true,
      message: 'Transfer completed',
      data: bloodUnit
    });
  } catch (err) {
    console.error('Error completing transfer:', err.message);
    return res.status(500).json({
      success: false,
      message: err.message || 'Error completing transfer',
      statusCode: 500
    });
  }
};

// ============================================================================
// USAGE: RECORD TRANSFUSION
// ============================================================================

const recordUsage = async (req, res) => {
  try {
    const { unitId, hospital, ageGroup, procedure, urgency, outcome } = req.body;
    const recordedBy = req.user?.id;

    if (!unitId || !hospital) {
      return res.status(400).json({
        success: false,
        message: 'unitId and hospital are required',
        statusCode: 400
      });
    }

    const bloodUnit = await bloodTracingService.recordUsage(
      unitId,
      hospital,
      ageGroup || 'UNKNOWN',
      procedure || 'OTHER',
      urgency || 'ROUTINE',
      outcome || 'SUCCESSFUL',
      recordedBy
    );

    return res.status(200).json({
      success: true,
      message: 'Usage recorded successfully',
      data: bloodUnit
    });
  } catch (err) {
    console.error('Error recording usage:', err.message);
    return res.status(500).json({
      success: false,
      message: err.message || 'Error recording usage',
      statusCode: 500
    });
  }
};

// ============================================================================
// GET BLOOD UNIT DETAILS (ADMIN)
// ============================================================================

const getBloodUnitDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const bloodUnit = await BloodUnit.findById(id)
      .populate('donorId', 'fullName email')
      .populate('currentLocation.facility', 'hospitalName')
      .populate('usageInfo.hospital', 'hospitalName address');

    if (!bloodUnit) {
      return res.status(404).json({
        success: false,
        message: 'Blood unit not found',
        statusCode: 404
      });
    }

    // Get all lifecycle events
    const events = await BloodLifecycleEvent.find({ unitId: id })
      .sort({ timestamp: -1 })
      .populate('recordedBy', 'name email');

    return res.status(200).json({
      success: true,
      data: {
        unit: bloodUnit,
        events
      }
    });
  } catch (err) {
    console.error('Error getting blood unit details:', err.message);
    return res.status(500).json({
      success: false,
      message: err.message || 'Error retrieving blood unit',
      statusCode: 500
    });
  }
};

// ============================================================================
// AI MONITORING: GET STATUS
// ============================================================================

const getMonitoringStatus = async (req, res) => {
  try {
    const totalUnits = await BloodUnit.countDocuments();
    const expiringUnits = await BloodUnit.countDocuments({
      status: { $in: ['COLLECTED', 'STORED', 'RESERVED'] },
      expiryDate: { $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }
    });

    const inTransit = await BloodUnit.countDocuments({ status: 'IN_TRANSIT' });
    const transfused = await BloodUnit.countDocuments({ status: 'TRANSFUSED' });

    const alerts = await BloodLifecycleEvent.find({ alerts: { $exists: true, $ne: [] } })
      .countDocuments();

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalUnits,
          expiringUnits,
          inTransit,
          transfused,
          activeAlerts: alerts
        },
        metrics: {
          utilizationRate: totalUnits > 0 ? ((transfused / totalUnits) * 100).toFixed(2) : 0,
          alertRate: totalUnits > 0 ? ((alerts / totalUnits) * 100).toFixed(2) : 0
        }
      }
    });
  } catch (err) {
    console.error('Error getting monitoring status:', err.message);
    return res.status(500).json({
      success: false,
      message: err.message || 'Error retrieving monitoring status',
      statusCode: 500
    });
  }
};

// ============================================================================
// AI MONITORING: RUN CHECKS
// ============================================================================

const runAIMonitoring = async (req, res) => {
  try {
    const results = await bloodTracingService.runAIMonitoring();

    return res.status(200).json({
      success: true,
      message: 'AI monitoring completed',
      data: results
    });
  } catch (err) {
    console.error('Error running AI monitoring:', err.message);
    return res.status(500).json({
      success: false,
      message: err.message || 'Error running AI monitoring',
      statusCode: 500
    });
  }
};

// ============================================================================
// GET LIFECYCLE EVENTS FOR UNIT
// ============================================================================

const getUnitTimeline = async (req, res) => {
  try {
    const { unitId } = req.params;

    const events = await BloodLifecycleEvent.find({ unitId })
      .sort({ timestamp: 1 })
      .populate('recordedBy', 'name email');

    if (events.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No events found for this unit',
        statusCode: 404
      });
    }

    // Format timeline
    const timeline = events.map(event => ({
      id: event._id,
      eventType: event.eventType,
      timestamp: event.timestamp,
      location: event.location,
      facility: event.facilityName,
      description: event.description,
      procedure: event.anonymizedPatientInfo?.procedure,
      urgency: event.anonymizedPatientInfo?.urgency,
      outcome: event.outcome?.message,
      alerts: event.alerts || []
    }));

    return res.status(200).json({
      success: true,
      count: timeline.length,
      data: timeline
    });
  } catch (err) {
    console.error('Error getting unit timeline:', err.message);
    return res.status(500).json({
      success: false,
      message: err.message || 'Error retrieving timeline',
      statusCode: 500
    });
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  traceBloodUnit,
  createBloodUnit,
  getDonorBloodUnits,
  initiateTransfer,
  completeTransfer,
  recordUsage,
  getBloodUnitDetails,
  getMonitoringStatus,
  runAIMonitoring,
  getUnitTimeline
};
