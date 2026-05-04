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

export async function searchCandidatesFiltered(params) {
  const res = await fetch(`${BASE}/api/internal/search/candidates-filtered`, {
    method: 'POST',
    headers: internalHeaders(),
    body: JSON.stringify(params || {})
  });
  if (!res.ok) {
    throw new Error(`applications candidate search failed: ${res.status}`);
  }
  const data = await parseJson(res);
  return data.candidates || [];
}

export async function unifiedSearchCandidates(sanitizedQuery) {
  const res = await fetch(`${BASE}/api/internal/search/unified-candidates`, {
    method: 'POST',
    headers: internalHeaders(),
    body: JSON.stringify({ sanitizedQuery })
  });
  if (!res.ok) {
    throw new Error(`applications unified candidates failed: ${res.status}`);
  }
  const data = await parseJson(res);
  return data.candidates || [];
}

export async function getCandidateSuggestions(prefix, jobId) {
  const url = new URL(`${BASE}/api/internal/search/candidate-suggestions`);
  url.searchParams.set('prefix', prefix ?? '');
  if (jobId) {
    url.searchParams.set('jobId', jobId);
  }
  const res = await fetch(url, { headers: internalHeaders() });
  if (!res.ok) {
    return [];
  }
  const data = await parseJson(res);
  return data.suggestions || [];
}

export async function getApplicationAtsStatus(applicationId) {
  const res = await fetch(
    `${BASE}/api/internal/applications/${encodeURIComponent(applicationId)}/ats`,
    { headers: internalHeaders() }
  );
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`applications ats status failed: ${res.status}`);
  }
  return parseJson(res);
}
