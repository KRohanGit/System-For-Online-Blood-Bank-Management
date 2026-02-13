const sendDonorCredentialEmail = async (email, hospitalName, otp) => {
  // Development-only logging. Replace with a real email/SMS provider in production.
  if (process.env.NODE_ENV === 'production') {
    console.warn('sendDonorCredentialEmail called in production: implement an email provider');
    return false;
  }

  console.log(`
    ========================================
    DEV DONOR CREDENTIAL EMAIL (DO NOT LOG OTPS IN PROD)
    ========================================
    To: ${email}
    Hospital: ${hospitalName}
    OTP: ${otp}
    Valid for: 30 minutes
    ========================================
  `);
  return true;
};

const sendEmergencyAlertEmail = async (email, hospitalName, message) => {
  console.log(`
    ========================================
    EMERGENCY ALERT
    ========================================
    To: ${email}
    From: ${hospitalName}
    Message: ${message}
    ========================================
  `);
  return true;
};

module.exports = {
  sendDonorCredentialEmail,
  sendEmergencyAlertEmail
};
