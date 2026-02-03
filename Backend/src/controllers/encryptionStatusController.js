/**
 * Super Admin Controller - Encryption Status
 * 
 * Provides encryption system status for admin dashboard
 */

const { getEncryptionStatus } = require('../utils/fileEncryptionService');

/**
 * Get encryption system status
 * @route GET /api/admin/encryption-status
 * @access Private (Super Admin only)
 */
const getSystemEncryptionStatus = async (req, res) => {
  try {
    // Check if user is super admin
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super admin only.'
      });
    }

    // Get encryption status
    const status = getEncryptionStatus();

    res.status(200).json({
      success: true,
      message: 'Encryption status retrieved successfully',
      data: status
    });

  } catch (error) {
    console.error('Get encryption status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve encryption status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Test encryption system
 * @route POST /api/admin/test-encryption
 * @access Private (Super Admin only)
 */
const testEncryptionSystem = async (req, res) => {
  try {
    // Check if user is super admin
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super admin only.'
      });
    }

    const { verifyEncryptionSystem } = require('../utils/fileEncryptionService');
    
    // Run encryption test
    const testResult = await verifyEncryptionSystem();

    res.status(200).json({
      success: true,
      message: testResult ? 'Encryption test passed' : 'Encryption test failed',
      data: {
        testPassed: testResult,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Test encryption error:', error);
    res.status(500).json({
      success: false,
      message: 'Encryption test failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getSystemEncryptionStatus,
  testEncryptionSystem
};
