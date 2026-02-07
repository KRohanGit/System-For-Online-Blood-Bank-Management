const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');
const {
  sendEmergencyAlert,
  getEmergencyMessages,
  markMessageAsRead
} = require('../controllers/emergency.controller');

router.post('/send', auth, checkRole(['hospital_admin']), sendEmergencyAlert);
router.get('/messages', auth, checkRole(['donor']), getEmergencyMessages);
router.put('/messages/:messageId/read', auth, checkRole(['donor']), markMessageAsRead);

module.exports = router;
