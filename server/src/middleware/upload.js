import multer from 'multer';
import path from 'path';
import { FILE_UPLOAD } from '../utils/constants.js';

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (
    FILE_UPLOAD.ALLOWED_TYPES.includes(file.mimetype) &&
    FILE_UPLOAD.ALLOWED_EXTENSIONS.includes(ext)
  ) {
    cb(null, true);
  } else {
    cb(
      new Error('Invalid file type. Only PDF, DOC, and DOCX files are allowed.'),
      false
    );
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: fileFilter,
  limits: {
    fileSize: FILE_UPLOAD.MAX_SIZE
  }
});

const candidateResumePdfFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

/** Admin bulk candidate resumes: PDF only, up to 10MB each (matches prior candidate route limits). */
export const candidateBulkResumeUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: candidateResumePdfFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File size exceeds the allowed upload limit'
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

export default upload;

