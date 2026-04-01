const HospitalProfile = require('../../models/HospitalProfile');
const EmergencyRequest = require('../../models/EmergencyRequest');
const BloodTransfer = require('../../models/BloodTransfer');
const { haversineKm } = require('./haversine');

const DEFAULT_MAX_DISTANCE_KM = 175;

function edgeKey(a, b) {
  return [String(a), String(b)].sort().join('::');
}

function parseCoordinates(hospital) {
  const coords = hospital?.location?.coordinates;
  if (!Array.isArray(coords) || coords.length !== 2) return null;
  const [lng, lat] = coords;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  return { lat, lng };
}

function getHospitalName(hospital) {
  return (
    hospital.hospitalName ||
    hospital.name ||
    hospital.adminName ||
    hospital.officialEmail ||
    String(hospital._id)
  );
}

function ensureEdge(edges, fromId, toId) {
  const key = edgeKey(fromId, toId);
  if (!edges.has(key)) {
    edges.set(key, {
      key,
      fromHospitalId: String(fromId),
      toHospitalId: String(toId),
      distanceKm: null,
      transferCount: 0,
      emergencyCount: 0,
      weight: 0
    });
  }
  return edges.get(key);
}

function computeWeight(edge) {
  const distanceComponent =
    edge.distanceKm == null ? 0 : Math.max(0, 1 - edge.distanceKm / (DEFAULT_MAX_DISTANCE_KM * 1.5));
  const transferComponent = Math.log1p(edge.transferCount) * 0.7;
  const emergencyComponent = Math.log1p(edge.emergencyCount) * 0.5;
  return Number((distanceComponent + transferComponent + emergencyComponent).toFixed(4));
}

async function buildGraphState(options = {}) {
  const maxDistanceKm = Number(options.maxDistanceKm || DEFAULT_MAX_DISTANCE_KM);
  const lookbackDays = Number(options.lookbackDays || 120);
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

  const [hospitals, transfersAgg, emergencyAgg] = await Promise.all([
    HospitalProfile.find({ verificationStatus: { $in: ['approved', 'pending', 'rejected'] } })
      .select('_id hospitalName name adminName officialEmail city state location')
      .lean(),
    BloodTransfer.aggregate([
      {
        $match: {
          createdAt: { $gte: since },
          sourceHospitalId: { $exists: true, $ne: null },
          destinationHospitalId: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: { from: '$sourceHospitalId', to: '$destinationHospitalId' },
          transferCount: { $sum: 1 }
        }
      }
    ]),
    EmergencyRequest.aggregate([
      {
        $match: {
          createdAt: { $gte: since },
          requestingHospitalId: { $exists: true, $ne: null },
          assignedHospitalId: { $exists: true, $ne: null },
          lifecycleStatus: { $nin: ['CANCELLED', 'FAILED'] }
        }
      },
      {
        $group: {
          _id: { from: '$requestingHospitalId', to: '$assignedHospitalId' },
          emergencyCount: { $sum: 1 }
        }
      }
    ])
  ]);

  const nodeMap = new Map();
  const edges = new Map();

  for (const h of hospitals) {
    const id = String(h._id);
    nodeMap.set(id, {
      hospitalId: id,
      hospitalName: getHospitalName(h),
      city: h.city || null,
      state: h.state || null,
      coordinates: parseCoordinates(h)
    });
  }

  const nodeIds = [...nodeMap.keys()];
  for (let i = 0; i < nodeIds.length; i += 1) {
    for (let j = i + 1; j < nodeIds.length; j += 1) {
      const fromId = nodeIds[i];
      const toId = nodeIds[j];
      const a = nodeMap.get(fromId)?.coordinates;
      const b = nodeMap.get(toId)?.coordinates;
      if (!a || !b) continue;
      const distanceKm = haversineKm(a.lat, a.lng, b.lat, b.lng);
      if (distanceKm > maxDistanceKm) continue;
      const edge = ensureEdge(edges, fromId, toId);
      edge.distanceKm = Number(distanceKm.toFixed(3));
    }
  }

  for (const row of transfersAgg) {
    const fromId = row?._id?.from && String(row._id.from);
    const toId = row?._id?.to && String(row._id.to);
    if (!fromId || !toId || fromId === toId) continue;
    if (!nodeMap.has(fromId) || !nodeMap.has(toId)) continue;
    const edge = ensureEdge(edges, fromId, toId);
    edge.transferCount += Number(row.transferCount || 0);
  }

  for (const row of emergencyAgg) {
    const fromId = row?._id?.from && String(row._id.from);
    const toId = row?._id?.to && String(row._id.to);
    if (!fromId || !toId || fromId === toId) continue;
    if (!nodeMap.has(fromId) || !nodeMap.has(toId)) continue;
    const edge = ensureEdge(edges, fromId, toId);
    edge.emergencyCount += Number(row.emergencyCount || 0);
  }

  const edgeList = [...edges.values()].map((edge) => ({
    ...edge,
    weight: computeWeight(edge)
  }));

  const adjacency = new Map();
  for (const id of nodeMap.keys()) {
    adjacency.set(id, []);
  }

  for (const edge of edgeList) {
    if (edge.weight <= 0) continue;
    adjacency.get(edge.fromHospitalId)?.push({ to: edge.toHospitalId, weight: edge.weight, edge });
    adjacency.get(edge.toHospitalId)?.push({ to: edge.fromHospitalId, weight: edge.weight, edge });
  }

  const filteredEdges = edgeList.filter((e) => e.weight > 0);

  return {
    nodes: [...nodeMap.values()],
    nodeMap,
    edges: filteredEdges,
    adjacency,
    maxDistanceKm,
    lookbackDays,
    generatedAt: new Date().toISOString()
  };
}

module.exports = {
  buildGraphState
};
