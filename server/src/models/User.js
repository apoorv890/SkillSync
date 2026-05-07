import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  googleId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    index: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email address'
    ]
  },
  password: {
    type: String,
    required: function passwordRequired() {
      return !this.googleId;
    },
    minlength: 8,
    validate: {
      validator: function (v) {
        if (!v) return true;
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(
          v
        );
      },
      message:
        'Password must be at least 8 characters and contain uppercase, lowercase, number, and special character (@$!%*?&)'
    }
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user',
    required: true
  },
  onboardingProfile: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  profilePhotoUrl: {
    type: String,
    default: null
  },
  profilePhotoKey: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

UserSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

UserSchema.methods.comparePassword = async function comparePassword(
  candidatePassword
) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', UserSchema);

export default User;

