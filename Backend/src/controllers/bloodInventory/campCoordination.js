const BloodCamp = require('../../models/BloodCamp');
const HospitalProfile = require('../../models/HospitalProfile');

exports.getNearbyCampsInventory = async (req, res) => {
  try {
    const hospitalId = req.user.hospitalProfileId;

    const hospital = await HospitalProfile.findById(hospitalId);
    if (!hospital || !hospital.location || !hospital.location.coordinates) {
      return res.status(400).json({
        success: false,
        message: 'Hospital location not configured'
      });
    }

    const maxDistance = parseInt(req.query.radius) || 50000;

    const camps = await BloodCamp.find({
      'venue.location': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: hospital.location.coordinates
          },
          $maxDistance: maxDistance
        }
      },
      'lifecycle.status': { $in: ['Ongoing', 'Completed'] },
      'stats.bloodUnitsCollected': { $gt: 0 }
    })
    .select('campName venue schedule stats bloodGroupsNeeded medicalSupport')
    .limit(10)
    .lean();

    const campsWithDistance = camps.map(camp => {
      const distance = calculateDistance(
        hospital.location.coordinates,
        camp.venue.location.coordinates
      );

      const bloodInventory = generateBloodInventory(camp);

      return {
        _id: camp._id,
        campName: camp.campName,
        venue: {
          name: camp.venue.name,
          address: camp.venue.address,
          city: camp.venue.city
        },
        schedule: camp.schedule,
        distance: Math.round(distance),
        estimatedTransferTime: Math.round(distance / 40 * 60),
        totalUnitsCollected: camp.stats.bloodUnitsCollected,
        bloodInventory,
        coordinatingHospital: camp.medicalSupport.coordinatingHospital
      };
    });

    res.json({
      success: true,
      data: {
        hospitalLocation: {
          coordinates: hospital.location.coordinates,
          address: hospital.address
        },
        nearbyCamps: campsWithDistance,
        searchRadius: maxDistance / 1000
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const calculateDistance = (coords1, coords2) => {
  const [lon1, lat1] = coords1;
  const [lon2, lat2] = coords2;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const generateBloodInventory = (camp) => {
  const totalUnits = camp.stats.bloodUnitsCollected || 0;
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  
  const inventory = {};
  bloodGroups.forEach(group => {
    const baseUnits = Math.floor(totalUnits / 8);
    const variance = Math.floor(Math.random() * 3);
    inventory[group] = Math.max(0, baseUnits + variance);
  });

  return inventory;
};

exports.requestBloodFromCamp = async (req, res) => {
  try {
    const hospitalId = req.user.hospitalProfileId;
    const { campId, bloodGroup, units, reason } = req.body;

    if (!campId || !bloodGroup || !units || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Camp ID, blood group, units, and reason are required'
      });
    }

    const camp = await BloodCamp.findById(campId);
    if (!camp) {
      return res.status(404).json({
        success: false,
        message: 'Blood camp not found'
      });
    }

    const hospital = await HospitalProfile.findById(hospitalId);
    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found'
      });
    }

    const requestData = {
      requestId: `REQ${Date.now()}`,
      hospital: {
        id: hospitalId,
        name: hospital.hospitalName
      },
      camp: {
        id: campId,
        name: camp.campName
      },
      bloodGroup,
      unitsRequested: units,
      reason,
      status: 'Pending',
      requestedAt: new Date(),
      estimatedDeliveryTime: Math.round(
        calculateDistance(
          hospital.location.coordinates,
          camp.venue.location.coordinates
        ) / 40 * 60
      )
    };

    res.json({
      success: true,
      message: 'Blood transfer request submitted successfully',
      data: requestData
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
