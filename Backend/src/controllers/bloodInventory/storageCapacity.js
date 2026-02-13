const BloodInventory = require('../../models/BloodInventory');

exports.getStorageCapacity = async (req, res) => {
  try {
    const hospitalId = req.user.hospitalProfileId;

    const totalCapacity = 500;

    const usedCapacity = await BloodInventory.countDocuments({
      hospitalId,
      status: { $in: ['Available', 'Reserved'] }
    });

    const availableStorage = totalCapacity - usedCapacity;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);

    const expectedIncomingUnits = Math.floor(Math.random() * 50) + 10;

    const excessUnits = Math.max(0, expectedIncomingUnits - availableStorage);

    const overflowRisk = excessUnits > 0;

    let temporaryStorageCenter = null;

    if (overflowRisk) {
      temporaryStorageCenter = {
        name: 'City Central Blood Bank',
        distance: Math.floor(Math.random() * 20) + 5,
        estimatedRetrievalTime: Math.floor(Math.random() * 40) + 15
      };
    }

    res.json({
      success: true,
      data: {
        totalCapacity,
        usedCapacity,
        availableStorage,
        expectedIncomingUnits,
        excessUnits,
        overflowRisk,
        status: overflowRisk ? 'Overflow Risk' : 'Storage Safe',
        temporaryStorageCenter
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
