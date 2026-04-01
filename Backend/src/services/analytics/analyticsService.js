const EmergencyRequest = require('../../models/EmergencyRequest');
const BloodInventory = require('../../models/BloodInventory');
const HospitalProfile = require('../../models/HospitalProfile');

const getEmergencyStats = async (timeRange = 'week') => {
  const dateFilter = getDateFilter(timeRange);

  const [total, bySeverity, byBloodGroup, avgResponseTime] = await Promise.all([
    EmergencyRequest.countDocuments({ createdAt: { $gte: dateFilter } }),
    EmergencyRequest.aggregate([
      { $match: { createdAt: { $gte: dateFilter } } },
      { $group: { _id: '$severityLevel', count: { $sum: 1 } } }
    ]),
    EmergencyRequest.aggregate([
      { $match: { createdAt: { $gte: dateFilter } } },
      { $group: { _id: '$bloodGroup', count: { $sum: 1 } } }
    ]),
    EmergencyRequest.aggregate([
      { $match: { createdAt: { $gte: dateFilter }, acceptedAt: { $exists: true } } },
      {
        $group: {
          _id: null,
          avgTime: { $avg: { $subtract: ['$acceptedAt', '$createdAt'] } }
        }
      }
    ])
  ]);

  return {
    total,
    bySeverity,
    byBloodGroup,
    avgResponseTime: avgResponseTime[0]?.avgTime
      ? Math.round(avgResponseTime[0].avgTime / 60000)
      : 0
  };
};

const getSystemHealthMetrics = async () => {
  const [
    totalHospitals,
    activeHospitals,
    totalInventory,
    pendingEmergencies,
    criticalEmergencies
  ] = await Promise.all([
    HospitalProfile.countDocuments(),
    HospitalProfile.countDocuments({ verificationStatus: 'approved' }),
    BloodInventory.countDocuments({ status: 'Available' }),
    EmergencyRequest.countDocuments({
      lifecycleStatus: { $in: ['CREATED', 'MEDICAL_VERIFICATION_PENDING'] }
    }),
    EmergencyRequest.countDocuments({
      lifecycleStatus: { $in: ['CREATED', 'MEDICAL_VERIFICATION_PENDING'] },
      severityLevel: 'CRITICAL'
    })
  ]);

  return {
    totalHospitals,
    activeHospitals,
    totalInventory,
    pendingEmergencies,
    criticalEmergencies
  };
};

const getBloodAvailabilityMatrix = async () => {
  const matrix = await BloodInventory.aggregate([
    { $match: { status: 'Available' } },
    {
      $group: {
        _id: { bloodGroup: '$bloodGroup', hospitalId: '$hospitalId' },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.bloodGroup',
        totalUnits: { $sum: '$count' },
        hospitalCount: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);
  return matrix;
};

function getDateFilter(timeRange) {
  const now = new Date();
  const filters = {
    day: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    year: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
  };
  return filters[timeRange] || filters.week;
}

module.exports = {
  getEmergencyStats,
  getSystemHealthMetrics,
  getBloodAvailabilityMatrix
};
