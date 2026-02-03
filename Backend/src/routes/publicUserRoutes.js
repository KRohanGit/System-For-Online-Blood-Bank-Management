const express = require('express');
const router = express.Router();
const authController = require('../controllers/publicUserAuth');
const featuresController = require('../controllers/publicUserFeatures');
const certificateController = require('../controllers/certificateController');
const auth = require('../middleware/auth');
const { checkRole, checkVerified } = require('../middleware/checkRole');
const { uploadFields, handleMulterError } = require('../middleware/upload');

router.post('/register', uploadFields, handleMulterError, authController.register);

router.post('/login', authController.login);

router.get('/nearby-blood-banks', auth, checkRole('PUBLIC_USER'), checkVerified, featuresController.getNearbyBloodBanks);

router.get('/blood-news', auth, checkRole('PUBLIC_USER'), checkVerified, featuresController.getBloodNews);

router.post('/blood-news/:newsId/respond', auth, checkRole('PUBLIC_USER'), checkVerified, featuresController.respondToBloodNews);

router.get('/certificates', auth, checkRole('PUBLIC_USER'), certificateController.getMyCertificates);

router.get('/certificates/:certificateId', auth, checkRole('PUBLIC_USER'), certificateController.getCertificateById);

router.post('/certificates/verify', certificateController.verifyCertificate);

module.exports = router;
