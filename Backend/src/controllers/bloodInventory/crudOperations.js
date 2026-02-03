const BloodInventory = require('../../models/BloodInventory');

// Get all blood units with filters (pagination, blood group, status)
exports.getAllUnits = async (req, res) => {
  try {
    // this line of code gets hospital id from the logged in user from authentiation token
    const hospitalId = req.user.hospitalProfileId;
    const { bloodGroup, status, page = 1, limit = 50 } = req.query;

    const filter = { hospitalId };
    if (bloodGroup) filter.bloodGroup = bloodGroup;
    if (status) filter.status = status;

    const skip = (page - 1) * limit;

    const units = await BloodInventory.find(filter)
      .sort({ collectionDate: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const unitsWithExpiry = units.map(unit => ({
      ...unit,
      daysUntilExpiry: Math.ceil((new Date(unit.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))
    }));

    const totalCount = await BloodInventory.countDocuments(filter);

    res.json({
      success: true,
      data: {
        units: unitsWithExpiry,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / limit),
          totalUnits: totalCount
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add single blood unit
exports.addUnit = async (req, res) => {
  try {
    const hospitalId = req.user.hospitalProfileId;
    const { bloodGroup, storageType, volume, collectionDate, donorInfo, storageLocation, notes } = req.body;

    if (!bloodGroup) {
      return res.status(400).json({ success: false, message: 'Blood group is required' });
    }

    // Calculate expiry based on storage type
    let expiryDays = 35;
    if (storageType === 'Platelets') expiryDays = 5;
    else if (storageType === 'Plasma') expiryDays = 365;
    else if (storageType === 'RBC') expiryDays = 42;

    const expiryDate = new Date(collectionDate || Date.now());
    expiryDate.setDate(expiryDate.getDate() + expiryDays);

    const newUnit = new BloodInventory({
      hospitalId,
      bloodGroup: bloodGroup.toUpperCase(),
      storageType: storageType || 'Whole Blood',
      volume: volume || 450,
      collectionDate: collectionDate || Date.now(),
      expiryDate,
      donorInfo: donorInfo || {},
      storageLocation: storageLocation || {},
      notes,
      status: 'Available',
      lifecycle: [{
        stage: 'Collected',
        timestamp: new Date(),
        performedBy: req.user.id,
        notes: 'Unit added to inventory'
      }]
    });

    await newUnit.save();
    res.status(201).json({ success: true, message: 'Unit added successfully', data: newUnit });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Bulk add units from CSV
exports.bulkAddUnits = async (req, res) => {
  try {
    const hospitalId = req.user.hospitalProfileId;
    const { units } = req.body;

    if (!Array.isArray(units) || units.length === 0) {
      return res.status(400).json({ success: false, message: 'Units array required' });
    }

    const createdUnits = [];
    const errors = [];

    for (let i = 0; i < units.length; i++) {
      try {
        const unitData = units[i];
        
        let expiryDays = 35;
        if (unitData.storageType === 'Platelets') expiryDays = 5;
        else if (unitData.storageType === 'Plasma') expiryDays = 365;

        const expiryDate = new Date(unitData.collectionDate || Date.now());
        expiryDate.setDate(expiryDate.getDate() + expiryDays);

        const newUnit = new BloodInventory({
          hospitalId,
          bloodGroup: unitData.bloodGroup.toUpperCase(),
          storageType: unitData.storageType || 'Whole Blood',
          volume: unitData.volume || 450,
          collectionDate: unitData.collectionDate || Date.now(),
          expiryDate,
          storageLocation: unitData.storageLocation || {},
          status: 'Available',
          lifecycle: [{ stage: 'Collected', timestamp: new Date(), performedBy: req.user.id }]
        });

        await newUnit.save();
        createdUnits.push(newUnit);
      } catch (error) {
        errors.push({ index: i, error: error.message });
      }
    }

    res.status(201).json({
      success: true,
      message: `Added ${createdUnits.length} units`,
      data: { created: createdUnits.length, failed: errors.length, errors }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update existing unit
exports.updateUnit = async (req, res) => {
  try {
    const { unitId } = req.params;
    const updates = req.body;

    const unit = await BloodInventory.findByIdAndUpdate(unitId, { $set: updates }, { new: true });

    if (!unit) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }

    res.json({ success: true, message: 'Unit updated', data: unit });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete unit (only expired/quarantined)
exports.deleteUnit = async (req, res) => {
  try {
    const { unitId } = req.params;
    const unit = await BloodInventory.findById(unitId);

    if (!unit) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }

    if (!['Expired', 'Quarantined'].includes(unit.status)) {
      return res.status(400).json({ success: false, message: 'Can only delete expired or quarantined units' });
    }

    await BloodInventory.findByIdAndDelete(unitId);
    res.json({ success: true, message: 'Unit deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};