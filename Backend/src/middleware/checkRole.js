const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    try {
      console.log(`🔒 Role check: Required roles: ${JSON.stringify(allowedRoles)}`);
      
      if (!req.user || !req.userRole) {
        console.log('❌ Role check failed: No user or userRole in request');
        return res.status(401).json({ 
          success: false,
          message: 'Authentication required.' 
        });
      }

      console.log(`👤 User: ${req.user.email}, Role: ${req.userRole}`);

      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

      if (!roles.includes(req.userRole)) {
        console.log(`❌ Access denied: User role '${req.userRole}' not in allowed roles [${roles.join(', ')}]`);
        return res.status(403).json({ 
          success: false,
          message: 'Access denied. Insufficient permissions.' 
        });
      }

      console.log(`✅ Role check passed for ${req.userRole}`);
      next();
    } catch (error) {
      console.error('❌ Role check error:', error.message);
      return res.status(500).json({ 
        success: false,
        message: 'Authorization failed.' 
      });
    }
  };
};

const checkVerified = (req, res, next) => {
  try {
    if (req.userRole === 'PUBLIC_USER') {
      if (!req.user.verificationStatus || req.user.verificationStatus !== 'verified') {
        console.log(`❌ Verification check failed: User ${req.user.email} is ${req.user.verificationStatus}`);
        return res.status(403).json({
          success: false,
          message: 'Account verification pending. Please wait for admin approval.',
          verificationStatus: req.user.verificationStatus
        });
      }
    }
    console.log(`✅ Verification check passed for ${req.userRole}`);
    next();
  } catch (error) {
    console.error('❌ Verification check error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Verification check failed.'
    });
  }
};

module.exports = { checkRole, checkVerified };
