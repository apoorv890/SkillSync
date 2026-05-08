import express from 'express';
import Twilio from 'twilio';
import { createLogger } from './logger.js';

const log = createLogger('TwilioRoutes');

/**
 * @param {{
 *   twilioVoiceUrl: string,
 *   wssStreamUrl: string,
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

  router.post('/call', async (req, res) => {
    try {
      const to =
        typeof req.body?.to === 'string' && req.body.to.trim()
          ? req.body.to.trim()
          : config.outboundTo;

      if (!to) {
        return res.status(400).json({
          error:
            'Missing destination phone number. Set OUTBOUND_TO or POST JSON { "to": "+1..." }',
        });
      }

      const call = await getTwilio().calls.create({
        from: config.twilioPhoneNumber,
        to,
        url: config.twilioVoiceUrl,
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
      const url = config.twilioVoiceUrl;

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

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${escapeXml(config.wssStreamUrl)}"/>
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

