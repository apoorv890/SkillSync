import { timingSafeEqual } from './timingSafe.js';

/**
 * Guards phone-agent endpoints that trigger real-world side effects (placing calls)
 * with the same shared bearer token VoiceHire's server uses for its own
 * /api/phone-agent/* routes (see server/src/middleware/requirePhoneAgent.js).
 */
export function requireVoicehireAuth(req, res, next) {
  const expected = (process.env.VOICEHIRE_SERVICE_TOKEN || '').trim();
  if (!expected) {
    return res.status(500).json({ error: 'VOICEHIRE_SERVICE_TOKEN is not configured' });
  }

  const auth = req.header('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length).trim() : '';

  if (!token || !timingSafeEqual(token, expected)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}
