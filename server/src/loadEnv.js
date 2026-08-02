import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// monolith layout: repo/server/src -> repo/.env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

if (!process.env.SERVICE_NAME) {
  process.env.SERVICE_NAME = 'VoiceHire-server';
}

