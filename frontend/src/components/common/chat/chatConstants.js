export const WELCOME_MESSAGE = "Hi 👋 I'm the LifeLink Help Assistant. How can I help you today?";

export const DISCLAIMER = "This chat does not provide medical advice or emergency services.";

export const CHAT_OPTIONS = [
  { id: 'emergency', label: 'Need blood urgently' },
  { id: 'hospitals', label: 'Find nearby hospitals' },
  { id: 'donate', label: 'How to donate blood' },
  { id: 'camps', label: 'Blood camps near me' },
  { id: 'platform', label: 'How this platform works' }
];

export const RESPONSES = {
  emergency: {
    text: "For urgent blood needs:\n\n1. Login to access real-time blood availability\n2. View nearby hospitals with stock levels\n3. Contact hospitals directly for emergencies\n\n⚠️ For life-threatening emergencies, call 108 immediately.",
    ctas: ['login', 'hospitals', 'guidelines']
  },
  hospitals: {
    text: "Nearby Hospitals:\n\n🏥 City General Hospital - 2.3 km\n🏥 Apollo Medical Center - 3.5 km\n🏥 Rainbow Children's Hospital - 4.1 km\n\nLogin to view complete details and real-time blood availability.",
    ctas: ['login', 'hospitals']
  },
  donate: {
    text: "Blood Donation Eligibility:\n\n✓ Age: 18-65 years\n✓ Weight: Above 50 kg\n✓ Healthy and well-rested\n✓ No recent illness or medication\n\nLogin to schedule a donation appointment at nearby blood camps.",
    ctas: ['login', 'camps']
  },
  camps: {
    text: "Upcoming Blood Donation Camps:\n\n📍 Community Blood Drive - Madhurawada\n   Date: In 7 days | 09:00 AM - 05:00 PM\n\n📍 Corporate Blood Donation - Tech Park\n   Date: In 14 days | 10:00 AM - 04:00 PM\n\nLogin to register and see all camps.",
    ctas: ['login', 'camps']
  },
  platform: {
    text: "LifeLink Blood Bank connects:\n\n🩸 Blood donors with those in need\n🏥 Hospitals with real-time inventory\n🎯 Emergency coordination services\n📍 Nearby blood donation camps\n\nJoin our community to save lives.",
    ctas: ['login', 'hospitals']
  }
};

export const CTA_BUTTONS = {
  login: { label: 'Login', link: '/login', type: 'primary' },
  hospitals: { label: 'View Hospitals', link: '/hospitals', type: 'secondary' },
  guidelines: { label: 'Emergency Guidelines', link: '/emergency', type: 'secondary' },
  camps: { label: 'View Camps', link: '/camps', type: 'secondary' }
};
