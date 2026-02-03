/**
 * BloodCamp Model
 * 
 * Purpose: Store blood donation camp information organized by hospitals or verified public users
 * 
 * Academic Context:
 * - Uses GeoJSON for location-based queries (MongoDB geospatial indexing)
 * - Supports RBAC - organizers can be HOSPITAL_ADMIN or verified PUBLIC_USER
 * - Implements soft delete pattern (isActive flag)
 */

const mongoose = require('mongoose');

const bloodCampSchema = new mongoose.Schema({
  campName: {
    type: String,
    required: [true, 'Camp name is required'],
    trim: true,
    minlength: [5, 'Name must be at least 5 characters'],
    maxlength: [200, 'Name cannot exceed 200 characters']
  },
  
  description: {
    type: String,
    required: [true, 'Camp description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  
  organizer: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'organizer.userModel',
      required: true
    },
    userModel: {
      type: String,
      enum: ['User', 'PublicUser', 'HospitalProfile'],
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['Hospital', 'NGO', 'Institution', 'Individual'],
      required: true
    },
    contactPhone: {
      type: String,
      required: true
    },
    contactEmail: {
      type: String,
      required: true
    },
    affiliatedHospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HospitalProfile'
    }
  },
  
  venue: {
    name: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    pincode: {
      type: String,
      required: true
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        required: true
      }
    },
    type: {
      type: String,
      enum: ['Indoor', 'Outdoor'],
      required: true
    },
    seatingCapacity: {
      type: Number,
      required: true,
      min: 10
    },
    expectedDonors: {
      type: Number,
      required: true,
      min: 5
    }
  },
  
  schedule: {
    date: {
      type: Date,
      required: true
    },
    startTime: {
      type: String,
      required: true
    },
    endTime: {
      type: String,
      required: true
    },
    category: {
      type: String,
      enum: ['Voluntary', 'Corporate', 'College', 'Community'],
      required: true
    }
  },
  
  medicalSupport: {
    coordinatingHospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HospitalProfile',
      required: true
    },
    emergencyContactName: {
      type: String,
      required: true
    },
    emergencyContactPhone: {
      type: String,
      required: true
    },
    medicalSupportAvailable: {
      type: Boolean,
      default: true
    }
  },
  
  facilities: {
    hygieneSanitation: { type: Boolean, default: false },
    powerSupply: { type: Boolean, default: false },
    screeningArea: { type: Boolean, default: false },
    waitingRefreshmentArea: { type: Boolean, default: false }
  },
  
  authorization: {
    permissionStatus: {
      type: String,
      enum: ['Pending', 'Approved', 'Not Required'],
      default: 'Pending'
    },
    issuingAuthority: String,
    referenceLetterPath: String
  },
  
  lifecycle: {
    status: {
      type: String,
      enum: ['Pre-Camp', 'Ongoing', 'Completed', 'Cancelled'],
      default: 'Pre-Camp'
    },
    approvalStatus: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending'
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: Date
  },
  
  stats: {
    registeredAttendees: { type: Number, default: 0 },
    actualDonors: { type: Number, default: 0 },
    bloodUnitsCollected: { type: Number, default: 0 }
  },
  
  feedback: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'PublicUser' },
    userName: String,
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    createdAt: { type: Date, default: Date.now }
  }],
  
  images: [String],
  
  bloodGroupsNeeded: {
    type: [String],
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    default: []
  },

  // Medical Oversight by Doctors
  medicalOversight: {
    assignedDoctors: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    preCampApproval: { type: Boolean, default: false },
    preCampApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    preCampApprovedAt: Date,
    postCampApproval: { type: Boolean, default: false },
    postCampApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    postCampApprovedAt: Date,
    oversightReports: [{
      phase: { type: String, enum: ['pre_camp', 'during_camp', 'post_camp'] },
      doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      doctorName: String,
      reportDate: { type: Date, default: Date.now },
      approvalStatus: { type: String, enum: ['approved', 'conditional', 'rejected'] },
      medicalNotes: String,
      safetyViolations: [String],
      recommendations: [String]
    }]
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

bloodCampSchema.index({ 'venue.location': '2dsphere' });
bloodCampSchema.index({ 'lifecycle.status': 1, 'schedule.date': 1 });

bloodCampSchema.statics.findNearby = function(coordinates, maxDistance = 100000) {
  return this.find({
    'venue.location': {
      $near: {
        $geometry: { type: 'Point', coordinates },
        $maxDistance: maxDistance
      }
    }
  });
};

const BloodCamp = mongoose.model('BloodCamp', bloodCampSchema);

module.exports = BloodCamp;
