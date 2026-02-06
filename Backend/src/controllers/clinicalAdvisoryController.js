const ClinicalAdvisory = require('../models/ClinicalAdvisory');
const BloodInventory = require('../models/BloodInventory');
const DoctorClinicalDecision = require('../models/DoctorClinicalDecision');

const PROTOCOL_RULES = {
  transfusion: {
    hemoglobin_threshold: { min: 7, optimal: 10, unit: 'g/dL' },
    platelet_threshold: { min: 50000, critical: 10000, unit: 'per μL' },
    emergency_levels: ['critical', 'urgent', 'moderate'],
    rare_blood_conservation: ['AB-', 'B-', 'O-', 'A-']
  },
  inventory: {
    critical_threshold: 10,
    low_threshold: 25,
    optimal_threshold: 50
  }
};

exports.getActiveAdvisories = async (req, res) => {
  try {
    const doctorId = req.user.userId;
    
    const inventoryData = await BloodInventory.aggregate([
      {
        $group: {
          _id: '$bloodGroup',
          totalUnits: { $sum: '$unitsAvailable' },
          expiringUnits: {
            $sum: {
              $cond: [
                { $lte: ['$expiryDate', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)] },
                '$unitsAvailable',
                0
              ]
            }
          }
        }
      }
    ]);

    const advisories = inventoryData.map(inv => {
      const bloodGroup = inv._id;
      const totalUnits = inv.totalUnits;
      const isRare = PROTOCOL_RULES.transfusion.rare_blood_conservation.includes(bloodGroup);
      
      let severity = 'low';
      let protocolRule = 'Standard inventory monitoring';
      let recommendation = 'Current stock levels are adequate';
      
      if (totalUnits < PROTOCOL_RULES.inventory.critical_threshold) {
        severity = 'critical';
        protocolRule = 'Critical stock protocol - Immediate action required';
        recommendation = isRare 
          ? `Critical shortage of rare blood type ${bloodGroup}. Initiate emergency donor mobilization and inter-hospital transfer protocols.`
          : `Critical shortage of ${bloodGroup}. Contact nearby blood banks for emergency transfer.`;
      } else if (totalUnits < PROTOCOL_RULES.inventory.low_threshold) {
        severity = 'medium';
        protocolRule = 'Low stock alert - Preventive measures recommended';
        recommendation = isRare
          ? `Low stock for rare type ${bloodGroup}. Schedule donor outreach and reserve for emergency cases only.`
          : `Replenish ${bloodGroup} stock through scheduled donation drives.`;
      } else if (isRare && totalUnits < PROTOCOL_RULES.inventory.optimal_threshold) {
        severity = 'medium';
        protocolRule = 'Rare blood conservation protocol';
        recommendation = `Maintain optimal levels for rare type ${bloodGroup}. Continue regular donor follow-ups.`;
      }

      return {
        advisoryId: `ADV-${bloodGroup}-${Date.now()}`,
        bloodGroup,
        currentStock: totalUnits,
        expiringUnits: inv.expiringUnits,
        severity,
        protocolRule,
        recommendation,
        isRare,
        triggeredAt: new Date()
      };
    });

    res.json({
      success: true,
      data: {
        advisories: advisories.filter(a => a.severity !== 'low'),
        summary: {
          critical: advisories.filter(a => a.severity === 'critical').length,
          medium: advisories.filter(a => a.severity === 'medium').length,
          total: advisories.filter(a => a.severity !== 'low').length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching advisories:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch advisories' });
  }
};

exports.getTransfusionAdvisory = async (req, res) => {
  try {
    const { patientCondition, emergencyLevel, requiredComponent } = req.body;
    
    const inventoryData = await BloodInventory.aggregate([
      {
        $group: {
          _id: '$bloodGroup',
          totalUnits: { $sum: '$unitsAvailable' },
          componentBreakdown: {
            $push: {
              component: '$componentType',
              units: '$unitsAvailable'
            }
          }
        }
      }
    ]);

    const componentSuitability = inventoryData.map(inv => {
      const score = Math.min(100, (inv.totalUnits / PROTOCOL_RULES.inventory.optimal_threshold) * 100);
      return {
        bloodGroup: inv._id,
        suitabilityScore: score,
        availableUnits: inv.totalUnits,
        components: inv.componentBreakdown
      };
    });

    const protocolReference = {
      rule: `Transfusion protocol for ${emergencyLevel} emergency`,
      guidelines: [
        'Verify patient blood type and cross-match results',
        'Assess hemodynamic stability and transfusion urgency',
        'Consider alternatives if blood group unavailable',
        'Monitor for transfusion reactions during procedure'
      ],
      emergencyOverride: emergencyLevel === 'critical'
    };

    res.json({
      success: true,
      data: {
        componentSuitability,
        inventoryRisk: componentSuitability.filter(c => c.suitabilityScore < 50).length > 0 ? 'high' : 'low',
        protocolReference,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error generating transfusion advisory:', error);
    res.status(500).json({ success: false, message: 'Failed to generate advisory' });
  }
};

exports.recordAdvisoryAction = async (req, res) => {
  try {
    const doctorId = req.user.userId;
    const { advisoryId, action, justification, bloodGroup, component } = req.body;

    const decision = new DoctorClinicalDecision({
      doctorId,
      actionType: action,
      caseType: 'clinical_advisory',
      caseId: advisoryId,
      justification: justification || 'Action taken based on clinical advisory',
      metadata: {
        bloodGroup,
        component,
        advisoryId
      }
    });

    await decision.save();

    res.json({
      success: true,
      data: decision,
      message: 'Advisory action recorded successfully'
    });
  } catch (error) {
    console.error('Error recording advisory action:', error);
    res.status(500).json({ success: false, message: 'Failed to record action' });
  }
};

exports.getAdvisoryTrends = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const trends = await DoctorClinicalDecision.aggregate([
      {
        $match: {
          caseType: 'clinical_advisory',
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            actionType: '$actionType'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);

    const formattedTrends = trends.reduce((acc, item) => {
      const date = item._id.date;
      if (!acc[date]) {
        acc[date] = { date, accepted: 0, overridden: 0, deferred: 0 };
      }
      acc[date][item._id.actionType] = item.count;
      return acc;
    }, {});

    res.json({
      success: true,
      data: Object.values(formattedTrends)
    });
  } catch (error) {
    console.error('Error fetching advisory trends:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch trends' });
  }
};
