const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const HospitalProfile = require('../models/HospitalProfile');
const PublicUser = require('../models/PublicUser');

// Get all pending users (hospital_admin, doctor) for approval
exports.getPendingUsers = async (req, res) => {
  try {
    console.log('🔍 Fetching pending users...');
    
    // First, let's check all users to see what's in the database
    // Only hide password if SHOW_PASSWORDS env var is not set to 'true'
    const selectFields = process.env.SHOW_PASSWORDS === 'true' 
      ? 'email role isVerified password createdAt' 
      : 'email role isVerified createdAt';
    
    const allUsers = await User.find({}).select(selectFields);
    console.log('📊 Total users in database:', allUsers.length);
    console.log('📋 All users:', JSON.stringify(allUsers, null, 2));
    
    const pendingUsers = await User.find({
      isVerified: false,
      role: { $in: ['hospital_admin', 'doctor'] }
    })
    .select('email role createdAt')
    .sort({ createdAt: -1 });

    // Also fetch pending PUBLIC_USER registrations
    const pendingPublicUsers = await PublicUser.find({
      verificationStatus: 'pending'
    })
    .select('fullName email phone bloodGroup location createdAt encryptedIdentityProofPath')
    .sort({ createdAt: -1 });

    console.log(`📊 Found ${pendingUsers.length} pending users (hospital/doctor)`);
    console.log(`📊 Found ${pendingPublicUsers.length} pending PUBLIC_USER registrations`);
    
    if (pendingUsers.length > 0) {
      console.log('📝 Pending users details:', pendingUsers.map(u => ({ 
        email: u.email, 
        role: u.role,
        isVerified: u.isVerified,
        id: u._id 
      })));
    } else {
      console.log('⚠️ No pending users found! All users might be verified already.');
    }

    // Get additional profile information for regular users
    const usersWithProfiles = await Promise.all(
      pendingUsers.map(async (user) => {
        let profileData = null;
        let userName = 'Unknown User';

        if (user.role === 'doctor') {
          const profile = await DoctorProfile.findOne({ userId: user._id })
            .select('fullName hospitalName');
          profileData = profile;
          userName = profile?.fullName || 'Unknown Doctor';
          console.log(`👨‍⚕️ Doctor profile for ${user.email}:`, profile ? 'Found' : 'Not found');
        } else if (user.role === 'hospital_admin') {
          const profile = await HospitalProfile.findOne({ userId: user._id })
            .select('adminName hospitalName licenseNumber adminEmail');
          profileData = profile;
          userName = profile?.adminName || 'Unknown Admin';
          console.log(`🏥 Hospital profile for ${user.email}:`, profile ? 'Found' : 'Not found');
        }

        return {
          _id: user._id,
          name: userName,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          profile: profileData,
          userType: 'regular'
        };
      })
    );

    // Format PUBLIC_USER data
    const publicUsersFormatted = pendingPublicUsers.map(user => ({
      _id: user._id,
      name: user.fullName,
      email: user.email,
      role: 'PUBLIC_USER',
      createdAt: user.createdAt,
      profile: {
        phone: user.phone,
        bloodGroup: user.bloodGroup,
        city: user.location?.city,
        state: user.location?.state,
        hasIdentityProof: !!user.encryptedIdentityProofPath
      },
      userType: 'public'
    }));

    // Combine both arrays
    const allPendingUsers = [...usersWithProfiles, ...publicUsersFormatted];
    console.log(`✅ Returning ${allPendingUsers.length} total pending users (${usersWithProfiles.length} regular + ${publicUsersFormatted.length} public)`);

    res.status(200).json({
      success: true,
      count: allPendingUsers.length,
      data: allPendingUsers
    });
  } catch (error) {
    console.error('❌ Error fetching pending users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending users',
      error: error.message
    });
  }
};

// Get all verified users
exports.getAllUsers = async (req, res) => {
  try {
    const { role, verified } = req.query;
    
    const filter = {};
    if (role && role !== 'all') {
      filter.role = role;
    }
    if (verified !== undefined) {
      filter.isVerified = verified === 'true';
    }

    const users = await User.find(filter)
      .select('name email role isVerified createdAt')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
};

// Approve a user
exports.approveUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`\n🔍 Attempting to approve user: ${userId}`);

    // Find the user first to log details
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      console.log(`❌ User not found: ${userId}`);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    console.log(`📝 User before approval:`, {
      email: existingUser.email,
      role: existingUser.role,
      isVerified: existingUser.isVerified
    });

    // Update user
    const user = await User.findByIdAndUpdate(
      userId,
      { isVerified: true },
      { new: true }
    ).select('-password');

    console.log(`✅ User isVerified updated to: ${user.isVerified}`);

    // CRITICAL: Also update the profile's verificationStatus
    if (user.role === 'doctor') {
      const updatedProfile = await DoctorProfile.findOneAndUpdate(
        { userId: user._id },
        { 
          verificationStatus: 'approved',
          verifiedAt: new Date(),
          verifiedBy: req.userId
        },
        { new: true }
      );
      console.log(`✅ Doctor profile verification status updated to: ${updatedProfile?.verificationStatus}`);
    } else if (user.role === 'hospital_admin') {
      await HospitalProfile.findOneAndUpdate(
        { userId: user._id },
        { 
          verificationStatus: 'approved',
          verifiedAt: new Date(),
          verifiedBy: req.userId
        }
      );
      console.log(`✅ Hospital profile verification status updated to 'approved'`);
    }

    console.log(`✅ User approved successfully:`, {
      email: user.email,
      role: user.role,
      isVerified: user.isVerified
    });

    res.status(200).json({
      success: true,
      message: `${user.role === 'hospital_admin' ? 'Hospital Admin' : 'Doctor'} approved successfully`,
      data: user
    });
  } catch (error) {
    console.error('❌ Error approving user:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving user',
      error: error.message
    });
  }
};

// Reject a user
exports.rejectUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    
    console.log(`\n🔍 Attempting to reject user: ${userId}`);
    console.log(`📝 Rejection reason: ${reason || 'No reason provided'}`);

    const user = await User.findById(userId);

    if (!user) {
      console.log(`❌ User not found: ${userId}`);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    console.log(`📝 User to be rejected:`, {
      email: user.email,
      role: user.role,
      isVerified: user.isVerified
    });

    // Delete associated profiles
    if (user.role === 'doctor') {
      const deleted = await DoctorProfile.findOneAndDelete({ userId: user._id });
      console.log(`🗑️ Doctor profile deleted:`, deleted ? 'Yes' : 'Not found');
    } else if (user.role === 'hospital_admin') {
      const deleted = await HospitalProfile.findOneAndDelete({ userId: user._id });
      console.log(`🗑️ Hospital profile deleted:`, deleted ? 'Yes' : 'Not found');
    }

    // Delete the user
    await User.findByIdAndDelete(userId);
    console.log(`✅ User rejected and removed: ${user.email}`);

    res.status(200).json({
      success: true,
      message: `User rejected and removed${reason ? `: ${reason}` : ''}`,
    });
  } catch (error) {
    console.error('❌ Error rejecting user:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting user',
      error: error.message
    });
  }
};

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers,
      pendingApprovals,
      totalHospitals,
      totalDoctors,
      totalDonors,
      verifiedHospitals,
      verifiedDoctors
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: 'super_admin' } }),
      User.countDocuments({ isVerified: false, role: { $in: ['hospital_admin', 'doctor'] } }),
      User.countDocuments({ role: 'hospital_admin' }),
      User.countDocuments({ role: 'doctor' }),
      User.countDocuments({ role: 'donor' }),
      User.countDocuments({ role: 'hospital_admin', isVerified: true }),
      User.countDocuments({ role: 'doctor', isVerified: true })
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        pendingApprovals,
        totalHospitals,
        totalDoctors,
        totalDonors,
        verifiedHospitals,
        verifiedDoctors
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics',
      error: error.message
    });
  }
};

// Approve a PUBLIC_USER
exports.approvePublicUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`\n🔍 Attempting to approve PUBLIC_USER: ${userId}`);

    const publicUser = await PublicUser.findById(userId);
    if (!publicUser) {
      console.log(`❌ PUBLIC_USER not found: ${userId}`);
      return res.status(404).json({
        success: false,
        message: 'Public user not found'
      });
    }
    
    console.log(`📝 PUBLIC_USER before approval:`, {
      email: publicUser.email,
      fullName: publicUser.fullName,
      verificationStatus: publicUser.verificationStatus
    });

    // Update verification status
    publicUser.verificationStatus = 'verified';
    publicUser.verifiedAt = new Date();
    publicUser.verifiedBy = req.user._id;
    await publicUser.save();

    console.log(`✅ PUBLIC_USER approved successfully:`, {
      email: publicUser.email,
      verificationStatus: publicUser.verificationStatus
    });

    res.status(200).json({
      success: true,
      message: `${publicUser.fullName} approved successfully`,
      data: {
        userId: publicUser._id,
        email: publicUser.email,
        verificationStatus: publicUser.verificationStatus
      }
    });
  } catch (error) {
    console.error('❌ Error approving PUBLIC_USER:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving public user',
      error: error.message
    });
  }
};

// Reject a PUBLIC_USER
exports.rejectPublicUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    
    console.log(`\n🔍 Attempting to reject PUBLIC_USER: ${userId}`);
    console.log(`📝 Rejection reason: ${reason || 'No reason provided'}`);

    const publicUser = await PublicUser.findById(userId);

    if (!publicUser) {
      console.log(`❌ PUBLIC_USER not found: ${userId}`);
      return res.status(404).json({
        success: false,
        message: 'Public user not found'
      });
    }
    
    console.log(`📝 PUBLIC_USER to be rejected:`, {
      email: publicUser.email,
      fullName: publicUser.fullName,
      verificationStatus: publicUser.verificationStatus
    });

    // Update status to rejected with reason
    publicUser.verificationStatus = 'rejected';
    publicUser.rejectionReason = reason || 'Identity verification failed';
    await publicUser.save();

    console.log(`✅ PUBLIC_USER rejected: ${publicUser.email}`);

    res.status(200).json({
      success: true,
      message: `Public user rejected${reason ? `: ${reason}` : ''}`,
      data: {
        userId: publicUser._id,
        email: publicUser.email,
        verificationStatus: publicUser.verificationStatus
      }
    });
  } catch (error) {
    console.error('❌ Error rejecting PUBLIC_USER:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting public user',
      error: error.message
    });
  }
};

// Get recent activity
exports.getRecentActivity = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // Get recently registered users
    const recentUsers = await User.find({ role: { $ne: 'super_admin' } })
      .select('name email role isVerified createdAt')
      .sort({ createdAt: -1 })
      .limit(limit);

    const activities = recentUsers.map(user => ({
      id: user._id,
      type: 'registration',
      user: user.name,
      email: user.email,
      role: user.role,
      status: user.isVerified ? 'approved' : 'pending',
      timestamp: user.createdAt
    }));

    res.status(200).json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recent activity',
      error: error.message
    });
  }
};
