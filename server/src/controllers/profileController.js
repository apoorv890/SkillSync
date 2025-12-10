import User from '../models/User.js';
import { uploadProfilePhoto, deleteProfilePhoto } from '../services/s3ProfileService.js';
import path from 'path';
import { logNested, logCompact } from '../utils/loggerHelper.js';

/**
 * Get user profile
 * @route GET /api/users/profile
 */
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        profilePhotoUrl: user.profilePhotoUrl,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Get Profile Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve user profile'
    });
  }
};

/**
 * Upload or update profile photo
 * @route POST /api/users/profile/photo
 */
export const uploadUserProfilePhoto = async (req, res) => {
  try {
    logNested(req, 'Uploading profile photo', { userId: req.userId });
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded. Please select an image file.'
      });
    }

    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Delete old profile photo if exists
    if (user.profilePhotoKey) {
      try {
        await deleteProfilePhoto(user.profilePhotoKey);
        logNested(req, 'Deleted old photo');
      } catch (error) {
        // Continue with upload even if deletion fails
      }
    }

    // Get file extension
    const fileExtension = path.extname(req.file.originalname).toLowerCase().replace('.', '');
    
    // Upload new photo to S3
    const { url, key } = await uploadProfilePhoto(
      req.file.buffer,
      user._id.toString(),
      user.role,
      fileExtension
    );

    // Update user record
    user.profilePhotoUrl = url;
    user.profilePhotoKey = key;
    await user.save();

    logCompact(req, 'Profile photo uploaded successfully');

    res.json({
      success: true,
      message: 'Profile photo updated successfully',
      data: {
        profilePhotoUrl: url
      }
    });
  } catch (error) {
    console.error(`${req.logPrefix || ''}Error uploading profile photo: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload profile photo. Please try again later.'
    });
  }
};

/**
 * Delete profile photo
 * @route DELETE /api/users/profile/photo
 */
export const deleteUserProfilePhoto = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if user has a profile photo
    if (!user.profilePhotoKey) {
      return res.status(400).json({
        success: false,
        error: 'No profile photo to remove'
      });
    }

    // Delete from S3
    try {
      await deleteProfilePhoto(user.profilePhotoKey);
      console.log(`Deleted profile photo: ${user.profilePhotoKey}`);
    } catch (error) {
      console.error('Error deleting from S3:', error);
      // Continue with database update even if S3 deletion fails
    }

    // Update user record
    const oldKey = user.profilePhotoKey;
    user.profilePhotoUrl = null;
    user.profilePhotoKey = null;
    await user.save();

    // Log the deletion
    console.log(`Profile photo removed for user ${user._id}: ${oldKey}`);

    res.json({
      success: true,
      message: 'Profile photo removed successfully'
    });
  } catch (error) {
    console.error('Delete Profile Photo Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete profile photo. Please try again later.'
    });
  }
};

/**
 * Update user profile information
 * @route PUT /api/users/profile
 */
export const updateUserProfile = async (req, res) => {
  try {
    const { fullName, email } = req.body;
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update fields if provided
    if (fullName) user.fullName = fullName;
    if (email && email !== user.email) {
      // Check if email is already taken
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Email is already in use'
        });
      }
      user.email = email;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        profilePhotoUrl: user.profilePhotoUrl
      }
    });
  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
};
