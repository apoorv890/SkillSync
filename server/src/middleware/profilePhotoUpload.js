import multer from 'multer';
import path from 'path';

// Allowed image types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// File filter to validate image types
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (ALLOWED_MIME_TYPES.includes(file.mimetype) && ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, JPG, PNG, and WebP images are allowed.'), false);
  }
};

// Configure multer to use memory storage
const profilePhotoUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  }
});

// Error handling middleware for multer
export const handleProfilePhotoUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        success: false, 
        error: 'Image size must be less than 5MB' 
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ 
        success: false, 
        error: 'Only one file can be uploaded at a time' 
      });
    }
    return res.status(400).json({ 
      success: false, 
      error: `Upload error: ${err.message}` 
    });
  } else if (err) {
    return res.status(400).json({ 
      success: false, 
      error: err.message 
    });
  }
  next();
};

export default profilePhotoUpload;
