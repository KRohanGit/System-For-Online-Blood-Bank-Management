const BloodInventory = require('../../models/BloodInventory');

// Emergency auto-release: unlocks reserved stock and overrides thresholds
exports.emergencyRelease = async (req, res) => {
  try {
    const hospitalId = req.user.hospitalProfileId;
    const { bloodGroup, requiredUnits, patientInfo } = req.body;

    if (!bloodGroup || !requiredUnits) {
      return res.status(400).json({ success: false, message: 'Blood group and units required' });
    }

    const availableUnits = await BloodInventory.find({
      hospitalId,
      bloodGroup: bloodGroup.toUpperCase(),
      status: { $in: ['Available', 'Reserved'] }
    })
    .sort({ expiryDate: 1 })
    .limit(requiredUnits);

    if (availableUnits.length === 0) {
      return res.status(404).json({ success: false, message: 'No units available' });
    }

    const issuedUnits = [];
    for (const unit of availableUnits) {
      unit.status = 'Issued';
      unit.issuanceInfo = {
        issuedTo: patientInfo || 'Emergency Patient',
        issuedBy: req.user.id,
        issuedAt: new Date(),
        purpose: 'EMERGENCY'
      };
      unit.lifecycle.push({
        stage: 'Issued',
        timestamp: new Date(),
        performedBy: req.user.id,
        notes: 'EMERGENCY AUTO-RELEASE'
      });
      await unit.save();
      issuedUnits.push(unit);
    }

    res.json({
      success: true,
      message: `Emergency: ${issuedUnits.length} units issued`,
      data: { requested: requiredUnits, issued: issuedUnits.length, units: issuedUnits }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
