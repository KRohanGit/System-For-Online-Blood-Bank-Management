const DonationReadinessLog = require('../models/DonationReadinessLog');

const calculateReadinessScore = (data) => {
  let score = 100;
  const recommendations = [];
  
  if (data.age < 18 || data.age > 65) {
    score -= 100;
    recommendations.push('Age must be between 18-65 years');
  }
  
  if (data.weight < 50) {
    score -= 100;
    recommendations.push('Minimum weight requirement is 50kg');
  }
  
  if (data.lastDonationDate) {
    const daysSinceLastDonation = Math.floor(
      (new Date() - new Date(data.lastDonationDate)) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceLastDonation < 90) {
      score -= 100;
      recommendations.push(`You must wait ${90 - daysSinceLastDonation} more days after your last donation`);
    } else if (daysSinceLastDonation < 120) {
      score -= 20;
      recommendations.push('Consider waiting a bit longer for optimal recovery');
    }
  }
  
  if (data.hemoglobinLevel && data.hemoglobinLevel < 12.5) {
    score -= 50;
    recommendations.push('Hemoglobin level is below required threshold (12.5 g/dL)');
  }
  
  if (data.medicationStatus) {
    score -= 30;
    recommendations.push('Consult with donation center about your current medications');
  }
  
  if (data.illnessHistory) {
    score -= 40;
    recommendations.push('Recent illness history may affect eligibility - medical clearance required');
  }
  
  if (data.travelHistory) {
    score -= 20;
    recommendations.push('Recent travel may require additional screening');
  }
  
  if (score >= 80) {
    recommendations.push('You are in excellent condition to donate!');
    recommendations.push('Stay hydrated before donation');
    recommendations.push('Eat iron-rich foods');
  } else if (score >= 50) {
    recommendations.push('You may be eligible with minor considerations');
    recommendations.push('Consult with blood donation center');
  } else {
    recommendations.push('Please address the above concerns before donating');
  }
  
  return {
    score: Math.max(0, score),
    recommendations
  };
};

const determineEligibilityStatus = (score, data) => {
  if (data.age < 18 || data.age > 65 || data.weight < 50) {
    return 'NOT_ELIGIBLE';
  }
  
  if (data.lastDonationDate) {
    const daysSinceLastDonation = Math.floor(
      (new Date() - new Date(data.lastDonationDate)) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceLastDonation < 90) {
      return 'NOT_ELIGIBLE';
    }
  }
  
  if (score >= 70) return 'ELIGIBLE';
  if (score >= 40) return 'CONDITIONAL';
  return 'NOT_ELIGIBLE';
};

const calculateNextEligibleDate = (data) => {
  if (!data.lastDonationDate) return new Date();
  
  const lastDonation = new Date(data.lastDonationDate);
  const nextEligible = new Date(lastDonation);
  nextEligible.setDate(nextEligible.getDate() + 90);
  
  return nextEligible > new Date() ? nextEligible : new Date();
};

exports.checkDonationReadiness = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      lastDonationDate,
      weight,
      age,
      hemoglobinLevel,
      medicationStatus,
      illnessHistory,
      travelHistory
    } = req.body;
    
    if (!weight || !age) {
      return res.status(400).json({
        success: false,
        message: 'Weight and age are required'
      });
    }
    
    const readinessData = {
      lastDonationDate,
      weight,
      age,
      hemoglobinLevel,
      medicationStatus: medicationStatus || false,
      illnessHistory: illnessHistory || false,
      travelHistory: travelHistory || false
    };
    
    const { score, recommendations } = calculateReadinessScore(readinessData);
    const eligibilityStatus = determineEligibilityStatus(score, readinessData);
    const nextEligibleDate = calculateNextEligibleDate(readinessData);
    
    const log = await DonationReadinessLog.create({
      userId,
      ...readinessData,
      readinessScore: score,
      recommendation: recommendations.join(' | '),
      eligibilityStatus,
      nextEligibleDate
    });
    
    res.json({
      success: true,
      data: {
        readinessScore: score,
        eligibilityStatus,
        nextEligibleDate,
        recommendations
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking donation readiness',
      error: error.message
    });
  }
};

exports.getReadinessHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const history = await DonationReadinessLog.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('-__v');
    
    res.json({
      success: true,
      count: history.length,
      data: history
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching readiness history',
      error: error.message
    });
  }
};

module.exports = exports;
