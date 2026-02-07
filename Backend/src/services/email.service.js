const sendDonorCredentialEmail = async (email, hospitalName, otp) => {
  console.log(`
    ========================================
    DONOR CREDENTIAL EMAIL
    ========================================
    To: ${email}
    Hospital: ${hospitalName}
    OTP: ${otp}
    Valid for: 24 hours
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
