const HospitalProfile = require('../models/HospitalProfile');

/**
 * Middleware to attach hospital profile ID to request for hospital admins
 * Must be used after auth middleware
 */
const attachHospitalProfile = async (req, res, next) => {
  try {
    // Check both req.userRole and req.user.role for compatibility
    const userRoleRaw = req.userRole || (req.user && req.user.role);
    const userRole = String(userRoleRaw || '').toLowerCase();
    
    console.log(`🔍 Attach hospital profile - User: ${req.user?.email}, Role: ${userRoleRaw}`);
    
    // Only apply to hospital admins (case-insensitive)
    if (userRole !== 'hospital_admin') {
      console.log(`⚠️ Skipping hospital profile attachment - not hospital_admin (role: ${userRoleRaw})`);
      return next();
    }

    // Find hospital profile for this user
    let hospitalProfile = await HospitalProfile.findOne({ 
      userId: req.user._id 
    }).select('_id verificationStatus');

    if (!hospitalProfile) {
      console.log(`❌ No hospital profile found for user ${req.user.email}`);
      
      // Auto-create in development mode
      if (process.env.NODE_ENV !== 'production') {
        console.log(`🔨 Auto-creating hospital profile for ${req.user.email} (dev mode)`);
        
        const adminName = req.user.email.split('@')[0].replace(/[0-9]/g, '').toUpperCase() || 'Admin';
        
        hospitalProfile = await HospitalProfile.create({
          userId: req.user._id,
          hospitalName: `${adminName} Hospital`,
          officialEmail: req.user.email,
          adminEmail: req.user.email,  
          licenseNumber: `AUTO-${Date.now()}`,
          licenseFilePath: `/dev/auto-generated-${Date.now()}.pdf`,
          adminName: adminName,
          verificationStatus: 'approved',
          registrationDate: new Date()
        });
        
        console.log(`✅ Auto-created hospital profile: ${hospitalProfile._id}`);
      } else {
        return res.status(404).json({
          success: false,
          message: 'Hospital profile not found. Please complete your registration.'
        });
      }
    }

    console.log(`🔍 Found hospital profile: ${hospitalProfile._id}, Status: ${hospitalProfile.verificationStatus}`);

    // Check if hospital is verified
    if (hospitalProfile.verificationStatus !== 'approved') {
      console.log(`❌ Hospital not verified: ${hospitalProfile.verificationStatus}`);
      return res.status(403).json({
        success: false,
        message: `Your hospital account is ${hospitalProfile.verificationStatus}. Please wait for admin approval.`,
        verificationStatus: hospitalProfile.verificationStatus
      });
    }

    // Attach hospital profile ID to user and request
    req.user.hospitalProfileId = hospitalProfile._id;
    req.hospitalProfileId = hospitalProfile._id;
    
    console.log(`✅ Hospital profile attached: ${hospitalProfile._id} for user ${req.user.email}`);
    next();
  } catch (error) {
    console.error('❌ Attach hospital profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify hospital profile.'
    });
  }
};

module.exports = attachHospitalProfile;
