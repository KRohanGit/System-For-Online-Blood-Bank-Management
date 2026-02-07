const express = require('express');
const router = express.Router();
const {
  loginWithOTP,
  changePassword,
  loginWithPassword
} = require('../controllers/donorAuth.controller');
const auth = require('../middleware/auth');

router.post('/login/otp', loginWithOTP);
router.post('/login/password', loginWithPassword);
router.post('/change-password', auth, changePassword);

module.exports = router;
