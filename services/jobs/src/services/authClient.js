const AUTH_BASE = process.env.AUTH_SERVICE_URL || 'http://127.0.0.1:5001';
const INTERNAL = process.env.INTERNAL_SERVICE_TOKEN || '';

function internalHeaders() {
  if (!INTERNAL) {
    throw new Error('INTERNAL_SERVICE_TOKEN is required for jobs-to-auth calls');
  }
  return {
    'Content-Type': 'application/json',
    'X-Internal-Token': INTERNAL
  };
}

export async function isTokenBlacklisted(token) {
  try {
    if (!INTERNAL) {
      return false;
    }
    const res = await fetch(`${AUTH_BASE}/api/internal/blacklist/check`, {
      method: 'POST',
      headers: internalHeaders(),
      body: JSON.stringify({ token })
    });
    if (!res.ok) {
      return false;
    }
    const data = await res.json();
    return data.blacklisted === true;
  } catch {
    return false;
  }
}

export async function getUserById(id) {
  const res = await fetch(`${AUTH_BASE}/api/internal/users/${encodeURIComponent(id)}`, {
    headers: internalHeaders()
  });
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    return null;
  }
  return res.json();
}
