const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const fs = require('fs');
const { s3Client, bucketName, isS3Configured } = require('../utils/s3');

// Ensure uploads directory exists (fallback for local storage)
const uploadsDir = path.join(__dirname, '../uploads');
const imagesDir = path.join(uploadsDir, 'images');
const pdfsDir = path.join(uploadsDir, 'pdfs');

[uploadsDir, imagesDir, pdfsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

// Storage configuration - S3 or local based on configuration
const storage = isS3Configured() ? multerS3({
  s3: s3Client,
  bucket: bucketName,
  acl: 'public-read',
  key: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const key = `images/teeth-${uniqueSuffix}${extension}`;
    cb(null, key);
  },
  contentType: multerS3.AUTO_CONTENT_TYPE
}) : multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, imagesDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `teeth-${uniqueSuffix}${extension}`);
  }
});

// Multer configuration
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 5 // Allow up to 5 files
  },
  fileFilter: fileFilter
});

// Multiple file upload configuration
const uploadMultiple = upload.array('images', 5); // Allow up to 5 images

module.exports = { upload, uploadMultiple, uploadsDir, imagesDir, pdfsDir, isS3Configured };
