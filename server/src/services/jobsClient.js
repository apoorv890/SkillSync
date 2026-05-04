const JOBS_BASE = process.env.JOBS_SERVICE_URL || 'http://127.0.0.1:5002';
const INTERNAL = process.env.INTERNAL_SERVICE_TOKEN || '';

function internalHeaders() {
  if (!INTERNAL) {
    throw new Error('INTERNAL_SERVICE_TOKEN is required for API-to-jobs calls');
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

export async function getJobById(id) {
  const res = await fetch(`${JOBS_BASE}/api/internal/jobs/${encodeURIComponent(id)}`, {
    headers: internalHeaders()
  });
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    return null;
  }
  return parseJson(res);
}

export async function getJobsByIds(ids) {
  if (!ids?.length) {
    return [];
  }
  const res = await fetch(`${JOBS_BASE}/api/internal/jobs/by-ids`, {
    method: 'POST',
    headers: internalHeaders(),
    body: JSON.stringify({ ids })
  });
  if (!res.ok) {
    return [];
  }
  const data = await parseJson(res);
  return data.jobs || [];
}

export async function getAdminDashboardJobStats() {
  const res = await fetch(`${JOBS_BASE}/api/internal/jobs/dashboard-stats`, {
    headers: internalHeaders()
  });
  if (!res.ok) {
    throw new Error(`jobs dashboard-stats failed: ${res.status}`);
  }
  return parseJson(res);
}

export async function getJobsAnalyticsTimeseries(range = '90d') {
  const url = new URL(`${JOBS_BASE}/api/internal/jobs/analytics/timeseries`);
  url.searchParams.set('range', range);
  const res = await fetch(url, { headers: internalHeaders() });
  if (!res.ok) {
    throw new Error(`jobs analytics failed: ${res.status}`);
  }
  return parseJson(res);
}
