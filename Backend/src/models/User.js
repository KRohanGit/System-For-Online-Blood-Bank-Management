const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long']
  },
  role: {
    type: String,
    required: [true, 'Role is required'],
    enum: ['super_admin', 'hospital_admin', 'doctor', 'donor'],
    lowercase: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash password if it has been modified or is new
  if (!this.isModified('password')) {
    return next();
  }

  try {
    // Generate salt with 12 rounds (secure) or we can use even 10 rounds for faster perforname but here we have usd 2 rounds fr more secure hashing
    const salt = await bcrypt.genSalt(12);
    // Hash password
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password for login
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Error comparing passwords');
  }
};

// Remove password from JSON responses (TOGGLE-ABLE)
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  
  // Only hide password if SHOW_PASSWORDS is not set to 'true'
  // For college review/debugging, set SHOW_PASSWORDS=true in .env
  if (process.env.SHOW_PASSWORDS !== 'true') {
    delete user.password;
  }
  
  return user;
};

module.exports = mongoose.model('User', userSchema);
