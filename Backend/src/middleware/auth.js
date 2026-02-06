const jwt = require('jsonwebtoken');
const User = require('../models/User');
const PublicUser = require('../models/PublicUser');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        message: 'Access denied. No token provided.' 
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let user;
    
    if (decoded.role === 'PUBLIC_USER') {
      user = await PublicUser.findById(decoded.userId).select('-password');
    } else {
      user = await User.findById(decoded.userId).select('-password');
    }

    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token. User not found.' 
      });
    }

    req.user = user;
    req.userId = decoded.userId;
    req.userRole = decoded.role;

    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      console.log('❌ Invalid token format');
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token.' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      console.log('❌ Token has expired');
      return res.status(401).json({ 
        success: false,
        message: 'Token expired. Please login again.' 
      });
    }

    return res.status(500).json({ 
        success: false,
      message: 'Authentication failed.' 
    });
  }
};

module.exports = auth;
module.exports.protect = auth;
