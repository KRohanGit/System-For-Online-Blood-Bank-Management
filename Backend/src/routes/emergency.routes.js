const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { checkRole, checkVerified } = require('../middleware/checkRole');
const {
  sendEmergencyAlert,
  getEmergencyMessages,
  markMessageAsRead
} = require('../controllers/emergency.controller');
const {
  requestEmergencyDonorChain,
  respondEmergencyDonorChain,
  getMyEmergencyChainRequests,
  getMyPendingDonorChainActions,
  getEmergencyChainRequestById
} = require('../controllers/peerEmergencyChainController');

router.post('/send', auth, checkRole(['hospital_admin']), sendEmergencyAlert);
router.get('/messages', auth, checkRole(['donor']), getEmergencyMessages);
router.put('/messages/:messageId/read', auth, checkRole(['donor']), markMessageAsRead);

router.post('/request', auth, checkRole(['PUBLIC_USER']), checkVerified, requestEmergencyDonorChain);
router.post('/request/:requestId/respond', auth, checkRole(['PUBLIC_USER']), checkVerified, respondEmergencyDonorChain);
router.get('/request/my', auth, checkRole(['PUBLIC_USER']), checkVerified, getMyEmergencyChainRequests);
router.get('/request/:requestId', auth, checkRole(['PUBLIC_USER']), checkVerified, getEmergencyChainRequestById);
router.get('/donor-chain/pending', auth, checkRole(['PUBLIC_USER']), checkVerified, getMyPendingDonorChainActions);

module.exports = router;
