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

/**
 * Get doctor dashboard overview
 */
exports.getDoctorOverview = async (req, res) => {
  try {
    const doctorId = req.user.userId;

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
        availabilityStatus: 'on_call',
        emergencyTier: 'tier2_urgent',
        activeConsults: 2
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

    // Add dummy data if no real data exists
    if (emergencyAlerts.length === 0) {
      emergencyAlerts = [
        {
          consultId: 'EC-DEMO-001',
          consultType: 'emergency_transfusion',
          urgencyLevel: 'critical',
          medicalQuery: 'NH-16 accident casualties. Multiple patients with massive hemorrhage. Require immediate O-, B+ units. Current stock critically low.',
          createdAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
          requestingHospitalName: 'King George Hospital (KGH), Visakhapatnam'
        },
        {
          consultId: 'EC-DEMO-002',
          consultType: 'blood_safety',
          urgencyLevel: 'urgent',
          medicalQuery: 'Post-transfusion reaction in ICU patient. Fever 102°F, rash developing. Need immediate consultation.',
          createdAt: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
          requestingHospitalName: 'Apollo Hospital, Visakhapatnam'
        }
      ];
    }

    // Add dummy pending counts if all are zero
    const dummyPending = {
      validations: pendingValidations || 5,
      consults: pendingConsults || 3,
      advisories: activeAdvisories || 2,
      camps: upcomingCamps || 1
    };

    res.json({
      success: true,
      data: {
        profile: {
          name: profile.fullName,
          registrationNumber: profile.medicalRegistrationNumber || 'MED-2024-12345',
          specialization: profile.specialization || 'Hematology',
          affiliatedHospitals: profile.affiliatedHospitals && profile.affiliatedHospitals.length > 0 
            ? profile.affiliatedHospitals 
            : [
                { hospitalName: 'King George Hospital (KGH)', city: 'Visakhapatnam', isPrimary: true },
                { hospitalName: 'Apollo Hospital Visakhapatnam', city: 'Visakhapatnam', isPrimary: false },
                { hospitalName: 'GITAM Institute of Medical Sciences', city: 'Visakhapatnam', isPrimary: false }
              ]
        },
        availability: {
          status: availability.availabilityStatus || availability.status,
          emergencyTier: availability.emergencyTier,
          activeConsults: availability.activeConsults
        },
        pending: dummyPending,
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
    const doctorId = req.user.userId;
    const { status = 'Quarantined', page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    // Get units that need validation
    let units = await BloodInventory.find({
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

    let total = await BloodInventory.countDocuments({ status });

    // Add dummy data if no real units exist
    if (units.length === 0) {
      units = [
        {
          _id: 'dummy-unit-1',
          bloodUnitId: 'VZG-BU-001',
          bloodGroup: 'O+',
          storageType: 'Whole Blood',
          volume: 450,
          collectionDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          expiryDate: new Date(Date.now() + 33 * 24 * 60 * 60 * 1000),
          status: 'Quarantined',
          hospitalId: {
            hospitalName: 'King George Hospital (KGH)',
            location: { city: 'Visakhapatnam', state: 'Andhra Pradesh' }
          },
          donorInfo: {
            donorBloodGroup: 'O+'
          }
        },
        {
          _id: 'dummy-unit-2',
          bloodUnitId: 'VZG-BU-002',
          bloodGroup: 'A+',
          storageType: 'Plasma',
          volume: 250,
          collectionDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          expiryDate: new Date(Date.now() + 34 * 24 * 60 * 60 * 1000),
          status: 'Quarantined',
          hospitalId: {
            hospitalName: 'Apollo Hospital Visakhapatnam',
            location: { city: 'Visakhapatnam', state: 'Andhra Pradesh' }
          },
          donorInfo: {
            donorBloodGroup: 'A+'
          }
        },
        {
          _id: 'dummy-unit-3',
          bloodUnitId: 'VZG-BU-003',
          bloodGroup: 'B-',
          storageType: 'Red Cells',
          volume: 350,
          collectionDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          expiryDate: new Date(Date.now() + 32 * 24 * 60 * 60 * 1000),
          status: 'Quarantined',
          hospitalId: {
            hospitalName: 'GITAM Institute of Medical Sciences',
            location: { city: 'Visakhapatnam', state: 'Andhra Pradesh' }
          },
          donorInfo: {
            donorBloodGroup: 'B-'
          }
        },
        {
          _id: 'dummy-unit-4',
          bloodUnitId: 'VZG-BU-004',
          bloodGroup: 'AB+',
          storageType: 'Platelets',
          volume: 200,
          collectionDate: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000),
          expiryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
          status: 'Quarantined',
          hospitalId: {
            hospitalName: 'Seven Hills Hospital',
            location: { city: 'Visakhapatnam', state: 'Andhra Pradesh' }
          },
          donorInfo: {
            donorBloodGroup: 'AB+'
          }
        },
        {
          _id: 'dummy-unit-5',
          bloodUnitId: 'VZG-BU-005',
          bloodGroup: 'O-',
          storageType: 'Whole Blood',
          volume: 450,
          collectionDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
          expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Expiring soon
          status: 'Quarantined',
          hospitalId: {
            hospitalName: 'Care Hospital Visakhapatnam',
            location: { city: 'Visakhapatnam', state: 'Andhra Pradesh' }
          },
          donorInfo: {
            donorBloodGroup: 'O-'
          }
        }
      ];
      total = 5;
    }

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
    const doctorId = req.user.userId;
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
    const doctorId = req.user.userId;
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
    const doctorId = req.user.userId;
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
    const doctorId = req.user.userId;
    const { status = 'pending', page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    let consults = await EmergencyConsult.find({ doctorId, status })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('requestingHospitalId', 'hospitalName location')
      .populate('requestedBy', 'name email');

    let total = await EmergencyConsult.countDocuments({ doctorId, status });

    // Add dummy data if no real consults exist
    if (consults.length === 0) {
      consults = [
        {
          _id: 'dummy-consult-1',
          consultId: 'VZG-EC-001',
          requestingHospitalName: 'King George Hospital (KGH), Visakhapatnam',
          consultType: 'emergency_transfusion',
          urgencyLevel: 'critical',
          patientContext: {
            ageRange: '45-50',
            gender: 'Male',
            bloodGroupRequired: 'O-',
            estimatedUnitsNeeded: 4,
            clinicalCondition: 'NH-16 highway accident victim. Multiple trauma with severe internal bleeding. BP: 85/55, HR: 125'
          },
          medicalQuery: 'Multiple casualties from NH-16 accident. Patient requires massive transfusion protocol. Current O- stock critically low. Requesting guidance on alternative products and emergency procurement.',
          createdAt: new Date(Date.now() - 20 * 60 * 1000), // 20 minutes ago
          status: 'pending'
        },
        {
          _id: 'dummy-consult-2',
          consultId: 'VZG-EC-002',
          requestingHospitalName: 'Apollo Hospital, Visakhapatnam',
          consultType: 'blood_safety',
          urgencyLevel: 'urgent',
          patientContext: {
            ageRange: '28-35',
            gender: 'Female',
            bloodGroupRequired: 'A+',
            estimatedUnitsNeeded: 2,
            clinicalCondition: 'Post-partum hemorrhage, Hb dropped from 11 to 7 g/dL'
          },
          medicalQuery: 'Patient developed fever 2 hours post-transfusion (temp 101.5°F). Mild urticaria noted. Need advice on investigation protocol and whether to continue transfusion.',
          createdAt: new Date(Date.now() - 65 * 60 * 1000), // 65 minutes ago
          status: 'pending'
        },
        {
          _id: 'dummy-consult-3',
          consultId: 'VZG-EC-003',
          requestingHospitalName: 'GITAM Medical College Hospital',
          consultType: 'adverse_reaction',
          urgencyLevel: 'urgent',
          patientContext: {
            ageRange: '60-65',
            gender: 'Male',
            bloodGroupRequired: 'B+',
            estimatedUnitsNeeded: 1,
            clinicalCondition: 'Leukemia patient receiving chemotherapy'
          },
          medicalQuery: 'Patient developed dyspnea and hives 15 minutes into transfusion. Transfusion stopped. Vitals: BP 130/85, SpO2 94%. Requesting immediate management consultation.',
          createdAt: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
          status: 'pending'
        },
        {
          _id: 'dummy-consult-4',
          consultId: 'VZG-EC-004',
          requestingHospitalName: 'Seven Hills Hospital, Visakhapatnam',
          consultType: 'massive_hemorrhage',
          urgencyLevel: 'critical',
          patientContext: {
            ageRange: '38-42',
            gender: 'Female',
            bloodGroupRequired: 'AB+',
            estimatedUnitsNeeded: 6,
            clinicalCondition: 'Ruptured ectopic pregnancy, active bleeding in OT'
          },
          medicalQuery: 'URGENT: Patient on OT table with massive hemorrhage. Already received 4 units AB+. BP 90/60, unstable. Need protocol for continued transfusion support.',
          createdAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
          status: 'pending'
        }
      ];
      total = 4;
    }

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
    const doctorId = req.user.userId;
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
    const doctorId = req.user.userId;
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
    const doctorId = req.user.userId;
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

    let camps = await BloodCamp.find({
      'medicalOversight.assignedDoctors': doctorId,
      ...dateQuery
    })
    .sort({ startDate: 1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('organizedBy', 'name email');

    let total = await BloodCamp.countDocuments({
      'medicalOversight.assignedDoctors': doctorId,
      ...dateQuery
    });

    // Add dummy data if no real camps exist
    if (camps.length === 0) {
      camps = [
        {
          _id: 'dummy-camp-1',
          campName: 'Corporate Blood Donation Drive - TCS Visakhapatnam',
          startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
          endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          venue: {
            name: 'TCS SEZ Campus',
            address: 'TCS SEZ, Rushikonda, Madhurawada',
            city: 'Visakhapatnam',
            state: 'Andhra Pradesh',
            type: 'Indoor'
          },
          expectedDonors: 150,
          capacity: 200,
          medicalOversight: {
            preCampApproval: false,
            postCampApproval: false
          }
        },
        {
          _id: 'dummy-camp-2',
          campName: 'Community Blood Camp - Rotary Club Vizag',
          startDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000), // 12 days from now
          endDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
          venue: {
            name: 'Rotary Club Community Hall',
            address: 'MVP Colony, Sector 1',
            city: 'Visakhapatnam',
            state: 'Andhra Pradesh',
            type: 'Indoor'
          },
          expectedDonors: 100,
          capacity: 120,
          medicalOversight: {
            preCampApproval: false,
            postCampApproval: false
          }
        },
        {
          _id: 'dummy-camp-3',
          campName: 'University Blood Donation Camp - GITAM',
          startDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000), // 18 days from now
          endDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
          venue: {
            name: 'GITAM University Student Center',
            address: 'GITAM Campus, Rushikonda',
            city: 'Visakhapatnam',
            state: 'Andhra Pradesh',
            type: 'Indoor'
          },
          expectedDonors: 250,
          capacity: 300,
          medicalOversight: {
            preCampApproval: true,
            preCampApprovedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            postCampApproval: false
          }
        }
      ];
      total = 3;
    }

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
    const doctorId = req.user.userId;
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
    const doctorId = req.user.userId;
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
    const doctorId = req.user.userId;
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
    const doctorId = req.user.userId;
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

module.exports = exports;
