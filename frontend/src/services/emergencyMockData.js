/**
 * Emergency Blood Mobilization - Mock Data Service
 * 
 * Purpose: Provides realistic dummy data for emergency blood events
 * This can be easily replaced with real API calls later
 */

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return (R * c).toFixed(1);
};

/**
 * Mock Emergency Events Database
 */
const mockEmergencyEvents = [
  {
    eventId: 'EMG001',
    hospitalName: 'Apollo Hospitals',
    hospitalLocation: {
      latitude: 17.4435,
      longitude: 78.3772
    },
    bloodGroupRequired: 'O-',
    unitsRequired: 8,
    urgencyLevel: 'CRITICAL',
    timeWindow: '2 hours',
    description: 'Multiple accident victims require immediate O- blood. Critical situation.',
    createdAt: new Date(Date.now() - 30 * 60000), // 30 minutes ago
    status: 'ACTIVE',
    estimatedEndTime: new Date(Date.now() + 90 * 60000), // 1.5 hours from now
  },
  {
    eventId: 'EMG002',
    hospitalName: 'KIMS Hospital',
    hospitalLocation: {
      latitude: 17.4239,
      longitude: 78.4738
    },
    bloodGroupRequired: 'A+',
    unitsRequired: 5,
    urgencyLevel: 'HIGH',
    timeWindow: '4 hours',
    description: 'Emergency surgery scheduled. Need A+ donors urgently.',
    createdAt: new Date(Date.now() - 60 * 60000), // 1 hour ago
    status: 'ACTIVE',
    estimatedEndTime: new Date(Date.now() + 180 * 60000), // 3 hours from now
  },
  {
    eventId: 'EMG003',
    hospitalName: 'Care Hospitals',
    hospitalLocation: {
      latitude: 17.3850,
      longitude: 78.4867
    },
    bloodGroupRequired: 'B+',
    unitsRequired: 12,
    urgencyLevel: 'CRITICAL',
    timeWindow: '3 hours',
    description: 'Mass casualty incident - urgent need for B+ blood.',
    createdAt: new Date(Date.now() - 45 * 60000), // 45 minutes ago
    status: 'ACTIVE',
    estimatedEndTime: new Date(Date.now() + 135 * 60000), // 2.25 hours from now
  },
  {
    eventId: 'EMG004',
    hospitalName: 'Yashoda Hospitals',
    hospitalLocation: {
      latitude: 17.4126,
      longitude: 78.4410
    },
    bloodGroupRequired: 'AB+',
    unitsRequired: 3,
    urgencyLevel: 'HIGH',
    timeWindow: '6 hours',
    description: 'Thalassemia patient requires immediate transfusion.',
    createdAt: new Date(Date.now() - 20 * 60000), // 20 minutes ago
    status: 'ACTIVE',
    estimatedEndTime: new Date(Date.now() + 340 * 60000), // 5.67 hours from now
  },
];

/**
 * Storage keys for localStorage
 */
const STORAGE_KEYS = {
  USER_RESPONSES: 'emergency_user_responses',
  LAST_DONATION: 'user_last_donation_date',
  USER_BLOOD_GROUP: 'user_blood_group',
};

/**
 * Get all active emergency events
 */
export const getActiveEmergencyEvents = (userLocation) => {
  return new Promise((resolve) => {
    // Simulate API delay
    setTimeout(() => {
      const activeEvents = mockEmergencyEvents
        .filter(event => event.status === 'ACTIVE')
        .map(event => {
          const distance = userLocation ? calculateDistance(
            userLocation.lat,
            userLocation.lng,
            event.hospitalLocation.latitude,
            event.hospitalLocation.longitude
          ) : null;

          const now = new Date();
          const hoursRemaining = (event.estimatedEndTime - now) / (1000 * 60 * 60);

          return {
            ...event,
            distance,
            hoursRemaining: Math.max(0, hoursRemaining),
            isExpired: hoursRemaining <= 0
          };
        })
        .filter(event => !event.isExpired)
        .sort((a, b) => {
          // Sort by urgency first, then by distance
          const urgencyOrder = { CRITICAL: 0, HIGH: 1, MODERATE: 2 };
          if (urgencyOrder[a.urgencyLevel] !== urgencyOrder[b.urgencyLevel]) {
            return urgencyOrder[a.urgencyLevel] - urgencyOrder[b.urgencyLevel];
          }
          return (a.distance || 999) - (b.distance || 999);
        });

      resolve({
        success: true,
        data: activeEvents
      });
    }, 500);
  });
};

/**
 * Get user's emergency responses
 */
export const getUserResponses = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const stored = localStorage.getItem(STORAGE_KEYS.USER_RESPONSES);
      const responses = stored ? JSON.parse(stored) : [];
      
      // Enrich responses with event details
      const enrichedResponses = responses.map(response => {
        const event = mockEmergencyEvents.find(e => e.eventId === response.eventId);
        return {
          ...response,
          eventDetails: event
        };
      });

      resolve({
        success: true,
        data: enrichedResponses
      });
    }, 300);
  });
};

/**
 * Submit user response to emergency event
 */
export const submitEmergencyResponse = (eventId, responseStatus) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const event = mockEmergencyEvents.find(e => e.eventId === eventId);
      
      if (!event) {
        reject({ message: 'Event not found' });
        return;
      }

      // Get existing responses
      const stored = localStorage.getItem(STORAGE_KEYS.USER_RESPONSES);
      const responses = stored ? JSON.parse(stored) : [];

      // Check if already responded
      const alreadyResponded = responses.some(r => r.eventId === eventId);
      if (alreadyResponded) {
        reject({ message: 'You have already responded to this emergency' });
        return;
      }

      // Create new response
      const newResponse = {
        responseId: `RESP${Date.now()}`,
        eventId,
        responseStatus, // RESPONDED | NOT_AVAILABLE | REMIND_LATER
        responseTime: new Date().toISOString(),
        hospitalName: event.hospitalName,
        bloodGroup: event.bloodGroupRequired,
        status: responseStatus === 'RESPONDED' ? 'PENDING_CONFIRMATION' : 'RECORDED'
      };

      // Save response
      responses.push(newResponse);
      localStorage.setItem(STORAGE_KEYS.USER_RESPONSES, JSON.stringify(responses));

      resolve({
        success: true,
        message: responseStatus === 'RESPONDED' 
          ? 'Response sent to hospital successfully!'
          : 'Response recorded',
        data: newResponse
      });
    }, 500);
  });
};

/**
 * Check user eligibility for blood donation
 */
export const checkDonationEligibility = (requiredBloodGroup) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Get user's blood group from localStorage or user profile
      const userBloodGroup = localStorage.getItem(STORAGE_KEYS.USER_BLOOD_GROUP) || 
                           JSON.parse(localStorage.getItem('user') || '{}').bloodGroup;
      
      // Get last donation date
      const lastDonationStr = localStorage.getItem(STORAGE_KEYS.LAST_DONATION);
      const lastDonationDate = lastDonationStr ? new Date(lastDonationStr) : null;
      
      const eligibilityChecks = {
        bloodGroupMatch: !requiredBloodGroup || !userBloodGroup || 
                        userBloodGroup === requiredBloodGroup ||
                        requiredBloodGroup === 'ANY',
        donationGapMet: !lastDonationDate || 
                       (new Date() - lastDonationDate) >= (90 * 24 * 60 * 60 * 1000), // 90 days
        eligible: false,
        reasons: []
      };

      if (!eligibilityChecks.bloodGroupMatch) {
        eligibilityChecks.reasons.push(`Blood group mismatch. Required: ${requiredBloodGroup}`);
      }

      if (!eligibilityChecks.donationGapMet) {
        const daysSinceLastDonation = Math.floor((new Date() - lastDonationDate) / (1000 * 60 * 60 * 24));
        const daysRemaining = 90 - daysSinceLastDonation;
        eligibilityChecks.reasons.push(`Must wait ${daysRemaining} more days since last donation`);
      }

      eligibilityChecks.eligible = eligibilityChecks.bloodGroupMatch && 
                                  eligibilityChecks.donationGapMet;

      if (eligibilityChecks.eligible) {
        eligibilityChecks.reasons.push('You are eligible to donate!');
      }

      resolve({
        success: true,
        data: eligibilityChecks
      });
    }, 200);
  });
};

/**
 * Helper: Set user's last donation date (for testing)
 */
export const setLastDonationDate = (date) => {
  localStorage.setItem(STORAGE_KEYS.LAST_DONATION, date.toISOString());
};

/**
 * Helper: Set user's blood group (for testing)
 */
export const setUserBloodGroup = (bloodGroup) => {
  localStorage.setItem(STORAGE_KEYS.USER_BLOOD_GROUP, bloodGroup);
};

/**
 * Clear all responses (for testing)
 */
export const clearAllResponses = () => {
  localStorage.removeItem(STORAGE_KEYS.USER_RESPONSES);
};

export default {
  getActiveEmergencyEvents,
  getUserResponses,
  submitEmergencyResponse,
  checkDonationEligibility,
  setLastDonationDate,
  setUserBloodGroup,
  clearAllResponses
};
