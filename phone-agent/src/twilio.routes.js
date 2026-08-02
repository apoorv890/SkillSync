import express from 'express';
import Twilio from 'twilio';
import { createLogger } from './logger.js';
import { requireSkillsyncAuth } from './requireSkillsyncAuth.js';
import {
  getPublicBaseUrlFromRequest,
  resolvePublicBaseUrl,
  toWebSocketBaseUrl,
} from './publicBaseUrl.js';

const log = createLogger('TwilioRoutes');

/**
 * Twilio signs the exact public URL of this webhook (scheme + host + path + query).
 * Must match ngrok / proxies — do not use only env-based URL when query params differ.
 * @param {import('express').Request} req
 */
function getWebhookUrlForSignature(req) {
  const publicBaseUrl = getPublicBaseUrlFromRequest(req);
  const pathAndQuery = req.originalUrl || '';
  return `${publicBaseUrl}${pathAndQuery}`;
}

/**
 * @param {{
 *   publicBaseUrl?: string,
 *   ngrokApiUrl?: string,
 *   twilioAccountSid: string,
 *   twilioAuthToken: string,
 *   twilioPhoneNumber: string,
 *   outboundTo?: string,
 * }} config
 */
export function createTwilioRouter(config) {
  const router = express.Router();

  /** Lazily construct Twilio REST client so invalid env does not crash server boot. */
  let twilioClient = null;
  const getTwilio = () => {
    if (!twilioClient) {
      twilioClient = Twilio(config.twilioAccountSid, config.twilioAuthToken);
    }
    return twilioClient;
  };

  router.use(express.json());

  router.post('/call', requireSkillsyncAuth, async (req, res) => {
    try {
      const to =
        typeof req.body?.to === 'string' && req.body.to.trim()
          ? req.body.to.trim()
          : config.outboundTo;
      const applicationId =
        typeof req.body?.applicationId === 'string' && req.body.applicationId.trim()
          ? req.body.applicationId.trim()
          : null;

      if (!to) {
        return res.status(400).json({
          error:
            'Missing destination phone number. Set OUTBOUND_TO or POST JSON { "to": "+1..." }',
        });
      }

      const publicBaseUrl = await resolvePublicBaseUrl(config);
      const twilioVoiceUrl = `${publicBaseUrl}/twilio/voice`;
      const call = await getTwilio().calls.create({
        from: config.twilioPhoneNumber,
        to,
        url: applicationId
          ? `${twilioVoiceUrl}?applicationId=${encodeURIComponent(applicationId)}`
          : twilioVoiceUrl,
      });

      log.log(`Call SID: ${call.sid}`);
      return res.json({ sid: call.sid });
    } catch (err) {
      log.error('makeCall failed', err);
      return res.status(500).json({ error: err.message ?? 'call failed' });
    }
  });

  router.post('/voice', (req, res) => {
    try {
      const signature = req.header('X-Twilio-Signature') || '';
      const url = getWebhookUrlForSignature(req);

      const isValid = Twilio.validateRequest(
        config.twilioAuthToken,
        signature,
        url,
        req.body || {}
      );

      if (!isValid) {
        log.warn('Invalid Twilio signature for /voice');
        return res.status(401).send('Unauthorized');
      }
    } catch (err) {
      log.error('Twilio signature validation error', err);
      return res.status(401).send('Unauthorized');
    }

    const applicationId =
      typeof req.query?.applicationId === 'string' && req.query.applicationId.trim()
        ? req.query.applicationId.trim()
        : null;

    const publicBaseUrl = getPublicBaseUrlFromRequest(req);
    const wssStreamUrl = `${toWebSocketBaseUrl(publicBaseUrl)}/twilio/stream`;
    const streamUrl = applicationId
      ? `${wssStreamUrl}?applicationId=${encodeURIComponent(applicationId)}`
      : wssStreamUrl;

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${escapeXml(streamUrl)}"/>
  </Connect>
</Response>`;
    res.type('text/xml');
    res.send(twiml);
  });

  return router;
}

/**
 * @param {string} s
 */
function escapeXml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

