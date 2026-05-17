import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// monorepo layout: repo/phone-agent/src -> repo/.env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const REQUIRED = [
  'GEMINI_API_KEY',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER',
];

/**
 * @returns {{
 *   port: number,
 *   publicBaseUrl?: string,
 *   ngrokApiUrl?: string,
 *   outboundTo: string | undefined,
 *   geminiApiKey: string,
 *   twilioAccountSid: string,
 *   twilioAuthToken: string,
 *   twilioPhoneNumber: string,
 * }}
 */
export function loadConfig() {
  const missing = REQUIRED.filter((k) => !process.env[k]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  let publicBaseUrl = process.env.PUBLIC_BASE_URL?.trim().replace(/\/$/, '') || undefined;
  if (publicBaseUrl && !/^https?:\/\//i.test(publicBaseUrl)) {
    publicBaseUrl = `https://${publicBaseUrl}`;
  }

  const ngrokApiUrl = process.env.NGROK_API_URL?.trim().replace(/\/$/, '') || undefined;
  if (!publicBaseUrl && !ngrokApiUrl) {
    throw new Error(
      'Missing PUBLIC_BASE_URL or NGROK_API_URL. Twilio needs a public HTTPS URL for the phone-agent.',
    );
  }

  // NOTE: Vite client uses 3000 in dev; keep phone-agent on a different port by default.
  const port = parseInt(process.env.PORT ?? '3010', 10);
  if (Number.isNaN(port)) {
    throw new Error('PORT must be a number');
  }

  const outboundTo = process.env.OUTBOUND_TO?.trim() || undefined;

  return {
    port,
    publicBaseUrl,
    ngrokApiUrl,
    outboundTo,
    geminiApiKey: process.env.GEMINI_API_KEY,
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
    twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER,
  };
}
