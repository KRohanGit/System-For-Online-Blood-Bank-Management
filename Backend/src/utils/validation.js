const isValidEmail = (email) => {
  const emailRegex = /^\S+@\S+\.\S+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  if (!password || password.length < 8) {
    return {
      valid: false,
      message: 'Password must be at least 8 characters long'
    };
  }
  return {
    valid: true,
    message: 'Password is valid'
  };
};

const isValidRole = (role) => {
  const validRoles = ['doctor', 'admin', 'donor', 'public_user'];
  return validRoles.includes(role?.toLowerCase());
};

const isValidPhoneNumber = (phone) => {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone);
};

const isValidBloodGroup = (bloodGroup) => {
  const validGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  return validGroups.includes(bloodGroup);
};

const isValidCoordinates = (coordinates) => {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    return false;
  }
  const [longitude, latitude] = coordinates;
  return longitude >= -180 && longitude <= 180 && latitude >= -90 && latitude <= 90;
};

const validatePublicUserRegistration = (data) => {
  const errors = [];

  if (!data.fullName || data.fullName.trim().length < 3) {
    errors.push('Full name must be at least 3 characters');
  }

  if (!isValidEmail(data.email)) {
    errors.push('Invalid email format');
  }

  if (!isValidPhoneNumber(data.phone)) {
    errors.push('Invalid phone number. Must be 10 digits starting with 6-9');
  }

  const passwordCheck = validatePassword(data.password);
  if (!passwordCheck.valid) {
    errors.push(passwordCheck.message);
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

const validateBloodNews = (data) => {
  const errors = [];

  if (!data.title || data.title.trim().length < 5) {
    errors.push('Title must be at least 5 characters');
  }

  if (!data.description || data.description.trim().length < 10) {
    errors.push('Description must be at least 10 characters');
  }

  if (!isValidBloodGroup(data.bloodGroup) && data.bloodGroup !== 'ALL') {
    errors.push('Invalid blood group');
  }

  if (!data.location || !data.location.coordinates) {
    errors.push('Location coordinates required');
  }

  if (data.location && !isValidCoordinates(data.location.coordinates)) {
    errors.push('Invalid coordinates format');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

module.exports = {
  isValidEmail,
  validatePassword,
  isValidRole,
  isValidPhoneNumber,
  isValidBloodGroup,
  isValidCoordinates,
  validatePublicUserRegistration,
  validateBloodNews
};
