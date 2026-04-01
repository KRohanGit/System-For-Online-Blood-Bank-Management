const {
  createChainRequest,
  respondToChainRequest,
  getRequesterRequests,
  getPendingForDonor,
  getRequestByIdForUser
} = require('../services/peerEmergencyChainService');

const parseLocation = (location) => {
  if (!location || typeof location !== 'object') return null;
  const lat = Number(location.lat ?? location.latitude);
  const lng = Number(location.lng ?? location.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return {
    type: 'Point',
    coordinates: [lng, lat],
    address: location.address || null,
    city: location.city || null,
    state: location.state || null
  };
};

const requestEmergencyDonorChain = async (req, res) => {
  try {
    const { bloodGroup, location, urgency, unitsNeeded } = req.body;

    if (!bloodGroup || !location || !unitsNeeded) {
      return res.status(400).json({
        success: false,
        message: 'bloodGroup, location and unitsNeeded are required'
      });
    }

    const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    if (!validBloodGroups.includes(String(bloodGroup).toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid blood group'
      });
    }

    const parsedLocation = parseLocation(location);
    if (!parsedLocation) {
      return res.status(400).json({
        success: false,
        message: 'Invalid location coordinates'
      });
    }

    const parsedUnits = Number(unitsNeeded);
    if (!Number.isFinite(parsedUnits) || parsedUnits < 1 || parsedUnits > 20) {
      return res.status(400).json({
        success: false,
        message: 'unitsNeeded must be between 1 and 20'
      });
    }

    const request = await createChainRequest({
      requesterId: req.user._id,
      bloodGroup: String(bloodGroup).toUpperCase(),
      location: parsedLocation,
      urgency,
      unitsNeeded: parsedUnits
    });

    return res.status(201).json({
      success: true,
      message: 'Emergency donor chain initiated',
      data: request
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to initiate donor chain',
      error: error.message
    });
  }
};

const respondEmergencyDonorChain = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { decision } = req.body;

    const updated = await respondToChainRequest({
      requestId,
      donorId: req.user._id,
      decision
    });

    return res.status(200).json({
      success: true,
      message: 'Donor response recorded',
      data: updated
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to submit donor response'
    });
  }
};

const getMyEmergencyChainRequests = async (req, res) => {
  try {
    const data = await getRequesterRequests(req.user._id);
    return res.status(200).json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to load emergency chain requests',
      error: error.message
    });
  }
};

const getMyPendingDonorChainActions = async (req, res) => {
  try {
    const data = await getPendingForDonor(req.user._id);
    return res.status(200).json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to load pending donor chain actions',
      error: error.message
    });
  }
};

const getEmergencyChainRequestById = async (req, res) => {
  try {
    const { requestId } = req.params;
    const data = await getRequestByIdForUser(requestId, req.user._id);
    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch emergency request',
      error: error.message
    });
  }
};

module.exports = {
  requestEmergencyDonorChain,
  respondEmergencyDonorChain,
  getMyEmergencyChainRequests,
  getMyPendingDonorChainActions,
  getEmergencyChainRequestById
};
