const EmergencyRequest = require('../models/EmergencyRequest');
const BloodTransfer = require('../models/BloodTransfer');
const HospitalTrustLedger = require('../models/HospitalTrustLedger');
const BloodInventory = require('../models/BloodInventory');
const HospitalProfile = require('../models/HospitalProfile');
const deliveryIntelligenceService = require('../services/deliveryIntelligenceService');
const { 
  findMatchingHospitals, 
  getEscalationHospitals,
  predictResponseProbability 
} = require('../services/hospitalMatchingService');
const eventBus = require('../services/realtime/eventBus');
const mlService = require('../services/ml/mlService');
const { sendEmergencyAlertEmail } = require('../services/email.service');

const VALID_BLOOD_GROUPS = new Set(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);
const VALID_URGENCY = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

const normalizeUrgencyToSeverity = (urgency) => {
  const value = String(urgency || '').toUpperCase();
  if (value === 'CRITICAL') return 'CRITICAL';
  if (value === 'HIGH') return 'HIGH';
  return 'MODERATE';
};

const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toPointObject = (coordinates = []) => {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    return null;
  }

  const [longitude, latitude] = coordinates;
  if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) {
    return null;
  }

  return {
    latitude: Number(latitude),
    longitude: Number(longitude)
  };
};

const buildDeliverySession = async (request, transfer) => {
  const sourceHospital = await HospitalProfile.findById(request.assignedHospitalId || request.toHospitalId || request.fromHospitalId)
    .select('_id hospitalName location officialEmail phone address city state');
  const destinationHospital = await HospitalProfile.findById(request.requestingHospitalId)
    .select('_id hospitalName location officialEmail phone address city state');

  const originCoordinates = toPointObject(sourceHospital?.location?.coordinates) || toPointObject(transfer?.routeInfo?.origin ? [transfer.routeInfo.origin.longitude, transfer.routeInfo.origin.latitude] : []);
  const destinationCoordinates = toPointObject(destinationHospital?.location?.coordinates) || toPointObject(transfer?.routeInfo?.destination ? [transfer.routeInfo.destination.longitude, transfer.routeInfo.destination.latitude] : []);
  const currentLocation = transfer?.currentLocation?.latitude && transfer?.currentLocation?.longitude
    ? {
        latitude: Number(transfer.currentLocation.latitude),
        longitude: Number(transfer.currentLocation.longitude)
      }
    : originCoordinates;

  const liveEstimate = currentLocation && destinationCoordinates
    ? await deliveryIntelligenceService.estimateHospitalDelivery(
        currentLocation,
        destinationCoordinates,
        {
          priority: request.urgency,
          emergencyPriority: request.severityLevel === 'CRITICAL'
        }
      )
    : null;

  const routeCoordinates = Array.isArray(transfer?.routeInfo?.routeCoordinates) && transfer.routeInfo.routeCoordinates.length
    ? transfer.routeInfo.routeCoordinates
    : liveEstimate?.route_coordinates || [];

  const distanceRemaining = currentLocation && destinationCoordinates
    ? calculateDistanceKm(currentLocation.latitude, currentLocation.longitude, destinationCoordinates.latitude, destinationCoordinates.longitude)
    : Number(liveEstimate?.distance_km || transfer?.routeInfo?.distance || 0);

  const sessionEta = liveEstimate?.final_eta ?? Number(transfer?.estimatedTimeRemaining || 0) ?? 0;

  return {
    id: String(transfer?._id || request._id),
    requestId: String(request._id),
    transferId: transfer?._id ? String(transfer._id) : null,
    from: {
      hospitalId: String(sourceHospital?._id || request.assignedHospitalId || request.toHospitalId || request.fromHospitalId || ''),
      hospitalName: sourceHospital?.hospitalName || request.assignedHospitalName || request.requestingHospitalName || 'Unknown',
      location: originCoordinates
    },
    to: {
      hospitalId: String(destinationHospital?._id || request.requestingHospitalId || ''),
      hospitalName: destinationHospital?.hospitalName || request.requestingHospitalName || 'Unknown',
      location: destinationCoordinates
    },
    status: transfer?.transportStatus || request.lifecycleStatus || 'READY',
    route_polyline: transfer?.routeInfo?.routePolyline || liveEstimate?.route_polyline || '',
    route_coordinates: routeCoordinates,
    current_location: currentLocation,
    distance_remaining: Number(distanceRemaining.toFixed(2)),
    eta: Number((liveEstimate?.final_eta ?? sessionEta ?? 0).toFixed ? (liveEstimate?.final_eta ?? sessionEta ?? 0).toFixed(1) : Number(sessionEta).toFixed(1)),
    started_at: transfer?.dispatchTime || request.logisticsDetails?.dispatchedAt || null,
    updated_at: new Date().toISOString(),
    estimated_arrival_at: liveEstimate?.estimated_arrival_at || transfer?.estimatedArrivalTime?.toISOString?.() || null,
    traffic: liveEstimate?.traffic || transfer?.routeInfo?.traffic || 'Unknown',
    base_eta: liveEstimate?.base_eta ?? transfer?.routeInfo?.estimatedTime ?? null,
    ml_eta: liveEstimate?.ml_eta ?? null,
    final_eta: liveEstimate?.final_eta ?? sessionEta ?? null,
    provider: liveEstimate?.provider || transfer?.routeInfo?.provider || 'haversine',
    confidence: liveEstimate?.confidence ?? transfer?.routeInfo?.confidence ?? null
  };
};

async function getCurrentHospitalProfile(req) {
  return HospitalProfile.findOne({ userId: req.user._id }).select('_id hospitalName location officialEmail adminEmail phone address city state');
}

exports.getNearbyHospitalsForCoordination = async (req, res) => {
  try {
    const currentHospital = await getCurrentHospitalProfile(req);
    if (!currentHospital) {
      return res.status(404).json({ message: 'Hospital profile not found' });
    }

    const radius = Number(req.query.radius || 50);
    const requestedBloodGroup = req.query.bloodGroup ? String(req.query.bloodGroup).toUpperCase() : null;
    const requestedUrgency = req.query.urgency ? String(req.query.urgency).toUpperCase() : 'HIGH';
    const unitsNeeded = Number(req.query.unitsNeeded || 1);

    const currentCoordinates = currentHospital.location?.coordinates;
    if (!Array.isArray(currentCoordinates) || currentCoordinates.length !== 2) {
      return res.status(400).json({ message: 'Current hospital location is not configured' });
    }

    const [currentLon, currentLat] = currentCoordinates;

    const hospitals = await HospitalProfile.find({
      _id: { $ne: currentHospital._id },
      verificationStatus: 'approved',
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [currentLon, currentLat] },
          $maxDistance: radius * 1000
        }
      }
    }).select('_id hospitalName location officialEmail phone address city state');

    const normalizedUrgency = VALID_URGENCY.has(requestedUrgency) ? requestedUrgency : 'HIGH';
    let rankingMap = new Map();
    if (requestedBloodGroup && VALID_BLOOD_GROUPS.has(requestedBloodGroup)) {
      try {
        const ranking = await mlService.rankHospitals(
          requestedBloodGroup,
          normalizedUrgency,
          { latitude: currentLat, longitude: currentLon },
          Number.isFinite(unitsNeeded) && unitsNeeded > 0 ? unitsNeeded : 1,
          radius
        );

        const rankingItems = Array.isArray(ranking?.rankings)
          ? ranking.rankings
          : Array.isArray(ranking?.data)
            ? ranking.data
            : [];

        rankingMap = new Map(
          rankingItems
            .map((item) => {
              const id = String(item.hospitalId || item.hospital_id || item.id || '');
              const score = Number(item.priorityScore || item.priority_score || item.score || 0);
              return [id, score];
            })
            .filter(([id]) => Boolean(id))
        );
      } catch (mlError) {
        console.warn('ML ranking unavailable, using heuristic ranking:', mlError.message);
      }
    }

    const nearby = await Promise.all(
      hospitals.map(async (hospital) => {
        const availableBloodGroups = await BloodInventory.distinct('bloodGroup', {
          hospitalId: hospital._id,
          status: 'Available',
          expiryDate: { $gt: new Date() }
        });

        const [lon, lat] = hospital.location?.coordinates || [0, 0];
        const distanceKm = calculateDistanceKm(currentLat, currentLon, lat, lon);
        const hasRequiredBloodGroup = requestedBloodGroup
          ? availableBloodGroups.includes(requestedBloodGroup)
          : availableBloodGroups.length > 0;
        const statusIndicator = hasRequiredBloodGroup ? 'AVAILABLE' : (availableBloodGroups.length ? 'BUSY' : 'UNKNOWN');

        const deliveryEstimate = await deliveryIntelligenceService.estimateHospitalDelivery(
          { latitude: currentLat, longitude: currentLon },
          { latitude: lat, longitude: lon },
          {
            priority: normalizedUrgency,
            emergencyPriority: normalizedUrgency === 'CRITICAL'
          }
        );

        const heuristicScore = Math.max(0, 1 - distanceKm / Math.max(radius, 1)) * 0.5 +
          (hasRequiredBloodGroup ? 0.5 : availableBloodGroups.length ? 0.25 : 0.05);

        const mlPriorityScore = rankingMap.get(String(hospital._id));
        const normalizedRankScore = Number.isFinite(mlPriorityScore)
          ? (mlPriorityScore > 1 ? Number(mlPriorityScore) / 100 : Number(mlPriorityScore))
          : Number(heuristicScore.toFixed(2));

        const etaScore = 1 / (1 + Math.max(Number(deliveryEstimate.final_eta || 1), 1));
        const deliveryScore = Number((normalizedRankScore * 0.4 + etaScore * 0.4 + (hasRequiredBloodGroup ? 0.2 : 0.05)).toFixed(2));

        return {
          hospitalId: hospital._id,
          hospitalName: hospital.hospitalName,
          address: hospital.address || null,
          city: hospital.city || null,
          state: hospital.state || null,
          phone: hospital.phone || null,
          location: hospital.location?.coordinates
            ? {
                latitude: hospital.location.coordinates[1],
                longitude: hospital.location.coordinates[0]
              }
            : null,
          availableBloodGroups,
          status: statusIndicator,
          distanceKm: Number(distanceKm.toFixed(2)),
          etaMinutes: Number(deliveryEstimate.final_eta.toFixed(1)),
          deliveryScore,
          priorityScore: Number(normalizedRankScore.toFixed(2)),
          deliveryEstimate: {
            distance_km: deliveryEstimate.distance_km,
            base_eta: deliveryEstimate.base_eta,
            ml_eta: deliveryEstimate.ml_eta,
            final_eta: deliveryEstimate.final_eta,
            traffic: deliveryEstimate.traffic,
            route: deliveryEstimate.route,
            traffic_ratio: deliveryEstimate.traffic_ratio,
            provider: deliveryEstimate.provider,
            confidence: deliveryEstimate.confidence,
            cacheHit: deliveryEstimate.cacheHit
          }
        };
      })
    );

    nearby.sort((a, b) => {
      if (b.deliveryScore !== a.deliveryScore) return b.deliveryScore - a.deliveryScore;
      if (a.etaMinutes !== b.etaMinutes) return a.etaMinutes - b.etaMinutes;
      return a.distanceKm - b.distanceKm;
    });

    return res.status(200).json({
      message: 'Nearby hospitals fetched successfully',
      data: nearby,
      sourceHospital: {
        hospitalId: currentHospital._id,
        hospitalName: currentHospital.hospitalName,
        location: {
          latitude: currentLat,
          longitude: currentLon
        }
      }
    });
  } catch (error) {
    console.error('Error fetching nearby hospitals for coordination:', error);
    return res.status(500).json({ message: 'Failed to fetch nearby hospitals', error: error.message });
  }
};

exports.getDeliveryEstimate = async (req, res) => {
  try {
    const { from, to, priority = 'HIGH', weatherScore, emergencyPriority } = req.query;

    if (!from || !to) {
      return res.status(400).json({ message: 'from and to are required in lat,lng format' });
    }

    const result = await deliveryIntelligenceService.getDeliveryEstimate({
      from,
      to,
      priority,
      weatherScore: weatherScore !== undefined ? Number(weatherScore) : null,
      emergencyPriority: String(emergencyPriority || '').toLowerCase() === 'true'
    });

    return res.status(200).json({
      message: 'Delivery estimate calculated successfully',
      data: result
    });
  } catch (error) {
    console.error('Error calculating delivery estimate:', error);
    return res.status(500).json({ message: 'Failed to calculate delivery estimate', error: error.message });
  }
};

exports.getHospitalCoordinationSummary = async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const hospital = await HospitalProfile.findOne({
      _id: hospitalId,
      verificationStatus: 'approved'
    }).select('_id hospitalName location officialEmail phone address city state');

    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    const availableBloodGroups = await BloodInventory.distinct('bloodGroup', {
      hospitalId: hospital._id,
      status: 'Available',
      expiryDate: { $gt: new Date() }
    });

    return res.status(200).json({
      message: 'Hospital coordination summary fetched',
      data: {
        hospitalId: hospital._id,
        hospitalName: hospital.hospitalName,
        location: [hospital.address, hospital.city, hospital.state].filter(Boolean).join(', '),
        contact: {
          phone: hospital.phone || null,
          email: hospital.officialEmail || null
        },
        availableBloodGroups
      }
    });
  } catch (error) {
    console.error('Error fetching hospital coordination summary:', error);
    return res.status(500).json({ message: 'Failed to fetch hospital summary', error: error.message });
  }
};

exports.getHospitalInsights = async (req, res) => {
  try {
    const { bloodGroup, urgency = 'HIGH', distance = 0, historicalDemand = 0 } = req.body || {};
    if (!bloodGroup || !VALID_BLOOD_GROUPS.has(String(bloodGroup).toUpperCase())) {
      return res.status(400).json({ message: 'Valid bloodGroup is required' });
    }

    const normalizedUrgency = VALID_URGENCY.has(String(urgency).toUpperCase())
      ? String(urgency).toUpperCase()
      : 'HIGH';

    try {
      const mlResult = await mlService.callMLService('/hospital-insights', 'POST', {
        blood_group: String(bloodGroup).toUpperCase(),
        urgency: normalizedUrgency,
        distance,
        historical_demand: historicalDemand
      }, 1);
      return res.status(200).json({ data: mlResult });
    } catch (mlError) {
      const urgencyWeight = normalizedUrgency === 'CRITICAL' ? 0.95 : normalizedUrgency === 'HIGH' ? 0.82 : normalizedUrgency === 'MEDIUM' ? 0.62 : 0.45;
      const distancePenalty = Math.min(Number(distance || 0) / 100, 0.35);
      const demandBoost = Math.min(Number(historicalDemand || 0) / 100, 0.25);
      const priorityScore = Math.max(0.1, Math.min(0.99, urgencyWeight - distancePenalty + demandBoost));
      const riskLevel = priorityScore > 0.85 ? 'HIGH' : priorityScore > 0.6 ? 'MEDIUM' : 'LOW';

      return res.status(200).json({
        data: {
          suggestedAction: normalizedUrgency === 'CRITICAL' || normalizedUrgency === 'HIGH' ? 'Send immediately' : 'Coordinate and confirm availability',
          priorityScore: Number(priorityScore.toFixed(2)),
          riskLevel,
          reason: `Fallback model: urgency ${normalizedUrgency}, distance ${distance || 0} km, historical demand index ${historicalDemand || 0}`,
          source: 'fallback'
        }
      });
    }
  } catch (error) {
    console.error('Error getting hospital insights:', error);
    return res.status(500).json({ message: 'Failed to get hospital insights', error: error.message });
  }
};

exports.createEmergencyRequest = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      toHospitalId,
      bloodGroup,
      unitsRequired,
      severityLevel,
      urgency,
      message,
      requiredWithin,
      medicalJustification,
      patientDetails,
      requiredBy
    } = req.body;

    if (!VALID_BLOOD_GROUPS.has(bloodGroup)) {
      return res.status(400).json({ message: 'Invalid blood group' });
    }

    const normalizedUnits = Number.isInteger(unitsRequired) && unitsRequired > 0
      ? unitsRequired
      : 1;

    if (!Number.isInteger(normalizedUnits) || normalizedUnits <= 0) {
      return res.status(400).json({ message: 'unitsRequired must be a positive integer' });
    }

    const normalizedUrgency = VALID_URGENCY.has(String(urgency || '').toUpperCase())
      ? String(urgency || '').toUpperCase()
      : (severityLevel === 'MODERATE' ? 'MEDIUM' : String(severityLevel || 'HIGH').toUpperCase());

    const normalizedSeverityLevel = normalizeUrgencyToSeverity(normalizedUrgency);

    if (!['CRITICAL', 'HIGH', 'MODERATE'].includes(normalizedSeverityLevel)) {
      return res.status(400).json({ message: 'Invalid severity level' });
    }

    const hospitalProfile = await HospitalProfile.findOne({ userId });
    if (!hospitalProfile) {
      return res.status(404).json({ message: 'Hospital profile not found' });
    }

    let targetHospital = null;
    if (toHospitalId) {
      targetHospital = await HospitalProfile.findOne({ _id: toHospitalId, verificationStatus: 'approved' })
        .select('_id hospitalName officialEmail adminEmail phone');
      if (!targetHospital) {
        return res.status(404).json({ message: 'Target hospital not found or not approved' });
      }
    }

    const emergencyRequest = new EmergencyRequest({
      fromHospitalId: hospitalProfile._id,
      toHospitalId: targetHospital?._id || null,
      coordinationStatus: 'PENDING',
      urgency: normalizedUrgency,
      message: message || medicalJustification || null,
      requiredWithin: requiredWithin ? new Date(requiredWithin) : null,
      requestingHospitalId: hospitalProfile._id,
      requestingHospitalName: hospitalProfile.hospitalName,
      bloodGroup,
      unitsRequired: normalizedUnits,
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
      unitsRequired: normalizedUnits,
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
      toHospitalId: targetHospital?._id || null,
      requestingHospitalName: hospitalProfile.hospitalName,
      bloodGroup,
      unitsRequired: normalizedUnits,
      urgency: String(normalizedSeverityLevel || 'HIGH').toLowerCase(),
      urgencyScore: emergencyRequest.urgencyScore
    };
    eventBus.publish('emergency:created', emergencyPayload);
    eventBus.publish('emergency_created', emergencyPayload);

    if (targetHospital) {
      const recipientEmail = targetHospital.adminEmail || targetHospital.officialEmail;
      if (recipientEmail) {
        await sendEmergencyAlertEmail(
          recipientEmail,
          hospitalProfile.hospitalName,
          `Emergency request ${emergencyRequest._id} for ${bloodGroup}. Urgency: ${normalizedUrgency}. Required units: ${normalizedUnits}.`
        );
      }
    }

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
    if (request.toHospitalId && String(request.toHospitalId) !== String(partnerHospital._id)) {
      return res.status(403).json({ message: 'This request is assigned to another hospital' });
    }
    const inventory = await BloodInventory.find({
      hospitalId: partnerHospital._id,
      bloodGroup: request.bloodGroup,
      status: 'Available'
    });
    const totalAvailable = inventory.length;
    const safeUnitsCommitted = Number.isInteger(unitsCommitted) && unitsCommitted > 0
      ? unitsCommitted
      : Math.min(request.unitsRequired || 1, totalAvailable);
    if (totalAvailable < safeUnitsCommitted) {
      return res.status(400).json({ 
        message: 'Insufficient blood units available',
        available: totalAvailable,
        required: safeUnitsCommitted
      });
    }
    request.toHospitalId = partnerHospital._id;
    request.coordinationStatus = 'ACCEPTED';
    request.assignedHospitalId = partnerHospital._id;
    request.assignedHospitalName = partnerHospital.hospitalName;
    request.acceptedAt = new Date();
    request.acceptedBy = { userId: partnerUserId, name: partnerHospital.hospitalName };
    request.lifecycleStatus = 'PARTNER_ACCEPTED';
    request.addAuditLog('PARTNER_ACCEPTED', partnerUserId, 'Partner accepted request, committing ' + safeUnitsCommitted + ' units');
    request.communicationLogs.push({
      timestamp: new Date(),
      fromHospitalId: partnerHospital._id,
      toHospitalId: request.requestingHospitalId,
      messageType: 'SYSTEM_NOTIFICATION',
      message: 'Request accepted. Committing ' + safeUnitsCommitted + ' units. ' + (notes || '')
    });
    const unitsToReserve = inventory.slice(0, safeUnitsCommitted);
    for (const unit of unitsToReserve) {
      unit.status = 'Reserved';
      unit.reservationInfo = { reservedFor: request._id, reservedAt: new Date() };
      await unit.save();
    }
    request.resourceLock = {
      isLocked: true,
      lockedUnits: safeUnitsCommitted,
      lockedAt: new Date(),
      lockExpiry: new Date(Date.now() + 4 * 60 * 60 * 1000),
      inventoryIds: unitsToReserve.map(u => u._id)
    };
    await request.save();

    eventBus.publish('emergency:status_changed', {
      requestId: request._id,
      hospitalId: request.requestingHospitalId,
      newStatus: 'ACCEPTED',
      toHospitalId: request.toHospitalId,
      fromHospitalId: request.fromHospitalId,
      message: notes || null
    });

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
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital profile not found' });
    }
    if (request.toHospitalId && String(request.toHospitalId) !== String(hospital._id)) {
      return res.status(403).json({ message: 'This request is assigned to another hospital' });
    }
    request.toHospitalId = hospital._id;
    request.coordinationStatus = 'REJECTED';
    request.lifecycleStatus = 'FAILED';
    request.communicationLogs.push({
      timestamp: new Date(),
      fromHospitalId: hospital?._id,
      toHospitalId: request.requestingHospitalId,
      messageType: 'SYSTEM_NOTIFICATION',
      message: 'Request declined. Reason: ' + reason
    });
    request.addAuditLog('DECLINED', userId, 'Request declined: ' + reason);
    await request.save();

    eventBus.publish('emergency:status_changed', {
      requestId: request._id,
      hospitalId: request.requestingHospitalId,
      newStatus: 'REJECTED',
      toHospitalId: request.toHospitalId,
      fromHospitalId: request.fromHospitalId,
      message: reason || null
    });
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
    const dispatchEstimate = await deliveryIntelligenceService.estimateHospitalDelivery(
      {
        latitude: partnerHospital?.location?.coordinates?.[1],
        longitude: partnerHospital?.location?.coordinates?.[0]
      },
      {
        latitude: requestingHospital?.location?.coordinates?.[1],
        longitude: requestingHospital?.location?.coordinates?.[0]
      },
      {
        priority: request.urgency,
        emergencyPriority: request.severityLevel === 'CRITICAL'
      }
    );
    const bloodTransfer = new BloodTransfer({
      emergencyRequestId: requestId,
      sourceHospitalId: request.assignedHospitalId,
      sourceHospitalName: request.assignedHospitalName,
      destinationHospitalId: request.requestingHospitalId,
      destinationHospitalName: request.requestingHospitalName,
      bloodGroup: request.bloodGroup,
      unitsTransferred: request.resourceLock?.lockedUnits || 0,
      bloodBagIds: [],
      transportStatus: 'DISPATCHED',
      transportMethod: vehicleDetails?.vehicleType || 'AMBULANCE',
      vehicleDetails: {
        type: vehicleDetails?.vehicleType,
        vehicleNumber: vehicleDetails?.vehicleNumber,
        driverName: driverDetails?.name,
        driverContact: driverDetails?.phone,
        registrationNumber: driverDetails?.license
      },
      dispatchTime: new Date(),
      estimatedArrivalTime: new Date(Date.now() + Math.max(Number(dispatchEstimate.final_eta || 0), 1) * 60000),
      routeInfo: {
        origin: {
          latitude: partnerHospital?.location?.coordinates?.[1],
          longitude: partnerHospital?.location?.coordinates?.[0],
          address: partnerHospital?.address || null
        },
        destination: {
          latitude: requestingHospital?.location?.coordinates?.[1],
          longitude: requestingHospital?.location?.coordinates?.[0],
          address: requestingHospital?.address || null
        },
        distance: Number(dispatchEstimate.distance_km || 0),
        estimatedTime: Number(dispatchEstimate.final_eta || 0),
        routeCoordinates: dispatchEstimate.route_coordinates || [],
        routePolyline: dispatchEstimate.route_polyline || '',
        traffic: dispatchEstimate.traffic,
        provider: dispatchEstimate.provider,
        confidence: dispatchEstimate.confidence
      },
      dispatchChecklist,
      currentLocation: {
        latitude: partnerHospital?.location?.coordinates?.[1],
        longitude: partnerHospital?.location?.coordinates?.[0],
        lastUpdated: new Date()
      }
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

    request.lifecycleStatus = 'IN_TRANSIT';
    request.logisticsDetails = {
      dispatchMethod: vehicleDetails?.vehicleType || 'AMBULANCE',
      dispatchedAt: new Date(),
      dispatchedBy: { userId: req.user._id, name: partnerHospital?.hospitalName },
      vehicleInfo: { type: vehicleDetails?.vehicleType, number: vehicleDetails?.vehicleNumber },
      estimatedArrival: bloodTransfer.estimatedArrivalTime,
      currentLocation: bloodTransfer.currentLocation,
      trackingPoints: bloodTransfer.gpsTrackingPoints.map((point) => ({
        latitude: point.latitude,
        longitude: point.longitude,
        timestamp: point.timestamp,
        status: point.status
      }))
    };
    request.addAuditLog('IN_TRANSIT', request.assignedHospitalId, 'Blood units dispatched');
    await request.save();

    const deliverySession = await buildDeliverySession(request, bloodTransfer);

    eventBus.publish('transfer:initiated', {
      transferId: bloodTransfer._id,
      requestId: request._id,
      fromHospital: String(request.assignedHospitalId),
      toHospital: String(request.requestingHospitalId),
      bloodGroup: request.bloodGroup,
      units: request.resourceLock?.lockedUnits || 0,
      initiatedBy: req.user?._id,
      deliverySession
    });
    eventBus.publish('delivery:session_created', deliverySession);

    res.json({ message: 'Blood transfer dispatched successfully', transfer: bloodTransfer, request, deliverySession });
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
    if (status) {
      transfer.transportStatus = status;
    }

    const request = await EmergencyRequest.findById(transfer.emergencyRequestId);
    const destinationHospital = request ? await HospitalProfile.findById(request.requestingHospitalId) : null;
    const destinationCoordinates = destinationHospital?.location?.coordinates;
    const liveEstimate = destinationCoordinates
      ? await deliveryIntelligenceService.estimateHospitalDelivery(
          { latitude: Number(latitude), longitude: Number(longitude) },
          { latitude: destinationCoordinates[1], longitude: destinationCoordinates[0] },
          {
            priority: request?.urgency || 'HIGH',
            emergencyPriority: request?.severityLevel === 'CRITICAL'
          }
        )
      : null;

    if (request) {
      request.lifecycleStatus = status === 'DELIVERED' ? 'DELIVERED' : 'IN_TRANSIT';
      request.logisticsDetails = {
        ...(request.logisticsDetails || {}),
        currentLocation: {
          latitude: Number(latitude),
          longitude: Number(longitude),
          lastUpdated: new Date()
        },
        estimatedArrival: liveEstimate?.final_eta ? new Date(Date.now() + liveEstimate.final_eta * 60000) : request.logisticsDetails?.estimatedArrival || null,
        trackingPoints: transfer.gpsTrackingPoints.map((point) => ({
          latitude: point.latitude,
          longitude: point.longitude,
          timestamp: point.timestamp,
          status: point.status
        }))
      };
      request.addAuditLog('TRACKING_UPDATE', req.user?._id, notes || 'Location updated');
      await request.save();
    }

    await transfer.save();
    const deliverySession = request ? await buildDeliverySession(request, transfer) : null;

    eventBus.publish('transfer:location_updated', {
      transferId: transfer._id,
      requestId: transfer.emergencyRequestId,
      currentLocation: transfer.currentLocation,
      liveEstimate,
      deliverySession,
      notes: notes || null
    });

    res.json({
      message: 'Location updated successfully',
      currentLocation: transfer.gpsTrackingPoints[transfer.gpsTrackingPoints.length - 1],
      deliverySession,
      liveEstimate
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

exports.getDeliverySession = async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await EmergencyRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Emergency request not found' });
    }

    const transfer = await BloodTransfer.findOne({ emergencyRequestId: requestId }).sort({ createdAt: -1 });
    if (!transfer) {
      return res.status(404).json({ message: 'Delivery session not started' });
    }

    const deliverySession = await buildDeliverySession(request, transfer);

    return res.status(200).json({
      message: 'Delivery session fetched successfully',
      data: {
        request,
        transfer,
        deliverySession
      }
    });
  } catch (error) {
    console.error('Error fetching delivery session:', error);
    return res.status(500).json({ message: 'Failed to fetch delivery session', error: error.message });
  }
};

exports.getEmergencyRequests = async (req, res) => {
  try {
    const { status, bloodGroup, severityLevel, hospitalId } = req.query;
    const query = {};

    const role = String(req.userRole || '').toLowerCase();
    if (role === 'hospital_admin') {
      const hospital = await HospitalProfile.findOne({ userId: req.user._id }).select('_id');
      if (!hospital) {
        return res.status(404).json({ message: 'Hospital profile not found' });
      }
      query.$or = [
        { requestingHospitalId: hospital._id },
        { fromHospitalId: hospital._id },
        { toHospitalId: hospital._id },
        { assignedHospitalId: hospital._id }
      ];
    }

    if (status) query.lifecycleStatus = status;
    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (severityLevel) query.severityLevel = severityLevel;
    if (hospitalId) {
      query.$or = [
        { requestingHospitalId: hospitalId },
        { assignedHospitalId: hospitalId }
      ];
    }
    const requests = await EmergencyRequest.find(query)
      .populate('fromHospitalId', 'hospitalName officialEmail phone')
      .populate('toHospitalId', 'hospitalName officialEmail phone')
      .populate('requestingHospitalId', 'hospitalName officialEmail phone')
      .populate('assignedHospitalId', 'hospitalName officialEmail phone')
      .sort({ createdAt: -1 })
      .limit(100);

    let incoming = [];
    let outgoing = [];
    if (role === 'hospital_admin') {
      const hospital = await HospitalProfile.findOne({ userId: req.user._id }).select('_id');
      incoming = requests.filter((r) => String(r.toHospitalId || r.assignedHospitalId || '') === String(hospital._id));
      outgoing = requests.filter((r) => String(r.fromHospitalId || r.requestingHospitalId || '') === String(hospital._id));
    }

    res.json({ total: requests.length, requests, incoming, outgoing });
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
      const fromId = String(request.fromHospitalId || '');
      const toId = String(request.toHospitalId || '');

      if (profileId !== requesterId && profileId !== assignedId && profileId !== fromId && profileId !== toId) {
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
