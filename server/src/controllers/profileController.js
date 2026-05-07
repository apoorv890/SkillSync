import User from '../models/User.js';

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

    if (fullName) user.fullName = fullName;
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Email is already in use'
        });
      }
      user.email = email;
    }

    await user.save({ validateModifiedOnly: true });

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

