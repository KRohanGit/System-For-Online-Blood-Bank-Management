const nodemailer = require('nodemailer');

// Create reusable transporter.
// Priority order:
// 1) SMTP_URL connection string
// 2) Explicit SMTP host/port credentials
// 3) Gmail App Password credentials
// 4) Ethereal test account fallback
let transporter = null;

const getTransporter = async () => {
  if (transporter) return transporter;

  const smtpUrl = process.env.SMTP_URL;
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpSecure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';
  const smtpUser = process.env.EMAIL_USER;
  const smtpPass = process.env.EMAIL_PASS;

  if (smtpUrl) {
    transporter = nodemailer.createTransport(smtpUrl);
    console.log('Email service configured with SMTP_URL');
  } else if (smtpHost && smtpUser && smtpPass) {
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
    console.log(`Email service configured with SMTP host: ${smtpHost}`);
  } else if (smtpUser && smtpPass) {
    transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
    console.log(`Email service configured with Gmail: ${smtpUser}`);
  } else {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log(`Email service using Ethereal test account: ${testAccount.user}`);
    console.log(`View sent emails at: https://ethereal.email/login`);
    console.log(`Ethereal credentials - User: ${testAccount.user}, Pass: ${testAccount.pass}`);
  }

  return transporter;
};

const resolveFromAddress = () => {
  const fromAddress = process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER || 'noreply@lifelink.com';
  const fromName = process.env.EMAIL_FROM_NAME || 'LifeLink Blood Bank';
  return { fromAddress, fromName };
};

const sendDonorCredentialEmail = async (email, dataOrHospitalName, otpParam) => {
  // Support both: (email, {donorName, email, otp, hospitalName}) AND (email, hospitalName, otp)
  let hospitalName, otp, donorName;
  if (typeof dataOrHospitalName === 'object' && dataOrHospitalName !== null) {
    hospitalName = dataOrHospitalName.hospitalName || 'LifeLink Hospital';
    otp = dataOrHospitalName.otp || otpParam;
    donorName = dataOrHospitalName.donorName || '';
  } else {
    hospitalName = dataOrHospitalName || 'LifeLink Hospital';
    otp = otpParam;
    donorName = '';
  }
  try {
    const transport = await getTransporter();
    const { fromAddress, fromName } = resolveFromAddress();

    const info = await transport.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: email,
      subject: `Your Donor Credential - ${hospitalName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #e53e3e, #c53030); padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; text-align: center;">🩸 LifeLink</h1>
            <p style="color: #fed7d7; text-align: center; margin: 5px 0 0;">Blood Bank Management System</p>
          </div>
          <div style="background: #fff; padding: 30px; border: 1px solid #e2e8f0; border-radius: 0 0 10px 10px;">
            <h2 style="color: #2d3748;">Your Donor Login Credentials</h2>
            <p style="color: #4a5568;">${donorName ? `Hi <strong>${donorName}</strong>, your` : 'Your'} account has been created by <strong>${hospitalName}</strong>.</p>
            <div style="background: #f7fafc; border-left: 4px solid #e53e3e; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
              <p style="margin: 0; color: #2d3748;"><strong>Your OTP / Temporary Password:</strong></p>
              <p style="font-size: 32px; font-weight: bold; color: #e53e3e; letter-spacing: 8px; margin: 10px 0;">${otp}</p>
              <p style="margin: 0; color: #718096; font-size: 14px;">Valid for 15 minutes</p>
            </div>
            <p style="color: #4a5568;">Use this temporary credential to log in to your donor account and:</p>
            <ul style="color: #4a5568;">
              <li>View your donation history</li>
              <li>Download donation certificates</li>
              <li>Track your health metrics</li>
              <li>Set a permanent password</li>
            </ul>
            <p style="color: #c53030; font-weight: bold; margin-top: 16px;">Please change your password within 24 hours of first login.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
            <p style="color: #a0aec0; font-size: 12px; text-align: center;">
              This is an automated message from LifeLink. Do not share your OTP with anyone.
            </p>
          </div>
        </div>
      `,
    });

    console.log(`Donor credential email sent to ${email}: ${info.messageId}`);
    // For Ethereal, log the preview URL
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`Preview email at: ${previewUrl}`);
    }
    return true;
  } catch (error) {
    console.error('Failed to send donor credential email:', error.message);
    return false;
  }
};

const sendEmergencyAlertEmail = async (email, hospitalName, message) => {
  try {
    const transport = await getTransporter();
    const { fromAddress, fromName } = resolveFromAddress();

    const info = await transport.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: email,
      subject: `🚨 EMERGENCY ALERT - ${hospitalName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #e53e3e, #9b2c2c); padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; text-align: center;">🚨 EMERGENCY BLOOD ALERT</h1>
          </div>
          <div style="background: #fff; padding: 30px; border: 2px solid #e53e3e; border-radius: 0 0 10px 10px;">
            <h2 style="color: #c53030;">Urgent Blood Requirement</h2>
            <p style="color: #2d3748;"><strong>Hospital:</strong> ${hospitalName}</p>
            <div style="background: #fff5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p style="color: #2d3748; margin: 0;">${message}</p>
            </div>
            <p style="color: #4a5568;">Please respond immediately if you can help.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
            <p style="color: #a0aec0; font-size: 12px; text-align: center;">
              LifeLink Emergency Blood Bank Management System
            </p>
          </div>
        </div>
      `,
    });

    console.log(`Emergency alert email sent to ${email}: ${info.messageId}`);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`Preview email at: ${previewUrl}`);
    }
    return true;
  } catch (error) {
    console.error('Failed to send emergency alert email:', error.message);
    return false;
  }
};

const sendOTPEmail = async (email, otp, purpose = 'verification') => {
  try {
    const transport = await getTransporter();
    const { fromAddress, fromName } = resolveFromAddress();

    const purposeText = {
      verification: 'Account Verification',
      login: 'Login Verification',
      'password-reset': 'Password Reset',
      'two-factor': 'Two-Factor Authentication',
    };

    const info = await transport.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: email,
      subject: `LifeLink - ${purposeText[purpose] || 'OTP Verification'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #e53e3e, #c53030); padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; text-align: center;">🩸 LifeLink</h1>
          </div>
          <div style="background: #fff; padding: 30px; border: 1px solid #e2e8f0; border-radius: 0 0 10px 10px;">
            <h2 style="color: #2d3748;">${purposeText[purpose] || 'OTP Verification'}</h2>
            <p style="color: #4a5568;">Your one-time password is:</p>
            <div style="text-align: center; margin: 25px 0;">
              <span style="background: #f7fafc; padding: 15px 30px; font-size: 36px; font-weight: bold; color: #e53e3e; letter-spacing: 10px; border-radius: 10px; border: 2px dashed #e53e3e;">${otp}</span>
            </div>
            <p style="color: #718096; text-align: center;">This OTP is valid for <strong>30 minutes</strong></p>
            <p style="color: #a0aec0; font-size: 12px; text-align: center; margin-top: 20px;">
              If you didn't request this, please ignore this email.
            </p>
          </div>
        </div>
      `,
    });

    console.log(`OTP email sent to ${email}: ${info.messageId}`);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`Preview email at: ${previewUrl}`);
    }
    return true;
  } catch (error) {
    console.error('Failed to send OTP email:', error.message);
    return false;
  }
};

const getEmailDeliveryMode = () => {
  const smtpUrl = process.env.SMTP_URL;
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.EMAIL_USER;
  const smtpPass = process.env.EMAIL_PASS;

  if (smtpUrl) return 'smtp_url';
  if (smtpHost && smtpUser && smtpPass) return 'smtp_host';
  if (smtpUser && smtpPass) return 'provider';
  return 'ethereal';
};

module.exports = {
  sendDonorCredentialEmail,
  sendEmergencyAlertEmail,
  sendOTPEmail,
  getTransporter,
  getEmailDeliveryMode
};
