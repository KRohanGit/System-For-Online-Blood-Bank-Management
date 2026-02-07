const DonationCertificate = require('../models/DonationCertificate');
const crypto = require('crypto');

const generateCertificateNumber = () => {
  return `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};

const generateVerificationHash = (data) => {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
};

const generateDonationCertificate = async (donationData) => {
  const certificateNumber = generateCertificateNumber();
  const verificationHash = generateVerificationHash({
    donorId: donationData.donorId,
    hospitalId: donationData.hospitalId,
    donationDate: donationData.donationDate,
    certificateNumber
  });

  const certificate = new DonationCertificate({
    userId: donationData.donorId,
    hospitalId: donationData.hospitalId,
    certificateNumber,
    donorName: donationData.donorName,
    bloodGroup: donationData.bloodGroup,
    donationDate: donationData.donationDate,
    units: donationData.units || 1,
    verificationHash,
    isVerified: true
  });

  await certificate.save();
  return certificate;
};

module.exports = {
  generateDonationCertificate
};
