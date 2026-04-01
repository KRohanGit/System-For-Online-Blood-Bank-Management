const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');
const { uploadSingle, handleMulterError } = require('../middleware/upload');
const secureDocumentController = require('../controllers/secureDocumentController');

router.use(auth);
router.use(checkRole(['super_admin']));

router.post('/upload', uploadSingle, handleMulterError, secureDocumentController.uploadDocument);
router.get('/', secureDocumentController.getDocuments);
router.post('/verify', secureDocumentController.verifyDocument);

module.exports = router;
