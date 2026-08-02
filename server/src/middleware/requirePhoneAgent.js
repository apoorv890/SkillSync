import { ApiResponse, HTTP_STATUS } from '../utils/http.js';
import { timingSafeEqual } from '../utils/timingSafe.js';

export function requirePhoneAgent(req, res, next) {
  const expected = (process.env.VOICEHIRE_SERVICE_TOKEN || '').trim();
  if (!expected) {
    return ApiResponse.error(
      res,
      'VOICEHIRE_SERVICE_TOKEN is not configured',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }

  const auth = req.header('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length).trim() : '';

  if (!token || !timingSafeEqual(token, expected)) {
    return ApiResponse.error(res, 'Unauthorized', HTTP_STATUS.UNAUTHORIZED);
  }

  next();
}

