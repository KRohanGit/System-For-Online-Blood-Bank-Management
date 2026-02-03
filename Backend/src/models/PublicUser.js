const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const publicUserSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    minlength: 3,
    maxlength: 100
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    match: [/^[6-9]\d{9}$/, 'Invalid Indian phone number']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 8,
    select: false
  },
  role: {
    type: String,
    default: 'PUBLIC_USER',
    enum: ['PUBLIC_USER'],
    immutable: true
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  rejectionReason: {
    type: String,
    default: null
  },
  encryptedIdentityProofPath: {
    type: String,
    default: null
  },
  encryptedSignaturePath: {
    type: String,
    default: null
  },
  // Enhanced encryption metadata for identity proof
  identityProofEncryption: {
    encryptedData: { type: String, default: null }, // Base64
    encryptedAESKey: { type: String, default: null }, // RSA-encrypted
    iv: { type: String, default: null }, // Hex
    metadata: {
      algorithm: { type: String, default: 'aes-256-cbc' },
      encryptedAt: { type: Date, default: null }
    }
  },
  // Enhanced encryption metadata for signature
  signatureEncryption: {
    encryptedData: { type: String, default: null }, // Base64
    encryptedAESKey: { type: String, default: null }, // RSA-encrypted
    iv: { type: String, default: null }, // Hex
    metadata: {
      algorithm: { type: String, default: 'aes-256-cbc' },
      encryptedAt: { type: Date, default: null }
    }
  },
  identityProofType: {
    type: String,
    enum: ['aadhaar', 'pan', 'driving_license', 'voter_id', 'passport', 'other'],
    default: null
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    },
    city: {
      type: String,
      default: null
    },
    state: {
      type: String,
      default: null
    }
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', null],
    default: null
  },
  // Community Reputation & Impact Score fields
  reputationScore: {
    type: Number,
    default: 0,
    min: 0
  },
  activities: {
    campsOrganized: { type: Number, default: 0 },
    donationsCompleted: { type: Number, default: 0 },
    hospitalCollaborations: { type: Number, default: 0 },
    communityPosts: { type: Number, default: 0 },
    helpfulComments: { type: Number, default: 0 },
    campsAttended: { type: Number, default: 0 },
    certificatesEarned: { type: Number, default: 0 }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

publicUserSchema.index({ location: '2dsphere' });
publicUserSchema.index({ email: 1 });
publicUserSchema.index({ phone: 1 });
publicUserSchema.index({ verificationStatus: 1 });

publicUserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

publicUserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

publicUserSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.encryptedIdentityProofPath;
  delete obj.encryptedSignaturePath;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('PublicUser', publicUserSchema);
