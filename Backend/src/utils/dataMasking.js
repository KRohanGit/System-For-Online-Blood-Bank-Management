const maskLicenseNumber = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }
  const clean = value.trim();
  if (clean.length <= 4) {
    return '****';
  }
  return `${'*'.repeat(Math.max(clean.length - 4, 4))}${clean.slice(-4)}`;
};

const maskPersonalId = () => 'hidden';

const maskExtractedFields = (fields = {}) => ({
  ...fields,
  licenseNumber: maskLicenseNumber(fields.licenseNumber),
  personalId: fields.personalId ? maskPersonalId() : null
});

module.exports = {
  maskLicenseNumber,
  maskPersonalId,
  maskExtractedFields
};
