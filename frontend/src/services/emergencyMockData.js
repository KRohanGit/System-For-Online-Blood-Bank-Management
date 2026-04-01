import axiosInstance from './axiosInstance';

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
  return axiosInstance
    .get('/emergency/messages')
    .then((res) => {
      const raw = Array.isArray(res?.data?.data) ? res.data.data : [];
      const mapped = raw.map((event) => {
        const hospitalLat = event?.hospitalLocation?.latitude;
        const hospitalLng = event?.hospitalLocation?.longitude;
        const distance = (userLocation && Number.isFinite(hospitalLat) && Number.isFinite(hospitalLng))
          ? calculateDistance(userLocation.lat, userLocation.lng, hospitalLat, hospitalLng)
          : null;

        return {
          eventId: event.eventId || event._id,
          hospitalName: event.hospitalName || event.hospital || 'Unknown Hospital',
          hospitalLocation: event.hospitalLocation || null,
          bloodGroupRequired: event.bloodGroupRequired || event.bloodGroup || 'ANY',
          unitsRequired: event.unitsRequired || event.units || 0,
          urgencyLevel: event.urgencyLevel || event.priority || 'HIGH',
          timeWindow: event.timeWindow || event.requiredWithin || 'N/A',
          description: event.description || '',
          createdAt: event.createdAt || new Date().toISOString(),
          estimatedEndTime: event.estimatedEndTime || null,
          status: event.status || 'ACTIVE',
          distance
        };
      });

      return {
        success: true,
        data: mapped
      };
    })
    .catch(() => ({ success: true, data: [] }));
};

/**
 * Get user's emergency responses
 */
export const getUserResponses = () => {
  return new Promise((resolve) => {
    const stored = localStorage.getItem(STORAGE_KEYS.USER_RESPONSES);
    const responses = stored ? JSON.parse(stored) : [];
    resolve({
      success: true,
      data: responses
    });
  });
};

/**
 * Submit user response to emergency event
 */
export const submitEmergencyResponse = (eventId, responseStatus) => {
  return axiosInstance
    .post(`/emergency/request/${eventId}/respond`, { responseStatus })
    .then((res) => {
      const payload = {
        responseId: res?.data?.data?.responseId || `RESP${Date.now()}`,
        eventId,
        responseStatus,
        responseTime: new Date().toISOString(),
        status: responseStatus === 'RESPONDED' ? 'PENDING_CONFIRMATION' : 'RECORDED'
      };

      const stored = localStorage.getItem(STORAGE_KEYS.USER_RESPONSES);
      const responses = stored ? JSON.parse(stored) : [];
      const already = responses.some((r) => r.eventId === eventId);
      if (!already) {
        responses.push(payload);
        localStorage.setItem(STORAGE_KEYS.USER_RESPONSES, JSON.stringify(responses));
      }

      return {
        success: true,
        message: res?.data?.message || (responseStatus === 'RESPONDED' ? 'Response sent to hospital successfully!' : 'Response recorded'),
        data: payload
      };
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
