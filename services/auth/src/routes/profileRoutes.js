import express from 'express';
import { authenticate } from '../middleware/auth.js';
import profilePhotoUpload, { handleProfilePhotoUploadError } from '../middleware/profilePhotoUpload.js';
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

// Update user profile information
router.put('/profile', updateUserProfile);

// Upload/Update profile photo
router.post(
  '/profile/photo',
  profilePhotoUpload.single('profilePhoto'),
  handleProfilePhotoUploadError,
  uploadUserProfilePhoto
);

// Delete profile photo
router.delete('/profile/photo', deleteUserProfilePhoto);

export default router;
