const User = require('../models/User');
const BloodNews = require('../models/BloodNews');

const getNearbyBloodBanks = async (req, res) => {
  try {
    const { latitude, longitude, radius = 10, bloodGroup } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const radiusInMeters = parseFloat(radius) * 1000;

    const query = {
      role: 'HOSPITAL_ADMIN',
      isActive: true,
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: radiusInMeters
        }
      }
    };

    const hospitals = await User.find(query)
      .select('hospitalName email phone location address city state')
      .limit(20);

    const hospitalsWithDistance = hospitals.map(hospital => {
      const [hospLong, hospLat] = hospital.location.coordinates;
      const distance = calculateDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        hospLat,
        hospLong
      );
      return {
        ...hospital.toObject(),
        distance: parseFloat(distance.toFixed(2))
      };
    });

    res.status(200).json({
      success: true,
      count: hospitalsWithDistance.length,
      data: hospitalsWithDistance
    });

  } catch (error) {
    console.error('Nearby blood banks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch nearby blood banks',
      error: error.message
    });
  }
};

const getBloodNews = async (req, res) => {
  try {
    const { latitude, longitude, radius = 50, bloodGroup } = req.query;

    const query = {
      isActive: true,
      expiresAt: { $gt: new Date() },
      urgencyLevel: { $in: ['low', 'medium'] }
    };

    if (bloodGroup && bloodGroup !== 'ALL') {
      query.$or = [
        { bloodGroup: bloodGroup },
        { bloodGroup: 'ALL' }
      ];
    }

    let bloodNews;

    if (latitude && longitude) {
      const radiusInMeters = parseFloat(radius) * 1000;
      bloodNews = await BloodNews.find({
        ...query,
        'location.coordinates': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [parseFloat(longitude), parseFloat(latitude)]
            },
            $maxDistance: radiusInMeters
          }
        }
      })
        .populate('hospitalId', 'hospitalName phone email')
        .sort({ createdAt: -1 })
        .limit(50);
    } else {
      bloodNews = await BloodNews.find(query)
        .populate('hospitalId', 'hospitalName phone email')
        .sort({ createdAt: -1 })
        .limit(50);
    }

    res.status(200).json({
      success: true,
      count: bloodNews.length,
      data: bloodNews
    });

  } catch (error) {
    console.error('Blood news error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blood news',
      error: error.message
    });
  }
};

const respondToBloodNews = async (req, res) => {
  try {
    const { newsId } = req.params;
    const { message } = req.body;

    const news = await BloodNews.findById(newsId);

    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'Blood news not found'
      });
    }

    if (!news.isActive || news.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'This blood request is no longer active'
      });
    }

    await news.incrementResponse();

    res.status(200).json({
      success: true,
      message: 'Response recorded. Hospital will contact you.',
      data: {
        hospitalContact: news.contactInfo,
        newsId: news._id
      }
    });

  } catch (error) {
    console.error('Respond to news error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to respond to blood news',
      error: error.message
    });
  }
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (value) => {
  return (value * Math.PI) / 180;
};

module.exports = {
  getNearbyBloodBanks,
  getBloodNews,
  respondToBloodNews
};
