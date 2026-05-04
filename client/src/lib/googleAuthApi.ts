import type { User } from '../types';

/** sessionStorage key for short-lived onboarding JWT after Google sign-in */
export const ONBOARDING_STORAGE_KEY = 'skillsync_onboarding_token';

export type GoogleAuthResult =
  | { needsOnboarding: true; tempToken: string }
  | { needsOnboarding: false; accessToken: string; user: User };

export function normalizeAuthUser(raw: {
  id: unknown;
  fullName: string;
  email: string;
  role: string;
  profilePhotoUrl?: string | null;
}): User {
  return {
    id: String(raw.id),
    email: raw.email,
    fullName: raw.fullName,
    name: raw.fullName,
    role: raw.role === 'admin' ? 'admin' : 'user',
    profilePhotoUrl: raw.profilePhotoUrl ?? null,
  };
}

export async function postGoogleCredential(credential: string): Promise<GoogleAuthResult> {
  const res = await fetch('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg =
      (typeof body.error === 'string' && body.error) ||
      (typeof body.message === 'string' && body.message) ||
      `Sign-in failed (${res.status})`;
    throw new Error(msg);
  }
  if (body.needsOnboarding === true && typeof body.tempToken === 'string') {
    return { needsOnboarding: true, tempToken: body.tempToken };
  }
  if (typeof body.accessToken === 'string' && body.user && typeof body.user === 'object') {
    const u = body.user as Parameters<typeof normalizeAuthUser>[0];
    return {
      needsOnboarding: false,
      accessToken: body.accessToken,
      user: normalizeAuthUser(u),
    };
  }
  throw new Error('Unexpected response from server');
}

export async function postOnboarding(
  tempToken: string,
  role: 'admin' | 'user',
  profile: Record<string, unknown>
): Promise<{ accessToken: string; user: User }> {
  const res = await fetch('/api/auth/onboarding', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tempToken}`,
    },
    body: JSON.stringify({ role, profile }),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg =
      (typeof body.error === 'string' && body.error) ||
      (typeof body.message === 'string' && body.message) ||
      `Onboarding failed (${res.status})`;
    throw new Error(msg);
  }
  if (typeof body.accessToken === 'string' && body.user && typeof body.user === 'object') {
    return {
      accessToken: body.accessToken,
      user: normalizeAuthUser(body.user as Parameters<typeof normalizeAuthUser>[0]),
    };
  }
  throw new Error('Unexpected response from server');
}
