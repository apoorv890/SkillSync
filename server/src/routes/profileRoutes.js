import express from 'express';
import { authenticate } from '../middleware/auth.js';
import profilePhotoUpload, { handleProfilePhotoUploadError } from '../middleware/profilePhotoUpload.js';
import csrfProtection from '../middleware/csrf.js';
import {
  getUserProfile,
  uploadUserProfilePhoto,
  deleteUserProfilePhoto,
  updateUserProfile
} from '../controllers/profileController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get user profile
router.get('/profile', getUserProfile);

// Update user profile information - CSRF protected
router.put('/profile', csrfProtection, updateUserProfile);

// Upload/Update profile photo - CSRF protected
router.post(
  '/profile/photo',
  csrfProtection,
  profilePhotoUpload.single('profilePhoto'),
  handleProfilePhotoUploadError,
  uploadUserProfilePhoto
);

// Delete profile photo - CSRF protected
router.delete('/profile/photo', csrfProtection, deleteUserProfilePhoto);

export default router;
