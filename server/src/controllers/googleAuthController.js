import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import TokenService from '../services/TokenService.js';
import logger from '../utils/logger.js';

function getGoogleClientId() {
  const id = process.env.GOOGLE_CLIENT_ID;
  if (!id) {
    throw new Error('GOOGLE_CLIENT_ID is not configured');
  }
  return id;
}

function formatUserResponse(user) {
  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    profilePhotoUrl: user.profilePhotoUrl || null
  };
}

/**
 * POST /api/auth/google
 * Body: { credential } — Google ID token (JWT) from GIS / @react-oauth/google.
 * Self-selected role is accepted only on onboarding (personal project; harden for production).
 */
export async function postGoogleAuth(req, res) {
  try {
    const credential = req.body.credential || req.body.idToken;
    if (!credential || typeof credential !== 'string') {
      return res.status(400).json({ error: 'Missing Google credential' });
    }

    const audience = getGoogleClientId();
    const client = new OAuth2Client(audience);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience
    });
    const payload = ticket.getPayload();
    if (!payload?.sub) {
      return res.status(401).json({ error: 'Invalid Google token payload' });
    }

    const googleId = payload.sub;
    const email = (payload.email || '').toLowerCase().trim();
    if (!email) {
      return res.status(400).json({ error: 'Google account has no email' });
    }

    const fullName = payload.name || email.split('@')[0];
    const picture = payload.picture || null;

    let user = await User.findOne({ googleId });
    if (!user) {
      const legacy = await User.findOne({
        email,
        $or: [{ googleId: { $exists: false } }, { googleId: null }]
      });
      if (legacy) {
        legacy.googleId = googleId;
        if (picture && !legacy.profilePhotoUrl) {
          legacy.profilePhotoUrl = picture;
        }
        await legacy.save({ validateModifiedOnly: true });
        user = legacy;
      }
    }

    if (user) {
      const accessToken = TokenService.generateAccessToken({
        userId: user._id,
        email: user.email,
        role: user.role
      });
      return res.status(200).json({
        accessToken,
        user: formatUserResponse(user)
      });
    }

    const tempToken = TokenService.generateOnboardingToken({ googleId, email, fullName, picture });

    return res.status(200).json({
      needsOnboarding: true,
      tempToken
    });
  } catch (err) {
    logger.error('Google auth error:', err.message || err);
    return res.status(401).json({ error: 'Invalid Google token' });
  }
}

/**
 * POST /api/auth/onboarding
 * Authorization: Bearer <tempToken from google step>
 * Body: { role: 'admin'|'user', profile: object } — role is user-supplied (acceptable for tiny private deploys only).
 */
export async function postOnboarding(req, res) {
  try {
    const token = TokenService.extractTokenFromHeader(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ error: 'Onboarding token required' });
    }

    let decoded;
    try {
      decoded = TokenService.verifyToken(token);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired onboarding token' });
    }

    if (decoded.type !== 'onboarding' || !decoded.googleId || !decoded.email) {
      return res.status(400).json({ error: 'Invalid onboarding token' });
    }

    const { role, profile } = req.body;
    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    if (!profile || typeof profile !== 'object') {
      return res.status(400).json({ error: 'Profile required' });
    }

    const existingByGoogle = await User.findOne({ googleId: decoded.googleId });
    if (existingByGoogle) {
      const accessToken = TokenService.generateAccessToken({
        userId: existingByGoogle._id,
        email: existingByGoogle.email,
        role: existingByGoogle.role
      });
      return res.status(200).json({
        accessToken,
        user: formatUserResponse(existingByGoogle)
      });
    }

    const dup = await User.findOne({ email: decoded.email });
    if (dup) {
      return res.status(409).json({
        error:
          'An account with this email already exists. Sign in with Google from that account.'
      });
    }

    const user = new User({
      googleId: decoded.googleId,
      email: decoded.email,
      fullName: decoded.fullName || decoded.email.split('@')[0],
      role,
      onboardingProfile: profile,
      profilePhotoUrl: decoded.picture || null
    });

    await user.save();

    const accessToken = TokenService.generateAccessToken({
      userId: user._id,
      email: user.email,
      role: user.role
    });

    return res.status(201).json({
      accessToken,
      user: formatUserResponse(user)
    });
  } catch (err) {
    logger.error('Onboarding error:', err);
    return res.status(500).json({ error: 'Could not complete onboarding' });
  }
}

