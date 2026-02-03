const BloodInventory = require('../../models/BloodInventory');

// Reserve a blood unit for a patient
exports.reserveUnit = async (req, res) => {
  try {
    const { unitId } = req.params;
    const { reservedFor, priority } = req.body;

    const unit = await BloodInventory.findById(unitId);
    if (!unit) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }
    if (unit.status !== 'Available') {
      return res.status(400).json({ success: false, message: 'Unit not available' });
    }

    await unit.reserve(reservedFor, req.user.id, priority);
    res.json({ success: true, message: 'Unit reserved', data: unit });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Issue a blood unit to a patient
exports.issueUnit = async (req, res) => {
  try {
    const { unitId } = req.params;
    const { issuedTo, purpose } = req.body;

    const unit = await BloodInventory.findById(unitId);
    if (!unit) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }
    if (!['Available', 'Reserved'].includes(unit.status)) {
      return res.status(400).json({ success: false, message: 'Unit cannot be issued' });
    }

    await unit.issue(issuedTo, req.user.id, purpose);
    res.json({ success: true, message: 'Unit issued', data: unit });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get complete lifecycle timeline for audit (blockchain-ready)
exports.getUnitLifecycle = async (req, res) => {
  try {
    const { unitId } = req.params;
    const unit = await BloodInventory.findById(unitId)
      .populate('lifecycle.performedBy', 'email')
      .lean();

    if (!unit) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }

    res.json({
      success: true,
      data: {
        unitId: unit.bloodUnitId,
        currentStatus: unit.status,
        lifecycle: unit.lifecycle,
        collectedOn: unit.collectionDate,
        expiresOn: unit.expiryDate
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
