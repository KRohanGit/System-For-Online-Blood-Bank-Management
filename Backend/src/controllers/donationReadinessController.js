const DonationReadinessLog = require('../models/DonationReadinessLog');

/**
 * Enhanced readiness calculation with comprehensive medical criteria
 */
const calculateReadinessScore = (data) => {
  let score = 100;
  const recommendations = [];
  const deferralReasons = [];
  
  // CRITICAL ELIGIBILITY CRITERIA
  // Age validation (18-65 years)
  if (data.age < 18 || data.age > 65) {
    score = 0;
    deferralReasons.push('Age must be between 18-65 years (permanent)');
    recommendations.push('You must be between 18-65 years old to donate blood');
    return { score, recommendations, deferralReasons };
  }
  
  // Weight validation (minimum 50 kg)
  if (data.weight < 50) {
    score = 0;
    deferralReasons.push('Weight must be at least 50kg (permanent)');
    recommendations.push('Minimum weight requirement is 50kg for blood donation');
    return { score, recommendations, deferralReasons };
  }
  
  // Donation gap validation (90 days minimum)
  if (data.lastDonationDate) {
    const daysSinceLastDonation = Math.floor(
      (new Date() - new Date(data.lastDonationDate)) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceLastDonation < 90) {
      score = 0;
      const waitDays = 90 - daysSinceLastDonation;
      deferralReasons.push(`Must wait ${waitDays} more days since last donation (temporary)`);
      recommendations.push(`Please wait ${waitDays} more days before your next donation`);
      return { score, recommendations, deferralReasons };
    } else if (daysSinceLastDonation < 120) {
      score -= 15;
      recommendations.push('Consider waiting a bit longer for optimal recovery');
    }
  }
  
  // PERMANENT DISQUALIFIERS
  // Bleeding/Clotting disorders
  if (data.bleedingDisorders) {
    score = 0;
    deferralReasons.push('Bleeding or clotting disorders (permanent disqualification)');
    recommendations.push('Individuals with bleeding disorders cannot donate blood');
    return { score, recommendations, deferralReasons };
  }
  
  // Chronic conditions requiring case-by-case evaluation
  if (data.chronicConditions) {
    score -= 40;
    deferralReasons.push('Chronic conditions require medical clearance');
    recommendations.push('Please consult with a healthcare provider about your chronic condition');
    recommendations.push('Medical clearance may be required before donation');
  }
  
  // TEMPORARY DEFERRAL CONDITIONS
  // Recent fever or infection (14 days)
  if (data.recentFever) {
    score -= 50;
    deferralReasons.push('Recent fever/infection - wait 14 days after full recovery');
    recommendations.push('Wait at least 14 days after complete recovery from fever or infection');
  }
  
  // Recent illness or surgery (6 months)
  if (data.illnessHistory) {
    score -= 35;
    deferralReasons.push('Recent illness/surgery may require medical clearance');
    recommendations.push('Recent illness or surgery requires medical evaluation');
  }
  
  // Recent tattoo or piercing (6 months)
  if (data.recentTattoo) {
    score -= 30;
    deferralReasons.push('Wait 6 months after tattoo/piercing');
    recommendations.push('You must wait 6 months after getting a tattoo or piercing');
  }
  
  // Recent vaccination (30 days)
  if (data.recentVaccination) {
    score -= 25;
    deferralReasons.push('Wait 30 days after vaccination');
    recommendations.push('Most vaccinations require a 30-day waiting period');
  }
  
  // Alcohol consumption (24 hours)
  if (data.recentAlcohol) {
    score -= 40;
    deferralReasons.push('No alcohol consumption 24 hours before donation');
    recommendations.push('Avoid alcohol for 24 hours before donating blood');
  }
  
  // Current medication
  if (data.medicationStatus) {
    score -= 25;
    recommendations.push('Consult with donation center about your current medications');
    recommendations.push('Some medications may defer donation temporarily');
  }
  
  // Anemia or low hemoglobin history
  if (data.anemiaHistory) {
    score -= 30;
    recommendations.push('History of anemia requires hemoglobin testing before donation');
  }
  
  // Hemoglobin level validation
  const minHemoglobin = data.gender === 'Female' ? 12.0 : 13.0;
  if (data.hemoglobinLevel) {
    if (data.hemoglobinLevel < minHemoglobin) {
      score -= 50;
      deferralReasons.push(`Hemoglobin below required level (${minHemoglobin} g/dL)`);
      recommendations.push(`Your hemoglobin level is below the required ${minHemoglobin} g/dL`);
      recommendations.push('Increase iron-rich foods in your diet');
    }
  }
  
  // FEMALE-SPECIFIC CONDITIONS
  if (data.gender === 'Female') {
    // Pregnancy
    if (data.isPregnant) {
      score = 0;
      deferralReasons.push('Cannot donate during pregnancy (temporary)');
      recommendations.push('Blood donation is not permitted during pregnancy');
      return { score, recommendations, deferralReasons };
    }
    
    // Breastfeeding
    if (data.isBreastfeeding) {
      score -= 40;
      deferralReasons.push('Breastfeeding mothers should consult healthcare provider');
      recommendations.push('Consult your doctor if breastfeeding before donating');
    }
    
    // Recent childbirth (6 months)
    if (data.recentChildbirth) {
      score -= 50;
      deferralReasons.push('Wait 6 months after childbirth');
      recommendations.push('You must wait at least 6 months after childbirth to donate');
    }
  }
  
  // POSITIVE RECOMMENDATIONS
  if (score >= 80) {
    recommendations.unshift('✅ You are in excellent condition to donate blood!');
    recommendations.push('💧 Drink plenty of water before donation');
    recommendations.push('🥗 Eat iron-rich foods (spinach, red meat, beans)');
    recommendations.push('😴 Get adequate rest the night before');
  } else if (score >= 60) {
    recommendations.unshift('⚠️ You may be eligible with minor considerations');
    recommendations.push('🏥 Contact the blood donation center for confirmation');
  } else if (score > 0) {
    recommendations.unshift('❌ Temporarily deferred - address the concerns below');
  }
  
  return {
    score: Math.max(0, score),
    recommendations,
    deferralReasons
  };
};

/**
 * Determine eligibility status based on comprehensive criteria
 */
const determineEligibilityStatus = (score, data, deferralReasons) => {
  // Check permanent disqualifications
  if (data.age < 18 || data.age > 65 || data.weight < 50 || data.bleedingDisorders) {
    return 'NOT_ELIGIBLE';
  }
  
  if (data.gender === 'Female' && data.isPregnant) {
    return 'NOT_ELIGIBLE';
  }
  
  // Check temporary deferrals
  if (data.lastDonationDate) {
    const daysSinceLastDonation = Math.floor(
      (new Date() - new Date(data.lastDonationDate)) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceLastDonation < 90) {
      return 'TEMPORARILY_DEFERRED';
    }
  }
  
  // Any deferral reason present
  if (deferralReasons.length > 0 && score < 70) {
    return 'TEMPORARILY_DEFERRED';
  }
  
  // Score-based eligibility
  if (score >= 75) return 'ELIGIBLE';
  if (score >= 50) return 'CONDITIONAL';
  return 'TEMPORARILY_DEFERRED';
};

/**
 * Calculate next eligible donation date
 */
const calculateNextEligibleDate = (data) => {
  const today = new Date();
  const dates = [today];
  
  // Last donation date + 90 days
  if (data.lastDonationDate) {
    const lastDonation = new Date(data.lastDonationDate);
    const nextFromLast = new Date(lastDonation);
    nextFromLast.setDate(nextFromLast.getDate() + 90);
    dates.push(nextFromLast);
  }
  
  // Recent fever + 14 days
  if (data.recentFever) {
    const feverDate = new Date(today);
    feverDate.setDate(feverDate.getDate() + 14);
    dates.push(feverDate);
  }
  
  // Recent tattoo + 180 days
  if (data.recentTattoo) {
    const tattooDate = new Date(today);
    tattooDate.setDate(tattooDate.getDate() + 180);
    dates.push(tattooDate);
  }
  
  // Recent vaccination + 30 days
  if (data.recentVaccination) {
    const vaccineDate = new Date(today);
    vaccineDate.setDate(vaccineDate.getDate() + 30);
    dates.push(vaccineDate);
  }
  
  // Recent alcohol + 1 day
  if (data.recentAlcohol) {
    const alcoholDate = new Date(today);
    alcoholDate.setDate(alcoholDate.getDate() + 1);
    dates.push(alcoholDate);
  }
  
  // Recent childbirth + 180 days
  if (data.recentChildbirth) {
    const childbirthDate = new Date(today);
    childbirthDate.setDate(childbirthDate.getDate() + 180);
    dates.push(childbirthDate);
  }
  
  // Return the furthest date
  return new Date(Math.max(...dates));
};

exports.checkDonationReadiness = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      // Existing parameters
      age,
      weight,
      lastDonationDate,
      hemoglobinLevel,
      medicationStatus,
      illnessHistory,
      
      // New basic eligibility
      gender,
      bloodGroup,
      
      // Health & safety checks
      recentFever,
      chronicConditions,
      anemiaHistory,
      bleedingDisorders,
      
      // Lifestyle & risk
      recentAlcohol,
      recentTattoo,
      recentVaccination,
      
      // Female-specific
      isPregnant,
      isBreastfeeding,
      recentChildbirth
    } = req.body;
    
    // Validate required fields
    if (!weight || !age || !gender) {
      return res.status(400).json({
        success: false,
        message: 'Age, weight, and gender are required fields'
      });
    }
    
    // Build readiness data object
    const readinessData = {
      // Basic info
      age: Number(age),
      weight: Number(weight),
      gender,
      bloodGroup: bloodGroup || '',
      lastDonationDate,
      hemoglobinLevel: hemoglobinLevel ? Number(hemoglobinLevel) : null,
      
      // Health status
      medicationStatus: medicationStatus || false,
      illnessHistory: illnessHistory || false,
      recentFever: recentFever || false,
      chronicConditions: chronicConditions || false,
      anemiaHistory: anemiaHistory || false,
      bleedingDisorders: bleedingDisorders || false,
      
      // Lifestyle & risk
      recentAlcohol: recentAlcohol || false,
      recentTattoo: recentTattoo || false,
      recentVaccination: recentVaccination || false,
      
      // Female-specific
      isPregnant: isPregnant || false,
      isBreastfeeding: isBreastfeeding || false,
      recentChildbirth: recentChildbirth || false
    };
    
    // Calculate readiness
    const { score, recommendations, deferralReasons } = calculateReadinessScore(readinessData);
    const eligibilityStatus = determineEligibilityStatus(score, readinessData, deferralReasons);
    const nextEligibleDate = calculateNextEligibleDate(readinessData);
    
    // Save log to database
    const log = await DonationReadinessLog.create({
      userId,
      ...readinessData,
      readinessScore: score,
      recommendation: recommendations.join(' | '),
      deferralReason: deferralReasons.join(' | '),
      eligibilityStatus,
      nextEligibleDate
    });
    
    // Return comprehensive response
    res.json({
      success: true,
      data: {
        readinessScore: score,
        eligibilityStatus,
        nextEligibleDate,
        recommendations,
        deferralReasons: deferralReasons.length > 0 ? deferralReasons : null
      }
    });
  } catch (error) {
    console.error('Error checking donation readiness:', error);
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
