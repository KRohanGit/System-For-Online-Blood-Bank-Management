const PeerEmergencyChainRequest = require('../models/PeerEmergencyChainRequest');
const PublicUser = require('../models/PublicUser');
const Donation = require('../models/Donation');
const Notification = require('../models/Notification');
const HospitalProfile = require('../models/HospitalProfile');
const User = require('../models/User');
const blockchainService = require('./blockchain/blockchainService');
const { sendEmergencyAlertEmail } = require('./email.service');
const { emitToUser, emitToRole } = require('./realtime/socketService');

const chainTimers = new Map();
const DONOR_COOLDOWN_DAYS = 90;
const DONOR_NOTIFICATION_SPAM_WINDOW_MINUTES = 10;

const normalizeUrgency = (urgency) => {
  const value = String(urgency || 'HIGH').toUpperCase();
  if (['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(value)) {
    return value;
  }
  return 'HIGH';
};

const getSearchRadiusKm = (urgency) => {
  if (urgency === 'CRITICAL') return 30;
  if (urgency === 'HIGH') return 22;
  if (urgency === 'MEDIUM') return 16;
  return 10;
};

const getWaitWindowMs = () => {
  const raw = Number(process.env.P2P_CHAIN_WAIT_MS || 60000);
  if (!Number.isFinite(raw) || raw < 5000) return 60000;
  return raw;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const calcAvailabilityProbability = (donor) => {
  if (!donor?.lastLogin) return 0.35;
  const hours = (Date.now() - new Date(donor.lastLogin).getTime()) / 3600000;
  if (hours <= 6) return 0.95;
  if (hours <= 24) return 0.85;
  if (hours <= 72) return 0.7;
  if (hours <= 168) return 0.55;
  return 0.4;
};

const calcLastDonationScore = (days) => {
  if (days == null) return 0.75;
  if (days < DONOR_COOLDOWN_DAYS) return 0;
  return clamp((days - DONOR_COOLDOWN_DAYS) / 180, 0, 1);
};

const getDonorResponseHistoryMap = async (donorIds) => {
  if (!donorIds.length) return new Map();

  const history = await PeerEmergencyChainRequest.aggregate([
    { $match: { 'responses.donorId': { $in: donorIds } } },
    { $unwind: '$responses' },
    { $match: { 'responses.donorId': { $in: donorIds } } },
    {
      $group: {
        _id: '$responses.donorId',
        total: { $sum: 1 },
        accepts: {
          $sum: {
            $cond: [{ $eq: ['$responses.decision', 'ACCEPT'] }, 1, 0]
          }
        }
      }
    }
  ]);

  const map = new Map();
  history.forEach((row) => {
    const total = row.total || 0;
    const rate = total > 0 ? row.accepts / total : 0.5;
    map.set(String(row._id), clamp(rate, 0, 1));
  });
  return map;
};

const getLastDonationDaysMap = async (donorIds) => {
  if (!donorIds.length) return new Map();
  const rows = await Donation.aggregate([
    {
      $match: {
        donorId: { $in: donorIds },
        status: 'COMPLETED'
      }
    },
    {
      $group: {
        _id: '$donorId',
        lastDonation: { $max: '$donationDate' }
      }
    }
  ]);

  const map = new Map();
  rows.forEach((row) => {
    const ms = Date.now() - new Date(row.lastDonation).getTime();
    map.set(String(row._id), Math.floor(ms / 86400000));
  });
  return map;
};

const getRecentlyNotifiedDonorSet = async (donorIds) => {
  if (!donorIds.length) return new Set();
  const since = new Date(Date.now() - DONOR_NOTIFICATION_SPAM_WINDOW_MINUTES * 60 * 1000);
  const rows = await Notification.find({
    userId: { $in: donorIds },
    userModel: 'PublicUser',
    type: 'blood_request',
    createdAt: { $gte: since }
  }).select('userId');

  return new Set(rows.map((row) => String(row.userId)));
};

const rankDonors = async ({ requesterId, bloodGroup, location, urgency }) => {
  const radiusKm = getSearchRadiusKm(urgency);
  const radiusMeters = radiusKm * 1000;
  const [lng, lat] = location.coordinates;

  const candidates = await PublicUser.find({
    _id: { $ne: requesterId },
    bloodGroup,
    isActive: true,
    verificationStatus: 'verified',
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        $maxDistance: radiusMeters
      }
    }
  })
    .select('_id fullName email bloodGroup lastLogin location')
    .limit(30)
    .lean();

  const donorIds = candidates.map((d) => d._id);
  const [responseHistoryMap, lastDonationDaysMap, recentlyNotifiedSet] = await Promise.all([
    getDonorResponseHistoryMap(donorIds),
    getLastDonationDaysMap(donorIds),
    getRecentlyNotifiedDonorSet(donorIds)
  ]);

  let ranked = candidates.map((donor) => {
    const distanceMeters = donor.location?.coordinates?.length
      ? haversineDistanceMeters(
          lat,
          lng,
          donor.location.coordinates[1],
          donor.location.coordinates[0]
        )
      : radiusMeters;
    const distanceKm = Math.round((distanceMeters / 1000) * 10) / 10;
    const distanceScore = clamp(1 - distanceMeters / radiusMeters, 0, 1);
    const responseHistoryScore = responseHistoryMap.get(String(donor._id)) ?? 0.5;
    const availabilityProbability = calcAvailabilityProbability(donor);
    const lastDonationDays = lastDonationDaysMap.get(String(donor._id)) ?? null;
    const lastDonationScore = calcLastDonationScore(lastDonationDays);
    const finalScore = (
      distanceScore * 0.4 +
      responseHistoryScore * 0.25 +
      availabilityProbability * 0.2 +
      lastDonationScore * 0.15
    ) * 100;

    return {
      donorId: donor._id,
      donorName: donor.fullName,
      donorEmail: donor.email,
      score: Math.round(finalScore * 100) / 100,
      distanceKm,
      responseHistoryScore: Math.round(responseHistoryScore * 100) / 100,
      availabilityProbability: Math.round(availabilityProbability * 100) / 100,
      lastDonationDays,
      recentlyNotified: recentlyNotifiedSet.has(String(donor._id))
    };
  });

  const withoutRecentSpam = ranked.filter((x) => !x.recentlyNotified);
  ranked = withoutRecentSpam.length > 0 ? withoutRecentSpam : ranked;

  ranked.sort((a, b) => b.score - a.score);
  return ranked;
};

const haversineDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
};

const emitChainUpdate = async (requestDoc, aiMessage) => {
  const doc = requestDoc.toObject ? requestDoc.toObject() : requestDoc;
  const donorIds = new Set();
  donorIds.add(String(doc.requesterId));
  if (doc.currentDonorId) donorIds.add(String(doc.currentDonorId));
  if (doc.acceptedDonorId) donorIds.add(String(doc.acceptedDonorId));

  const payload = {
    requestId: String(doc._id),
    status: doc.status,
    bloodGroup: doc.bloodGroup,
    urgency: doc.urgency,
    unitsNeeded: doc.unitsNeeded,
    aiMessage: aiMessage || doc.aiMessage,
    currentDonor: doc.currentDonorId,
    currentDonorExpiresAt: doc.currentDonorExpiresAt,
    acceptedDonorId: doc.acceptedDonorId,
    responses: doc.responses,
    timeline: doc.timeline,
    escalation: doc.escalation,
    updatedAt: doc.updatedAt || new Date().toISOString()
  };

  donorIds.forEach((id) => emitToUser(id, 'donor_chain_update', payload));
};

const notifyDonor = async (requestDoc, candidate) => {
  const waitWindowMs = getWaitWindowMs();
  const minutes = Math.max(1, Math.round(waitWindowMs / 60000));
  const body = `Emergency need: ${requestDoc.unitsNeeded} unit(s) of ${requestDoc.bloodGroup}. Please respond within ${minutes} minute(s).`;

  await Notification.create({
    userId: candidate.donorId,
    userModel: 'PublicUser',
    title: 'Emergency donor request near you',
    message: body,
    type: 'blood_request',
    priority: requestDoc.urgency === 'CRITICAL' ? 'urgent' : 'high',
    metadata: {
      requestId: String(requestDoc._id),
      score: String(candidate.score)
    }
  });

  const donor = await PublicUser.findById(candidate.donorId).select('email fullName').lean();
  if (donor?.email) {
    await sendEmergencyAlertEmail(donor.email, 'LifeLink P2P', body);
  }

  emitToUser(String(candidate.donorId), 'donor_chain_update', {
    requestId: String(requestDoc._id),
    status: requestDoc.status,
    aiMessage: 'You are selected as the nearest eligible donor. Please accept or reject.',
    currentDonor: candidate.donorId,
    currentDonorExpiresAt: requestDoc.currentDonorExpiresAt,
    bloodGroup: requestDoc.bloodGroup,
    unitsNeeded: requestDoc.unitsNeeded,
    urgency: requestDoc.urgency,
    timeline: requestDoc.timeline,
    responses: requestDoc.responses
  });
};

const clearChainTimer = (requestId) => {
  const key = String(requestId);
  const timer = chainTimers.get(key);
  if (timer) {
    clearTimeout(timer);
    chainTimers.delete(key);
  }
};

const scheduleChainTimeout = (requestId) => {
  clearChainTimer(requestId);
  const key = String(requestId);
  const waitWindowMs = getWaitWindowMs();
  const timer = setTimeout(async () => {
    await handleCurrentDonorTimeout(key);
  }, waitWindowMs);
  chainTimers.set(key, timer);
};

const appendTimeline = (requestDoc, status, message, donorId = null) => {
  requestDoc.timeline.push({
    status,
    message,
    donorId,
    ts: new Date()
  });
};

const processNextDonor = async (requestId) => {
  const requestDoc = await PeerEmergencyChainRequest.findById(requestId);
  if (!requestDoc) return;
  if (['ACCEPTED', 'ESCALATED', 'CLOSED'].includes(requestDoc.status)) {
    clearChainTimer(requestId);
    return;
  }

  const nextIndex = requestDoc.candidateDonors.findIndex((d) => d.status === 'QUEUED');

  if (nextIndex < 0) {
    await escalateRequest(requestDoc);
    return;
  }

  const nextCandidate = requestDoc.candidateDonors[nextIndex];
  nextCandidate.status = 'NOTIFIED';
  nextCandidate.notifiedAt = new Date();
  requestDoc.currentDonorId = nextCandidate.donorId;
  requestDoc.currentDonorExpiresAt = new Date(Date.now() + getWaitWindowMs());
  requestDoc.status = 'NOTIFYING';
  requestDoc.aiMessage = 'Notifying nearest donor...';
  appendTimeline(
    requestDoc,
    'DONOR_NOTIFIED',
    `Notified donor with score ${nextCandidate.score.toFixed(2)}`,
    nextCandidate.donorId
  );

  await requestDoc.save();
  await notifyDonor(requestDoc, nextCandidate);
  await emitChainUpdate(requestDoc, 'Notifying nearest donor...');
  scheduleChainTimeout(requestDoc._id);
};

const handleCurrentDonorTimeout = async (requestId) => {
  const requestDoc = await PeerEmergencyChainRequest.findById(requestId);
  if (!requestDoc) return;
  if (requestDoc.status !== 'NOTIFYING' || !requestDoc.currentDonorId) return;
  if (requestDoc.currentDonorExpiresAt && new Date(requestDoc.currentDonorExpiresAt).getTime() > Date.now()) return;

  const idx = requestDoc.candidateDonors.findIndex(
    (d) => String(d.donorId) === String(requestDoc.currentDonorId) && d.status === 'NOTIFIED'
  );

  if (idx >= 0) {
    requestDoc.candidateDonors[idx].status = 'TIMEOUT';
    requestDoc.candidateDonors[idx].respondedAt = new Date();
    requestDoc.responses.push({
      donorId: requestDoc.currentDonorId,
      decision: 'TIMEOUT',
      respondedAt: new Date(),
      scoreSnapshot: requestDoc.candidateDonors[idx].score
    });
  }

  appendTimeline(requestDoc, 'DONOR_TIMEOUT', 'No response from current donor within the response window.', requestDoc.currentDonorId);
  requestDoc.aiMessage = 'No response yet, moving to next best donor...';
  requestDoc.currentDonorId = null;
  requestDoc.currentDonorExpiresAt = null;
  await requestDoc.save();
  await emitChainUpdate(requestDoc, 'No response yet, moving to next best donor...');
  await processNextDonor(requestId);
};

const escalateRequest = async (requestDoc) => {
  clearChainTimer(requestDoc._id);
  requestDoc.status = 'ESCALATED';
  requestDoc.chainEndedAt = new Date();
  requestDoc.currentDonorId = null;
  requestDoc.currentDonorExpiresAt = null;
  requestDoc.aiMessage = 'No donor accepted. Escalating to hospitals and admins.';

  const [lng, lat] = requestDoc.location.coordinates;
  const hospitals = await HospitalProfile.find({
    emergencySupport: true,
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        $maxDistance: 50000
      }
    }
  }).limit(5);

  requestDoc.escalation = {
    hospitalAlerted: hospitals.length > 0,
    adminAlerted: true,
    triggeredAt: new Date(),
    hospitals: hospitals.map((h) => ({
      hospitalId: h._id,
      hospitalName: h.hospitalName,
      adminEmail: h.adminEmail
    }))
  };

  appendTimeline(requestDoc, 'ESCALATED', 'Chain exhausted. Escalation alerts were sent.');

  await requestDoc.save();

  const escalationMessage = `Escalation: ${requestDoc.unitsNeeded} unit(s) of ${requestDoc.bloodGroup} needed urgently.`;

  await Promise.all(
    hospitals.map(async (hospital) => {
      if (hospital.adminEmail) {
        await sendEmergencyAlertEmail(hospital.adminEmail, hospital.hospitalName || 'Hospital', escalationMessage);
      }
      if (hospital.officialEmail && hospital.officialEmail !== hospital.adminEmail) {
        await sendEmergencyAlertEmail(hospital.officialEmail, hospital.hospitalName || 'Hospital', escalationMessage);
      }
    })
  );

  const admins = await User.find({ role: { $in: ['hospital_admin', 'super_admin'] } }).select('_id').lean();
  if (admins.length) {
    await Notification.insertMany(admins.map((admin) => ({
      userId: admin._id,
      userModel: 'User',
      title: 'P2P emergency chain escalated',
      message: escalationMessage,
      type: 'system',
      priority: 'urgent',
      metadata: {
        requestId: String(requestDoc._id),
        bloodGroup: requestDoc.bloodGroup
      }
    })));

    admins.forEach((admin) => emitToUser(String(admin._id), 'donor_chain_update', {
      requestId: String(requestDoc._id),
      status: 'ESCALATED',
      aiMessage: 'Escalation triggered after donor chain timeout.',
      bloodGroup: requestDoc.bloodGroup,
      unitsNeeded: requestDoc.unitsNeeded
    }));
  }

  emitToRole('hospital_admin', 'donor_chain_update', {
    requestId: String(requestDoc._id),
    status: 'ESCALATED',
    aiMessage: 'Peer-to-peer donor chain escalated to hospitals.',
    bloodGroup: requestDoc.bloodGroup,
    unitsNeeded: requestDoc.unitsNeeded
  });

  await emitChainUpdate(requestDoc, 'No donor accepted. Escalating to hospitals and admins.');
};

const createChainRequest = async ({ requesterId, bloodGroup, location, urgency, unitsNeeded }) => {
  const normalizedUrgency = normalizeUrgency(urgency);
  const rankedDonors = await rankDonors({
    requesterId,
    bloodGroup,
    location,
    urgency: normalizedUrgency
  });

  const doc = await PeerEmergencyChainRequest.create({
    requesterId,
    bloodGroup,
    location,
    urgency: normalizedUrgency,
    unitsNeeded,
    status: rankedDonors.length ? 'SEARCHING' : 'ESCALATED',
    aiMessage: rankedDonors.length ? 'Finding best donors...' : 'No nearby eligible donors found. Escalating.',
    candidateDonors: rankedDonors.map((d) => ({
      donorId: d.donorId,
      score: d.score,
      distanceKm: d.distanceKm,
      responseHistoryScore: d.responseHistoryScore,
      availabilityProbability: d.availabilityProbability,
      lastDonationDays: d.lastDonationDays,
      status: 'QUEUED'
    })),
    timeline: [
      {
        status: 'REQUEST_CREATED',
        message: 'Finding best donors...',
        ts: new Date()
      }
    ]
  });

  try {
    const tx = blockchainService.recordEmergencyRequest({
      requestId: String(doc._id),
      hospitalId: String(requesterId),
      bloodGroup,
      units: unitsNeeded,
      urgency: normalizedUrgency
    });
    if (tx?.transactionId) {
      doc.blockchain.requestTxId = tx.transactionId;
      await doc.save();
    }
  } catch (error) {
    console.error('Blockchain request logging failed:', error.message);
  }

  await emitChainUpdate(doc, 'Finding best donors...');

  if (!rankedDonors.length) {
    await escalateRequest(doc);
    return doc;
  }

  await processNextDonor(doc._id);
  return PeerEmergencyChainRequest.findById(doc._id);
};

const respondToChainRequest = async ({ requestId, donorId, decision }) => {
  const normalizedDecision = String(decision || '').toUpperCase();
  if (!['ACCEPT', 'REJECT'].includes(normalizedDecision)) {
    const error = new Error('Invalid donor decision');
    error.statusCode = 400;
    throw error;
  }

  const requestDoc = await PeerEmergencyChainRequest.findById(requestId);
  if (!requestDoc) {
    const error = new Error('Emergency request not found');
    error.statusCode = 404;
    throw error;
  }

  if (requestDoc.status !== 'NOTIFYING') {
    const error = new Error('Request is not waiting for donor response');
    error.statusCode = 400;
    throw error;
  }

  if (!requestDoc.currentDonorId || String(requestDoc.currentDonorId) !== String(donorId)) {
    const error = new Error('You are not the current notified donor');
    error.statusCode = 403;
    throw error;
  }

  const idx = requestDoc.candidateDonors.findIndex(
    (d) => String(d.donorId) === String(donorId) && d.status === 'NOTIFIED'
  );

  if (idx < 0) {
    const error = new Error('Donor response window has expired');
    error.statusCode = 400;
    throw error;
  }

  clearChainTimer(requestId);

  requestDoc.responses.push({
    donorId,
    decision: normalizedDecision,
    respondedAt: new Date(),
    scoreSnapshot: requestDoc.candidateDonors[idx].score
  });

  requestDoc.candidateDonors[idx].respondedAt = new Date();

  if (normalizedDecision === 'ACCEPT') {
    requestDoc.candidateDonors[idx].status = 'ACCEPTED';
    requestDoc.status = 'ACCEPTED';
    requestDoc.acceptedDonorId = donorId;
    requestDoc.currentDonorId = null;
    requestDoc.currentDonorExpiresAt = null;
    requestDoc.chainEndedAt = new Date();
    requestDoc.aiMessage = 'Donor accepted. Coordinating response now.';
    appendTimeline(requestDoc, 'DONOR_ACCEPTED', 'A donor accepted the emergency request.', donorId);

    await Notification.create({
      userId: requestDoc.requesterId,
      userModel: 'PublicUser',
      title: 'Emergency request accepted',
      message: 'A donor has accepted your emergency request.',
      type: 'blood_request',
      priority: 'urgent',
      metadata: {
        requestId: String(requestDoc._id),
        donorId: String(donorId)
      }
    });
  } else {
    requestDoc.candidateDonors[idx].status = 'REJECTED';
    requestDoc.currentDonorId = null;
    requestDoc.currentDonorExpiresAt = null;
    requestDoc.aiMessage = 'Current donor rejected. Notifying next best donor...';
    appendTimeline(requestDoc, 'DONOR_REJECTED', 'Current donor rejected. Moving to next donor.', donorId);
  }

  try {
    const tx = blockchainService.addTransaction({
      type: 'EMERGENCY_DONOR_RESPONSE',
      data: {
        requestId: String(requestDoc._id),
        donorId: String(donorId),
        decision: normalizedDecision,
        respondedAt: new Date().toISOString()
      },
      actor: String(donorId)
    });
    if (tx?.transactionId) {
      requestDoc.blockchain.responseTxIds.push(tx.transactionId);
    }
  } catch (error) {
    console.error('Blockchain response logging failed:', error.message);
  }

  await requestDoc.save();
  await emitChainUpdate(requestDoc, requestDoc.aiMessage);

  if (normalizedDecision === 'REJECT') {
    await processNextDonor(requestId);
  }

  return requestDoc;
};

const getRequesterRequests = async (requesterId) => {
  return PeerEmergencyChainRequest.find({ requesterId })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
};

const getPendingForDonor = async (donorId) => {
  return PeerEmergencyChainRequest.find({
    status: 'NOTIFYING',
    currentDonorId: donorId
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();
};

const getRequestByIdForUser = async (requestId, userId) => {
  return PeerEmergencyChainRequest.findOne({
    _id: requestId,
    $or: [
      { requesterId: userId },
      { 'candidateDonors.donorId': userId }
    ]
  }).lean();
};

module.exports = {
  createChainRequest,
  respondToChainRequest,
  getRequesterRequests,
  getPendingForDonor,
  getRequestByIdForUser,
  processNextDonor
};
