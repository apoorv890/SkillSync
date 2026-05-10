/**
 * Load repo-root `.env` before any code reads `process.env` (Gemini tools run in twilio.mediaStream import chain).
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
