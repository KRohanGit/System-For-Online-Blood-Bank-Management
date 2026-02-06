const DoctorClinicalDecision = require('../models/DoctorClinicalDecision');
const DoctorProfile = require('../models/DoctorProfile');
const HospitalProfile = require('../models/HospitalProfile');

exports.getAuditLogs = async (req, res) => {
  try {
    const { startDate, endDate, doctorId, hospitalId, actionType, page = 1, limit = 50 } = req.query;
    
    const filter = {};
    
    if (startDate && endDate) {
      filter.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    if (doctorId) filter.doctorId = doctorId;
    if (actionType) filter.actionType = actionType;
    
    const skip = (page - 1) * limit;
    
    const logs = await DoctorClinicalDecision.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('doctorId', 'email')
      .lean();

    const total = await DoctorClinicalDecision.countDocuments(filter);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
  }
};

exports.getActionDistribution = async (req, res) => {
  try {
    const { startDate, endDate, doctorId } = req.query;
    
    const filter = {};
    if (startDate && endDate) {
      filter.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    if (doctorId) filter.doctorId = doctorId;

    const distribution = await DoctorClinicalDecision.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$actionType',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: distribution.map(d => ({
        actionType: d._id,
        count: d.count
      }))
    });
  } catch (error) {
    console.error('Error fetching action distribution:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch distribution' });
  }
};

exports.getOverrideFrequency = async (req, res) => {
  try {
    const { days = 30, doctorId } = req.query;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const filter = {
      timestamp: { $gte: startDate },
      actionType: 'overridden'
    };
    if (doctorId) filter.doctorId = doctorId;

    const frequency = await DoctorClinicalDecision.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: frequency.map(f => ({
        date: f._id,
        overrides: f.count
      }))
    });
  } catch (error) {
    console.error('Error fetching override frequency:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch frequency' });
  }
};

exports.getBloodUsageAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const filter = {
      caseType: { $in: ['blood_unit_validation', 'clinical_advisory'] }
    };
    
    if (startDate && endDate) {
      filter.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const analytics = await DoctorClinicalDecision.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$metadata.bloodGroup',
          used: {
            $sum: {
              $cond: [{ $eq: ['$actionType', 'accepted'] }, 1, 0]
            }
          },
          wasted: {
            $sum: {
              $cond: [{ $eq: ['$actionType', 'rejected'] }, 1, 0]
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: analytics.map(a => ({
        bloodGroup: a._id || 'Unknown',
        used: a.used,
        wasted: a.wasted
      }))
    });
  } catch (error) {
    console.error('Error fetching blood usage analytics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
};

exports.getEmergencyTagPatterns = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const patterns = await DoctorClinicalDecision.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate },
          'metadata.emergencyLevel': { $exists: true }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            emergencyLevel: '$metadata.emergencyLevel'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    const formatted = patterns.reduce((acc, item) => {
      const date = item._id.date;
      if (!acc[date]) {
        acc[date] = { date, critical: 0, urgent: 0, moderate: 0 };
      }
      acc[date][item._id.emergencyLevel] = item.count;
      return acc;
    }, {});

    res.json({
      success: true,
      data: Object.values(formatted)
    });
  } catch (error) {
    console.error('Error fetching emergency tag patterns:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch patterns' });
  }
};

exports.getAuditLogDetails = async (req, res) => {
  try {
    const { logId } = req.params;
    
    const log = await DoctorClinicalDecision.findById(logId)
      .populate('doctorId', 'email')
      .lean();

    if (!log) {
      return res.status(404).json({ success: false, message: 'Audit log not found' });
    }

    res.json({
      success: true,
      data: log
    });
  } catch (error) {
    console.error('Error fetching audit log details:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch log details' });
  }
};
