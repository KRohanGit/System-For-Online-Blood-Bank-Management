const multer = require('multer');
const path = require('path');
const fs = require('fs');

const ensureUploadDirs = () => {
  const dirs = [
    path.join(__dirname, '../../uploads/certificates'),
    path.join(__dirname, '../../uploads/licenses'),
    path.join(__dirname, '../../uploads/identity-proofs'),
    path.join(__dirname, '../../uploads/signatures')
  ];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

ensureUploadDirs();

const memoryStorage = multer.memoryStorage();

const diskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = 'uploads/certificates';
    if (file.fieldname === 'license') {
      uploadPath = 'uploads/licenses';
    } else if (file.fieldname === 'identityProof') {
      uploadPath = 'uploads/identity-proofs';
    } else if (file.fieldname === 'signature') {
      uploadPath = 'uploads/signatures';
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const role = req.body.role || 'unknown';
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    cb(null, `${role}_${uniqueSuffix}_${basename}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPG, and PNG files are allowed.'), false);
  }
};

const upload = multer({
  storage: diskStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

const uploadMemory = multer({
  storage: memoryStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

const uploadFields = uploadMemory.fields([
  { name: 'identityProof', maxCount: 1 },
  { name: 'signature', maxCount: 1 }
]);

const uploadSingle = uploadMemory.single('file');

const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds 5MB limit.'
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next();
};

module.exports = { 
  upload, 
  uploadMemory,
  uploadFields,
  uploadSingle,
  handleMulterError 
};
