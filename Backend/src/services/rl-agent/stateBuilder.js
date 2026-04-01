const EmergencyRequest = require('../../models/EmergencyRequest');
const BloodInventory = require('../../models/BloodInventory');
const HospitalProfile = require('../../models/HospitalProfile');

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const ACTIVE_EMERGENCY_STATES = [
  'CREATED',
  'MEDICAL_VERIFICATION_PENDING',
  'PARTNER_HOSPITAL_SEARCH',
  'PARTNER_ACCEPTED',
  'LOGISTICS_DISPATCH',
  'IN_TRANSIT'
];

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2))
    * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function normalizeUrgency(level = 'HIGH', score = 70) {
  const text = String(level || 'HIGH').toUpperCase();
  if (text === 'CRITICAL' || score >= 90) return 1;
  if (text === 'HIGH' || score >= 75) return 0.8;
  if (text === 'MODERATE' || score >= 55) return 0.6;
  return 0.45;
}

async function buildState() {
  const now = new Date();
  const expiryWindow = new Date(now.getTime() + (72 * 60 * 60 * 1000));

  const [hospitalsRaw, inventoryRows, emergenciesRaw] = await Promise.all([
    HospitalProfile.find({ verificationStatus: 'approved' })
      .select('_id hospitalName location')
      .lean(),
    BloodInventory.aggregate([
      { $match: { status: { $in: ['Available', 'Reserved'] } } },
      {
        $group: {
          _id: { hospitalId: '$hospitalId', bloodGroup: '$bloodGroup' },
          availableUnits: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Available'] }, 1, 0]
            }
          },
          reservedUnits: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Reserved'] }, 1, 0]
            }
          },
          expiringSoonUnits: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'Available'] },
                    { $lte: ['$expiryDate', expiryWindow] },
                    { $gte: ['$expiryDate', now] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]),
    EmergencyRequest.find({ lifecycleStatus: { $in: ACTIVE_EMERGENCY_STATES }, isActive: true })
      .select('_id requestingHospitalId bloodGroup unitsRequired severityLevel urgencyScore createdAt')
      .sort({ urgencyScore: -1, createdAt: 1 })
      .limit(100)
      .lean()
  ]);

  const hospitalMap = new Map();
  for (const h of hospitalsRaw) {
    const coords = h?.location?.coordinates || [];
    hospitalMap.set(String(h._id), {
      id: String(h._id),
      name: h.hospitalName || 'Hospital',
      location: {
        lat: Number(coords[1] || 0),
        lng: Number(coords[0] || 0)
      },
      inventory_by_group: BLOOD_GROUPS.reduce((acc, bg) => {
        acc[bg] = { available: 0, reserved: 0, expiringSoon: 0 };
        return acc;
      }, {})
    });
  }

  for (const row of inventoryRows) {
    const hospitalId = String(row._id.hospitalId);
    const bloodGroup = row._id.bloodGroup;
    const hospital = hospitalMap.get(hospitalId);
    if (!hospital || !hospital.inventory_by_group[bloodGroup]) continue;
    hospital.inventory_by_group[bloodGroup] = {
      available: Number(row.availableUnits || 0),
      reserved: Number(row.reservedUnits || 0),
      expiringSoon: Number(row.expiringSoonUnits || 0)
    };
  }

  const hospitals = Array.from(hospitalMap.values());
  const idToIndex = new Map(hospitals.map((h, idx) => [h.id, idx]));

  const distances = hospitals.map((a) => hospitals.map((b) => {
    if (a.id === b.id) return 0;
    const hasCoords = a.location.lat && a.location.lng && b.location.lat && b.location.lng;
    if (!hasCoords) return 60;
    return Number(haversineKm(a.location.lat, a.location.lng, b.location.lat, b.location.lng).toFixed(2));
  }));

  const expiry_risk = {};
  for (const h of hospitals) {
    const totals = BLOOD_GROUPS.reduce((acc, bg) => {
      const g = h.inventory_by_group[bg];
      acc.available += g.available;
      acc.expiringSoon += g.expiringSoon;
      return acc;
    }, { available: 0, expiringSoon: 0 });
    expiry_risk[h.id] = totals.available > 0 ? Number((totals.expiringSoon / totals.available).toFixed(4)) : 0;
  }

  const emergencies = emergenciesRaw.map((e) => ({
    id: String(e._id),
    requestingHospitalId: String(e.requestingHospitalId),
    blood_group: e.bloodGroup,
    units_required: Number(e.unitsRequired || 0),
    urgency: normalizeUrgency(e.severityLevel, e.urgencyScore),
    severity: String(e.severityLevel || 'HIGH').toUpperCase(),
    urgencyScore: Number(e.urgencyScore || 70)
  }));

  return {
    hospitals,
    emergencies,
    distances,
    expiry_risk,
    hospitalIndexMap: Object.fromEntries(idToIndex),
    generatedAt: new Date().toISOString()
  };
}

module.exports = {
  buildState,
  BLOOD_GROUPS
};
