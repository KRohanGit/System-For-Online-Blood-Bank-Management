/**
 * Community Reputation & Impact Score Calculator
 * Scoring system for public users, donors, and organizers
 */

// Point values for different activities
const SCORE_VALUES = {
  campOrganized: 50,
  donationCompleted: 30,
  hospitalCollaboration: 25,
  communityPostCreated: 10,
  helpfulComment: 5,
  attendedCamp: 15,
  certificateEarned: 20
};

// Badge thresholds
const BADGE_LEVELS = [
  { threshold: 0, level: 'Newcomer', icon: '🌱', color: '#94a3b8' },
  { threshold: 50, level: 'Helper', icon: '🤝', color: '#60a5fa' },
  { threshold: 150, level: 'Contributor', icon: '⭐', color: '#34d399' },
  { threshold: 300, level: 'Advocate', icon: '🏆', color: '#fbbf24' },
  { threshold: 500, level: 'Champion', icon: '👑', color: '#f59e0b' },
  { threshold: 1000, level: 'Hero', icon: '💎', color: '#dc2626' }
];

/**
 * Calculate total impact score from activities
 */
export const calculateImpactScore = (activities) => {
  const {
    campsOrganized = 0,
    donationsCompleted = 0,
    hospitalCollaborations = 0,
    communityPosts = 0,
    helpfulComments = 0,
    campsAttended = 0,
    certificatesEarned = 0
  } = activities;

  const score = 
    (campsOrganized * SCORE_VALUES.campOrganized) +
    (donationsCompleted * SCORE_VALUES.donationCompleted) +
    (hospitalCollaborations * SCORE_VALUES.hospitalCollaboration) +
    (communityPosts * SCORE_VALUES.communityPostCreated) +
    (helpfulComments * SCORE_VALUES.helpfulComment) +
    (campsAttended * SCORE_VALUES.attendedCamp) +
    (certificatesEarned * SCORE_VALUES.certificateEarned);

  return Math.round(score);
};

/**
 * Get badge level based on score
 */
export const getBadgeLevel = (score) => {
  for (let i = BADGE_LEVELS.length - 1; i >= 0; i--) {
    if (score >= BADGE_LEVELS[i].threshold) {
      return BADGE_LEVELS[i];
    }
  }
  return BADGE_LEVELS[0];
};

/**
 * Get next badge level and progress
 */
export const getNextBadge = (score) => {
  const currentBadge = getBadgeLevel(score);
  const currentIndex = BADGE_LEVELS.findIndex(b => b.level === currentBadge.level);
  
  if (currentIndex === BADGE_LEVELS.length - 1) {
    return {
      nextBadge: null,
      progress: 100,
      remaining: 0
    };
  }

  const nextBadge = BADGE_LEVELS[currentIndex + 1];
  const progress = ((score - currentBadge.threshold) / (nextBadge.threshold - currentBadge.threshold)) * 100;
  const remaining = nextBadge.threshold - score;

  return {
    nextBadge,
    progress: Math.min(100, progress),
    remaining: Math.max(0, remaining)
  };
};

/**
 * Calculate people helped (estimate based on activities)
 */
export const calculatePeopleHelped = (activities) => {
  const {
    campsOrganized = 0,
    donationsCompleted = 0,
    hospitalCollaborations = 0
  } = activities;

  // Estimates: 1 camp helps ~50 people, 1 donation helps ~3 people, 1 collaboration helps ~20 people
  return (campsOrganized * 50) + (donationsCompleted * 3) + (hospitalCollaborations * 20);
};

/**
 * Get activity breakdown for display
 */
export const getActivityBreakdown = (activities) => {
  return [
    {
      label: 'Camps Organized',
      value: activities.campsOrganized || 0,
      points: (activities.campsOrganized || 0) * SCORE_VALUES.campOrganized,
      icon: '🎪'
    },
    {
      label: 'Donations Completed',
      value: activities.donationsCompleted || 0,
      points: (activities.donationsCompleted || 0) * SCORE_VALUES.donationCompleted,
      icon: '🩸'
    },
    {
      label: 'Hospital Collaborations',
      value: activities.hospitalCollaborations || 0,
      points: (activities.hospitalCollaborations || 0) * SCORE_VALUES.hospitalCollaboration,
      icon: '🏥'
    },
    {
      label: 'Community Posts',
      value: activities.communityPosts || 0,
      points: (activities.communityPosts || 0) * SCORE_VALUES.communityPostCreated,
      icon: '💬'
    },
    {
      label: 'Camps Attended',
      value: activities.campsAttended || 0,
      points: (activities.campsAttended || 0) * SCORE_VALUES.attendedCamp,
      icon: '📅'
    },
    {
      label: 'Certificates Earned',
      value: activities.certificatesEarned || 0,
      points: (activities.certificatesEarned || 0) * SCORE_VALUES.certificateEarned,
      icon: '📜'
    }
  ];
};

export default {
  calculateImpactScore,
  getBadgeLevel,
  getNextBadge,
  calculatePeopleHelped,
  getActivityBreakdown,
  BADGE_LEVELS,
  SCORE_VALUES
};
