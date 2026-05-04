const BASE = process.env.APPLICATIONS_SERVICE_URL || 'http://127.0.0.1:5003';
const INTERNAL = process.env.INTERNAL_SERVICE_TOKEN || '';

function internalHeaders() {
  if (!INTERNAL) {
    throw new Error('INTERNAL_SERVICE_TOKEN is required for API-to-applications calls');
  }
  return {
    'Content-Type': 'application/json',
    'X-Internal-Token': INTERNAL
  };
}

async function parseJson(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

export async function getUserDashboardApplicationStats(userId) {
  const res = await fetch(
    `${BASE}/api/internal/dashboard/user-applications/${encodeURIComponent(userId)}`,
    { headers: internalHeaders() }
  );
  if (!res.ok) {
    throw new Error(`applications dashboard user failed: ${res.status}`);
  }
  return parseJson(res);
}

export async function getAdminCandidateCounts() {
  const res = await fetch(`${BASE}/api/internal/dashboard/admin-candidate-counts`, {
    headers: internalHeaders()
  });
  if (!res.ok) {
    throw new Error(`applications admin candidate counts failed: ${res.status}`);
  }
  return parseJson(res);
}

export async function getLegacyUserDashboardCandidateMock() {
  const res = await fetch(`${BASE}/api/internal/dashboard/user-candidate-mock`, {
    headers: internalHeaders()
  });
  if (!res.ok) {
    throw new Error(`applications user candidate mock failed: ${res.status}`);
  }
  return parseJson(res);
}
