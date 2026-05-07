export const JOB_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  CLOSED: 'closed'
};

export const APPLICATION_STATUS = {
  APPLIED: 'applied',
  WITHDRAWN: 'withdrawn',
  UNDER_REVIEW: 'Under Review',
  SHORTLISTED: 'Shortlisted',
  REJECTED: 'Rejected',
  HIRED: 'Hired'
};

export const FILE_UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024,
  ALLOWED_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  ALLOWED_EXTENSIONS: ['.pdf', '.doc', '.docx']
};

export const S3_CONFIG = {
  RESUME_FOLDER: 'resumes',
  PRESIGNED_URL_EXPIRY: 3600
};

