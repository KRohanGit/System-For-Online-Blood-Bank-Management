const BloodInventory = require('../../models/BloodInventory');

// Get stock overview for all 8 blood groups with statistics
exports.getStockOverview = async (req, res) => {
  try {
    const hospitalId = req.user.hospitalProfileId;
    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
    
    const overview = await Promise.all(bloodGroups.map(async (bloodGroup) => {
      const availableUnits = await BloodInventory.countDocuments({
        hospitalId,
        bloodGroup,
        status: 'Available'
      });

      const lastUpdated = await BloodInventory.findOne({
        hospitalId,
        bloodGroup
      }).sort({ updatedAt: -1 }).select('updatedAt');

      const twoDaysFromNow = new Date();
      twoDaysFromNow.setHours(twoDaysFromNow.getHours() + 48);
      
      const expiringSoon = await BloodInventory.countDocuments({
        hospitalId,
        bloodGroup,
        status: 'Available',
        expiryDate: { $gte: new Date(), $lte: twoDaysFromNow }
      });

      let stockStatus = 'adequate';
      if (availableUnits === 0) stockStatus = 'out-of-stock';
      else if (availableUnits < 5) stockStatus = 'critical';
      else if (availableUnits < 10) stockStatus = 'low';

      return {
        bloodGroup,
        units: availableUnits,
        lastUpdated: lastUpdated?.updatedAt,
        expiringSoon,
        status: stockStatus
      };
    }));

    const totalUnits = overview.reduce((sum, item) => sum + item.units, 0);
    const criticalGroups = overview.filter(item => item.status === 'critical').length;
    const lowStockGroups = overview.filter(item => item.status === 'low').length;

    res.json({
      success: true,
      data: {
        overview,
        statistics: {
          totalUnits,
          criticalGroups,
          lowStockGroups,
          bloodGroupsAvailable: overview.filter(item => item.units > 0).length
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get units expiring soon (categorized by urgency)
exports.getExpiringUnits = async (req, res) => {
  try {
    const hospitalId = req.user.hospitalProfileId;
    const { days = 7 } = req.query;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + parseInt(days));

    const expiringUnits = await BloodInventory.find({
      hospitalId,
      status: 'Available',
      expiryDate: { $gte: new Date(), $lte: futureDate }
    }).sort({ expiryDate: 1 }).lean();

    const now = new Date();
    const categorized = { critical: [], urgent: [], warning: [] };

    expiringUnits.forEach(unit => {
      const hoursLeft = (new Date(unit.expiryDate) - now) / (1000 * 60 * 60);
      if (hoursLeft < 24) categorized.critical.push(unit);
      else if (hoursLeft < 72) categorized.urgent.push(unit);
      else categorized.warning.push(unit);
    });

    res.json({
      success: true,
      data: {
        total: expiringUnits.length,
        categorized,
        summary: {
          critical: categorized.critical.length,
          urgent: categorized.urgent.length,
          warning: categorized.warning.length
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get FIFO suggestions (oldest blood first to prevent waste)
exports.getFIFOSuggestions = async (req, res) => {
  try {
    const hospitalId = req.user.hospitalProfileId;
    const { bloodGroup, count = 1 } = req.query;

    if (!bloodGroup) {
      return res.status(400).json({ success: false, message: 'Blood group required' });
    }

    const suggestions = await BloodInventory.find({
      hospitalId,
      bloodGroup: bloodGroup.toUpperCase(),
      status: 'Available'
    })
    .sort({ collectionDate: 1, expiryDate: 1 })
    .limit(parseInt(count))
    .lean();

    res.json({ success: true, message: 'FIFO: Issue oldest blood first', data: suggestions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
