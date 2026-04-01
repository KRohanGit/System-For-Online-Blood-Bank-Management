const BloodInventory = require('../../models/BloodInventory');

const getStockByHospital = async (hospitalId) => {
  const pipeline = [
    { $match: { hospitalId, status: 'Available' } },
    {
      $group: {
        _id: '$bloodGroup',
        totalUnits: { $sum: 1 },
        totalVolume: { $sum: '$volume' }
      }
    },
    { $sort: { _id: 1 } }
  ];
  return BloodInventory.aggregate(pipeline);
};

const getExpiringUnits = async (hospitalId, daysThreshold = 7) => {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

  return BloodInventory.find({
    hospitalId,
    status: 'Available',
    expiryDate: { $lte: thresholdDate, $gte: new Date() }
  }).sort({ expiryDate: 1 });
};

const getWastageRisk = async (hospitalId) => {
  const now = new Date();
  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const [total, expiringSeven, expiringThree, expired] = await Promise.all([
    BloodInventory.countDocuments({ hospitalId, status: 'Available' }),
    BloodInventory.countDocuments({
      hospitalId,
      status: 'Available',
      expiryDate: { $lte: sevenDays, $gte: now }
    }),
    BloodInventory.countDocuments({
      hospitalId,
      status: 'Available',
      expiryDate: { $lte: threeDays, $gte: now }
    }),
    BloodInventory.countDocuments({
      hospitalId,
      status: 'Available',
      expiryDate: { $lt: now }
    })
  ]);

  const wastageRate = total > 0 ? ((expired + expiringThree) / total) * 100 : 0;

  return {
    totalUnits: total,
    expiringSeven,
    expiringThree,
    expired,
    wastageRate: Math.round(wastageRate * 100) / 100
  };
};

const getFIFOSuggestions = async (hospitalId) => {
  return BloodInventory.find({
    hospitalId,
    status: 'Available'
  })
    .sort({ expiryDate: 1 })
    .limit(20);
};

module.exports = {
  getStockByHospital,
  getExpiringUnits,
  getWastageRisk,
  getFIFOSuggestions
};
