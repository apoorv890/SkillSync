import './envBootstrap.js';
import { createLogger } from './logger.js';

const log = createLogger('SkillSync');

export function getSkillsyncConfig() {
  const baseUrl = (
    process.env.SKILLSYNC_API_BASE_URL ||
    'http://127.0.0.1:5000'
  )
    .trim()
    .replace(/\/$/, '');
  const token = (process.env.SKILLSYNC_SERVICE_TOKEN || '').trim();
  return { baseUrl, token };
}

export async function skillsyncFetch(path, init) {
  const { baseUrl, token } = getSkillsyncConfig();
  if (!token) {
    throw new Error(
      'SKILLSYNC_SERVICE_TOKEN missing in phone-agent env (repo root .env). Calendar and SkillSync tools will not work.'
    );
  }
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      body?.message ||
      body?.error ||
      (typeof body === 'string' ? body : '') ||
      `SkillSync HTTP ${res.status}`;
    log.warn(`SkillSync API error ${res.status} ${path}: ${msg}`);
    throw new Error(msg);
  }
  return body?.data ?? body;
}
