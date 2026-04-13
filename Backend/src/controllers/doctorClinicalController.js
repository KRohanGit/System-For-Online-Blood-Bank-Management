const DoctorMedicalValidation = require('../models/DoctorMedicalValidation');
const BloodInventory = require('../models/BloodInventory');
const DonationAppointment = require('../models/DonationAppointment');
const PublicUser = require('../models/PublicUser');
const EmergencyConsult = require('../models/EmergencyConsult');
const ClinicalAdvisory = require('../models/ClinicalAdvisory');
const DoctorAvailability = require('../models/DoctorAvailability');
const DoctorProfile = require('../models/DoctorProfile');
const HospitalProfile = require('../models/HospitalProfile');
const BloodCamp = require('../models/BloodCamp');
const ClinicalCase = require('../models/ClinicalCase');
const CaseEmbedding = require('../models/CaseEmbedding');
const mlService = require('../services/ml/mlService');

function generateCaseId() {
  const ts = Date.now();
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CASE-${ts}-${suffix}`;
}

function parseBodyAsNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

async function resolveDoctorHospitalId(doctorId) {
  const profile = await DoctorProfile.findOne({ userId: doctorId }).select('affiliatedHospitals');
  if (profile?.affiliatedHospitals?.length) {
    const primary = profile.affiliatedHospitals.find((item) => item?.isPrimary && item?.hospitalId);
    if (primary?.hospitalId) {
      return primary.hospitalId;
    }

    const withHospitalId = profile.affiliatedHospitals.find((item) => item?.hospitalId);
    if (withHospitalId?.hospitalId) {
      return withHospitalId.hospitalId;
    }

    // Backward-compatibility: allow old shape where the value itself is an ObjectId/string.
    const first = profile.affiliatedHospitals[0];
    if (first) {
      return first;
    }
  }

  const hospitalProfile = await HospitalProfile.findOne({ userId: doctorId }).select('_id');
  if (hospitalProfile?._id) {
    return hospitalProfile._id;
  }

  return null;
}

/**
 * Get doctor dashboard overview
 */
exports.getDoctorOverview = async (req, res) => {
  try {
    const doctorId = req.userId || req.user?._id;

    // Get doctor profile
    const profile = await DoctorProfile.findOne({ userId: doctorId });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found' });
    }

    // Get availability
    let availability = await DoctorAvailability.findOne({ doctorId });

    // Create default availability if not exists
    if (!availability) {
      availability = {
        availabilityStatus: 'off_duty',
        emergencyTier: 'tier2_urgent',
        activeConsults: 0
      };
    }

    // Count pending items
    const [pendingValidations, pendingConsults, activeAdvisories, upcomingCamps] = await Promise.all([
      DoctorMedicalValidation.countDocuments({ doctorId, validationStatus: 'hold_for_recheck' }),
      EmergencyConsult.countDocuments({ doctorId, status: 'pending' }),
      ClinicalAdvisory.countDocuments({ doctorId, reviewStatus: 'pending_review' }),
      BloodCamp.countDocuments({
        'medicalOversight.assignedDoctors': doctorId,
        startDate: { $gte: new Date() }
      })
    ]);

    // Get emergency alerts (recent high-urgency items)
    let emergencyAlerts = await EmergencyConsult.find({
      doctorId,
      status: 'pending',
      urgencyLevel: { $in: ['critical', 'urgent'] }
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('consultId consultType urgencyLevel medicalQuery createdAt requestingHospitalName');

    res.json({
      success: true,
      data: {
        profile: {
          name: profile.fullName,
          registrationNumber: profile.medicalRegistrationNumber || null,
          specialization: profile.specialization || null,
          affiliatedHospitals: profile.affiliatedHospitals && profile.affiliatedHospitals.length > 0 
            ? profile.affiliatedHospitals 
            : []
        },
        availability: {
          status: availability?.availabilityStatus || availability?.status || 'off_duty',
          emergencyTier: availability?.emergencyTier || null,
          activeConsults: availability?.activeConsults || 0
        },
        pending: {
          validations: pendingValidations,
          consults: pendingConsults,
          advisories: activeAdvisories,
          camps: upcomingCamps
        },
        emergencyAlerts
      }
    });
  } catch (error) {
    console.error('Get doctor overview error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard overview', error: error.message });
  }
};

/**
 * Get blood units pending medical validation
 */
exports.getBloodUnitsForValidation = async (req, res) => {
  try {
    const doctorId = req.userId || req.user?._id;
    const { status = 'Quarantined', page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    // Get units that need validation
    const units = await BloodInventory.find({
      status,
      _id: {
        $nin: await DoctorMedicalValidation.distinct('targetId', {
          doctorId,
          validationType: 'blood_unit',
          validationStatus: { $in: ['approved', 'rejected'] }
        })
      }
    })
    .sort({ collectionDate: 1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('hospitalId', 'hospitalName location');

    const total = await BloodInventory.countDocuments({ status });

    res.json({
      success: true,
      data: {
        units,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get blood units error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch blood units', error: error.message });
  }
};

/**
 * Validate a blood unit
 */
exports.validateBloodUnit = async (req, res) => {
  try {
    const doctorId = req.userId || req.user?._id;
    const { unitId } = req.params;
    const {
      validationStatus,
      medicalNotes,
      rejectionReason,
      recheckParameters,
      labResultsReviewed
    } = req.body;

    // Validate input
    if (!['approved', 'hold_for_recheck', 'rejected'].includes(validationStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid validation status' });
    }

    if (!medicalNotes || medicalNotes.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Medical notes are required' });
    }

    // Get blood unit
    const unit = await BloodInventory.findById(unitId);
    if (!unit) {
      return res.status(404).json({ success: false, message: 'Blood unit not found' });
    }

    // Get doctor profile
    const profile = await DoctorProfile.findOne({ userId: doctorId });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found' });
    }

    // Check for self-collection (ethical violation)
    let selfCollectedUnit = false;
    if (unit.lifecycle && unit.lifecycle.length > 0) {
      const collectedBy = unit.lifecycle[0].performedBy;
      if (collectedBy && collectedBy.toString() === doctorId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Ethical violation: Cannot approve own collected unit'
        });
      }
    }

    // Create validation record
    const validation = new DoctorMedicalValidation({
      validationType: 'blood_unit',
      targetId: unitId,
      targetModel: 'BloodInventory',
      doctorId,
      doctorName: profile.fullName,
      medicalRegistrationNumber: profile.medicalRegistrationNumber,
      validationStatus,
      medicalNotes,
      rejectionReason: validationStatus === 'rejected' ? rejectionReason : undefined,
      recheckParameters: validationStatus === 'hold_for_recheck' ? recheckParameters : undefined,
      labResultsReviewed,
      ipAddress: req.ip,
      timestamp: new Date()
    });

    await validation.save();

    // Update blood unit status
    if (validationStatus === 'approved') {
      unit.status = 'Available';
      unit.lifecycle.push({
        stage: 'Medically Approved',
        performedBy: doctorId,
        notes: `Approved by Dr. ${profile.fullName}: ${medicalNotes}`
      });
    } else if (validationStatus === 'rejected') {
      unit.status = 'Expired'; // Mark as unusable
      unit.lifecycle.push({
        stage: 'Rejected',
        performedBy: doctorId,
        notes: `Rejected by Dr. ${profile.fullName}: ${rejectionReason}`
      });
    } else if (validationStatus === 'hold_for_recheck') {
      unit.status = 'Quarantined';
      unit.lifecycle.push({
        stage: 'Hold for Recheck',
        performedBy: doctorId,
        notes: `Recheck required: ${recheckParameters.join(', ')}`
      });
    }

    await unit.save();

    res.json({
      success: true,
      message: 'Blood unit validation completed',
      data: { validation, unit }
    });
  } catch (error) {
    console.error('Validate blood unit error:', error);
    res.status(500).json({ success: false, message: 'Failed to validate blood unit', error: error.message });
  }
};

/**
 * Get blood requests for medical review
 */
exports.getBloodRequestsForReview = async (req, res) => {
  try {
    const doctorId = req.userId || req.user?._id;
    const { status = 'Scheduled', urgency, page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    const query = { status };
    if (urgency) query.urgency = urgency;

    const requests = await DonationAppointment.find(query)
      .sort({ appointmentDate: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('donorId', 'name email phone bloodGroup')
      .populate('hospitalId', 'hospitalName location');

    const total = await DonationAppointment.countDocuments(query);

    res.json({
      success: true,
      data: {
        requests,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get blood requests error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch blood requests', error: error.message });
  }
};

/**
 * Review blood request urgency
 */
exports.reviewBloodRequestUrgency = async (req, res) => {
  try {
    const doctorId = req.userId || req.user?._id;
    const { requestId } = req.params;
    const {
      validatedUrgency,
      clinicalJustification,
      misuseFlagged,
      medicalNotes
    } = req.body;

    if (!['Critical', 'Urgent', 'Routine'].includes(validatedUrgency)) {
      return res.status(400).json({ success: false, message: 'Invalid urgency level' });
    }

    const request = await DonationAppointment.findById(requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Blood request not found' });
    }

    const profile = await DoctorProfile.findOne({ userId: doctorId });

    // Determine validation status
    let validationStatus = 'urgency_approved';
    if (request.urgency !== validatedUrgency) {
      validationStatus = 'urgency_downgraded';
    }
    if (misuseFlagged) {
      validationStatus = 'escalated';
    }

    // Create validation record
    const validation = new DoctorMedicalValidation({
      validationType: 'blood_request',
      targetId: requestId,
      targetModel: 'DonationAppointment',
      doctorId,
      doctorName: profile.fullName,
      medicalRegistrationNumber: profile.medicalRegistrationNumber,
      validationStatus,
      medicalNotes,
      urgencyValidation: {
        originalUrgency: request.urgency,
        validatedUrgency,
        clinicalJustification,
        misuseFlagged: misuseFlagged || false
      },
      timestamp: new Date()
    });

    await validation.save();

    // Update request if urgency changed
    if (request.urgency !== validatedUrgency) {
      request.urgency = validatedUrgency;
      request.notes = (request.notes || '') + `\n[Doctor Review] Urgency updated to ${validatedUrgency} by Dr. ${profile.fullName}`;
      await request.save();
    }

    res.json({
      success: true,
      message: 'Blood request review completed',
      data: { validation, request }
    });
  } catch (error) {
    console.error('Review blood request error:', error);
    res.status(500).json({ success: false, message: 'Failed to review blood request', error: error.message });
  }
};

/**
 * Get emergency consults for doctor
 */
exports.getEmergencyConsults = async (req, res) => {
  try {
    const doctorId = req.userId || req.user?._id;
    const { status = 'pending', page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    const consults = await EmergencyConsult.find({ doctorId, status })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('requestingHospitalId', 'hospitalName location')
      .populate('requestedBy', 'name email');

    const total = await EmergencyConsult.countDocuments({ doctorId, status });

    res.json({
      success: true,
      data: {
        consults,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get emergency consults error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch consults', error: error.message });
  }
};

/**
 * Respond to emergency consult
 */
exports.respondToConsult = async (req, res) => {
  try {
    const doctorId = req.userId || req.user?._id;
    const { consultId } = req.params;
    const { action, declineReason, medicalAdvisory } = req.body;

    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    const consult = await EmergencyConsult.findOne({ _id: consultId, doctorId });
    if (!consult) {
      return res.status(404).json({ success: false, message: 'Consult not found' });
    }

    if (consult.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Consult already processed' });
    }

    const profile = await DoctorProfile.findOne({ userId: doctorId });

    if (action === 'accept') {
      consult.status = 'accepted';
      consult.responseTime = new Date();
      
      if (medicalAdvisory) {
        consult.medicalAdvisory = {
          ...medicalAdvisory,
          advisoryProvidedAt: new Date()
        };
        consult.status = 'completed';
        consult.completedAt = new Date();
      }

      consult.consultLog.push({
        actor: profile.fullName,
        action: 'Accepted consult',
        notes: medicalAdvisory?.advisoryNote || 'Consult accepted'
      });

      // Update doctor availability
      const availability = await DoctorAvailability.findOne({ doctorId });
      if (availability) {
        await availability.updateWorkload(1);
        availability.stats.totalConsultsAccepted += 1;
        availability.stats.lastConsultDate = new Date();
        await availability.save();
      }
    } else {
      consult.status = 'declined';
      consult.responseTime = new Date();
      consult.declineReason = declineReason;

      consult.consultLog.push({
        actor: profile.fullName,
        action: 'Declined consult',
        notes: declineReason
      });

      // Update doctor stats
      const availability = await DoctorAvailability.findOne({ doctorId });
      if (availability) {
        availability.stats.totalConsultsDeclined += 1;
        await availability.save();
      }
    }

    await consult.save();

    res.json({
      success: true,
      message: `Consult ${action}ed successfully`,
      data: consult
    });
  } catch (error) {
    console.error('Respond to consult error:', error);
    res.status(500).json({ success: false, message: 'Failed to respond to consult', error: error.message });
  }
};

/**
 * Update doctor availability status
 */
exports.updateAvailability = async (req, res) => {
  try {
    const doctorId = req.userId || req.user?._id;
    const { availabilityStatus, emergencyTier, specializations } = req.body;

    let availability = await DoctorAvailability.findOne({ doctorId });
    
    if (!availability) {
      // Create new availability record
      const profile = await DoctorProfile.findOne({ userId: doctorId });
      availability = new DoctorAvailability({
        doctorId,
        availabilityStatus: availabilityStatus || 'off_duty',
        emergencyTier: emergencyTier || 'tier2_urgent',
        specializations: specializations || [profile.specialization]
      });
    } else {
      // Update existing
      if (availabilityStatus) availability.availabilityStatus = availabilityStatus;
      if (emergencyTier) availability.emergencyTier = emergencyTier;
      if (specializations) availability.specializations = specializations;
      availability.lastStatusUpdate = new Date();
    }

    await availability.save();

    res.json({
      success: true,
      message: 'Availability updated successfully',
      data: availability
    });
  } catch (error) {
    console.error('Update availability error:', error);
    res.status(500).json({ success: false, message: 'Failed to update availability', error: error.message });
  }
};

/**
 * Get camps assigned to doctor
 */
exports.getCampsForOversight = async (req, res) => {
  try {
    const doctorId = req.userId || req.user?._id;
    const { phase = 'upcoming', page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    let dateQuery = {};
    if (phase === 'upcoming') {
      dateQuery = { startDate: { $gte: new Date() } };
    } else if (phase === 'ongoing') {
      dateQuery = {
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() }
      };
    } else if (phase === 'completed') {
      dateQuery = { endDate: { $lt: new Date() } };
    }

    const camps = await BloodCamp.find({
      'medicalOversight.assignedDoctors': doctorId,
      ...dateQuery
    })
    .sort({ startDate: 1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('organizedBy', 'name email');

    const total = await BloodCamp.countDocuments({
      'medicalOversight.assignedDoctors': doctorId,
      ...dateQuery
    });

    res.json({
      success: true,
      data: {
        camps,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get camps error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch camps', error: error.message });
  }
};

/**
 * Submit camp oversight report
 */
exports.submitCampOversight = async (req, res) => {
  try {
    const doctorId = req.userId || req.user?._id;
    const { campId } = req.params;
    const {
      oversightPhase,
      approvalStatus,
      medicalNotes,
      safetyViolations,
      recommendations
    } = req.body;

    if (!['pre_camp', 'during_camp', 'post_camp'].includes(oversightPhase)) {
      return res.status(400).json({ success: false, message: 'Invalid oversight phase' });
    }

    const camp = await BloodCamp.findById(campId);
    if (!camp) {
      return res.status(404).json({ success: false, message: 'Camp not found' });
    }

    // Check if doctor is assigned
    const isAssigned = camp.medicalOversight?.assignedDoctors?.some(
      id => id.toString() === doctorId.toString()
    );

    if (!isAssigned) {
      return res.status(403).json({ success: false, message: 'Not assigned to this camp' });
    }

    const profile = await DoctorProfile.findOne({ userId: doctorId });

    // Initialize medicalOversight if not exists
    if (!camp.medicalOversight) {
      camp.medicalOversight = {
        assignedDoctors: [doctorId],
        oversightReports: []
      };
    }

    // Add oversight report
    camp.medicalOversight.oversightReports.push({
      phase: oversightPhase,
      doctorId,
      doctorName: profile.fullName,
      reportDate: new Date(),
      approvalStatus,
      medicalNotes,
      safetyViolations: safetyViolations || [],
      recommendations: recommendations || []
    });

    // Update camp status based on approval
    if (oversightPhase === 'pre_camp') {
      camp.medicalOversight.preCampApproval = approvalStatus === 'approved';
      camp.medicalOversight.preCampApprovedBy = doctorId;
      camp.medicalOversight.preCampApprovedAt = new Date();
    } else if (oversightPhase === 'post_camp') {
      camp.medicalOversight.postCampApproval = approvalStatus === 'approved';
      camp.medicalOversight.postCampApprovedBy = doctorId;
      camp.medicalOversight.postCampApprovedAt = new Date();
    }

    await camp.save();

    res.json({
      success: true,
      message: 'Camp oversight report submitted',
      data: camp
    });
  } catch (error) {
    console.error('Submit camp oversight error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit oversight report', error: error.message });
  }
};

/**
 * Submit clinical advisory
 */
exports.submitClinicalAdvisory = async (req, res) => {
  try {
    const doctorId = req.userId || req.user?._id;
    const {
      advisoryType,
      severityLevel,
      title,
      clinicalRationale,
      recommendedActions,
      affectedEntities,
      referencedData,
      isUrgent
    } = req.body;

    const profile = await DoctorProfile.findOne({ userId: doctorId });

    const advisory = new ClinicalAdvisory({
      doctorId,
      doctorName: profile.fullName,
      doctorSpecialization: profile.specialization,
      medicalRegistrationNumber: profile.medicalRegistrationNumber,
      advisoryType,
      severityLevel,
      title,
      clinicalRationale,
      recommendedActions,
      affectedEntities,
      referencedData,
      isUrgent: isUrgent || false,
      timestamp: new Date()
    });

    await advisory.save();

    res.json({
      success: true,
      message: 'Clinical advisory submitted successfully',
      data: advisory
    });
  } catch (error) {
    console.error('Submit advisory error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit advisory', error: error.message });
  }
};

/**
 * Get doctor's clinical advisories
 */
exports.getClinicalAdvisories = async (req, res) => {
  try {
    const doctorId = req.userId || req.user?._id;
    const { reviewStatus, page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    const query = { doctorId };
    if (reviewStatus) query.reviewStatus = reviewStatus;

    const advisories = await ClinicalAdvisory.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ClinicalAdvisory.countDocuments(query);

    res.json({
      success: true,
      data: {
        advisories,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get advisories error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch advisories', error: error.message });
  }
};

/**
 * Get doctor's audit trail
 */
exports.getAuditTrail = async (req, res) => {
  try {
    const doctorId = req.userId || req.user?._id;
    const { validationType, startDate, endDate, page = 1, limit = 20 } = req.query;

    const skip = (page - 1) * limit;

    const query = { doctorId };
    if (validationType) query.validationType = validationType;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const auditRecords = await DoctorMedicalValidation.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('targetId');

    const total = await DoctorMedicalValidation.countDocuments(query);

    res.json({
      success: true,
      data: {
        auditRecords,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get audit trail error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch audit trail', error: error.message });
  }
};

/**
 * Analyze a clinical case using ML recommendations and persist anonymized case data.
 */
exports.analyzeClinicalCase = async (req, res) => {
  try {
    const doctorId = req.userId || req.user?._id;
    const {
      anonymizedPatientFeatures = {},
      treatment = {},
      topK = 10
    } = req.body || {};

    const requiredFeatureFields = [
      'age',
      'bloodGroup',
      'hemoglobinLevel',
      'bloodLossEstimate',
      'conditionType'
    ];

    const missing = requiredFeatureFields.filter((field) => anonymizedPatientFeatures[field] === undefined || anonymizedPatientFeatures[field] === null || anonymizedPatientFeatures[field] === '');
    if (missing.length) {
      return res.status(400).json({
        success: false,
        message: `Missing required patient feature(s): ${missing.join(', ')}`
      });
    }

    const hospitalId = await resolveDoctorHospitalId(doctorId);
    if (!hospitalId) {
      return res.status(400).json({
        success: false,
        message: 'Unable to resolve affiliated hospital for this doctor profile'
      });
    }

    const sanitizedFeatures = {
      age: parseBodyAsNumber(anonymizedPatientFeatures.age),
      gender: anonymizedPatientFeatures.gender || 'unknown',
      bloodGroup: anonymizedPatientFeatures.bloodGroup,
      hemoglobinLevel: parseBodyAsNumber(anonymizedPatientFeatures.hemoglobinLevel),
      bloodLossEstimate: parseBodyAsNumber(anonymizedPatientFeatures.bloodLossEstimate),
      conditionType: anonymizedPatientFeatures.conditionType,
      vitals: {
        systolicBP: parseBodyAsNumber(anonymizedPatientFeatures?.vitals?.systolicBP, null),
        diastolicBP: parseBodyAsNumber(anonymizedPatientFeatures?.vitals?.diastolicBP, null),
        heartRate: parseBodyAsNumber(anonymizedPatientFeatures?.vitals?.heartRate, null)
      },
      additionalClinicalContext: anonymizedPatientFeatures.additionalClinicalContext || ''
    };

    const similarCases = await mlService.findSimilarCases(sanitizedFeatures, Number(topK) || 10);
    const recommendation = await mlService.recommendTreatment(sanitizedFeatures, Number(topK) || 10);

    const treatmentPlan = {
      unitsGiven: parseBodyAsNumber(treatment.unitsGiven, recommendation?.recommendedUnits || 0),
      bloodTypeUsed: treatment.bloodTypeUsed || recommendation?.preferredBloodGroup || sanitizedFeatures.bloodGroup,
      timing: treatment.timing || 'unknown'
    };

    const prediction = await mlService.predictClinicalOutcome(sanitizedFeatures, treatmentPlan);

    const caseId = generateCaseId();
    const caseDoc = await ClinicalCase.create({
      caseId,
      anonymizedPatientFeatures: sanitizedFeatures,
      treatment: treatmentPlan,
      outcome: {
        survival: null,
        recoveryTime: null,
        complications: []
      },
      hospitalId,
      doctorId,
      aiInsights: {
        recommendationSummary: recommendation?.reasoning || null,
        confidenceScore: recommendation?.confidenceScore || null,
        predictedSurvivalProbability: prediction?.survivalProbability || null,
        predictedRiskLevel: prediction?.riskLevel || null
      },
      timestamp: new Date()
    });

    if (Array.isArray(similarCases?.queryEmbedding) && similarCases.queryEmbedding.length) {
      await CaseEmbedding.findOneAndUpdate(
        { caseId },
        {
          caseId,
          embeddingVector: similarCases.queryEmbedding,
          modelVersion: similarCases.modelVersion || 'clinical-embed-v1',
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );
    }

    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('clinical_case.created', {
          caseId,
          hospitalId: String(hospitalId),
          conditionType: sanitizedFeatures.conditionType,
          bloodGroup: sanitizedFeatures.bloodGroup,
          timestamp: new Date().toISOString()
        });
      }
    } catch (socketError) {
      console.warn('Clinical case socket emit warning:', socketError.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Clinical case analyzed and stored successfully',
      data: {
        caseId: caseDoc.caseId,
        similarCases: similarCases?.similarCases || [],
        recommendation,
        prediction
      }
    });
  } catch (error) {
    console.error('Analyze clinical case error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to analyze clinical case',
      error: error.message
    });
  }
};

/**
 * Fetch clinical cases submitted by doctor.
 */
exports.getClinicalCases = async (req, res) => {
  try {
    const doctorId = req.userId || req.user?._id;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const query = { doctorId };
    const [cases, total] = await Promise.all([
      ClinicalCase.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .select('caseId anonymizedPatientFeatures treatment outcome aiInsights timestamp')
        .lean(),
      ClinicalCase.countDocuments(query)
    ]);

    return res.json({
      success: true,
      data: {
        cases,
        pagination: {
          total,
          page: parseInt(page, 10),
          pages: Math.ceil(total / parseInt(limit, 10))
        }
      }
    });
  } catch (error) {
    console.error('Get clinical cases error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch clinical cases',
      error: error.message
    });
  }
};

/**
 * Update actual case outcome for online learning and model retraining.
 */
exports.updateClinicalCaseOutcome = async (req, res) => {
  try {
    const doctorId = req.userId || req.user?._id;
    const { caseId } = req.params;
    const { survival, recoveryTime, complications = [] } = req.body || {};

    const clinicalCase = await ClinicalCase.findOne({ caseId, doctorId });
    if (!clinicalCase) {
      return res.status(404).json({ success: false, message: 'Clinical case not found' });
    }

    if (typeof survival === 'boolean') {
      clinicalCase.outcome.survival = survival;
    }
    if (recoveryTime !== undefined) {
      clinicalCase.outcome.recoveryTime = parseBodyAsNumber(recoveryTime, null);
    }
    if (Array.isArray(complications)) {
      clinicalCase.outcome.complications = complications;
    }

    await clinicalCase.save();

    try {
      await mlService.triggerClinicalRetraining(false);
    } catch (mlError) {
      console.warn('Clinical model retraining warning:', mlError.message);
    }

    return res.json({
      success: true,
      message: 'Clinical outcome updated successfully',
      data: {
        caseId: clinicalCase.caseId,
        outcome: clinicalCase.outcome
      }
    });
  } catch (error) {
    console.error('Update clinical case outcome error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update clinical case outcome',
      error: error.message
    });
  }
};

module.exports = exports;
