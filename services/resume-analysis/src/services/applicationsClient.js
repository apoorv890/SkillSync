const BASE = process.env.APPLICATIONS_SERVICE_URL || 'http://127.0.0.1:5003';
const INTERNAL = process.env.INTERNAL_SERVICE_TOKEN || '';

function internalHeaders() {
  if (!INTERNAL) {
    throw new Error('INTERNAL_SERVICE_TOKEN is required for resume-analysis-to-applications calls');
  }
  return {
    'Content-Type': 'application/json',
    'X-Internal-Token': INTERNAL
  };
}

export async function getApplicationForWorker(id) {
  const res = await fetch(`${BASE}/api/internal/applications/${encodeURIComponent(id)}/for-worker`, {
    headers: internalHeaders()
  });
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`getApplication failed: ${res.status}`);
  }
  return res.json();
}

export async function patchAtsResetRetry(id) {
  const res = await fetch(
    `${BASE}/api/internal/applications/${encodeURIComponent(id)}/ats/reset-retry`,
    {
      method: 'PATCH',
      headers: internalHeaders()
    }
  );
  if (!res.ok) {
    throw new Error(`reset retry failed: ${res.status}`);
  }
}

export async function patchAtsProcessing(id) {
  const res = await fetch(
    `${BASE}/api/internal/applications/${encodeURIComponent(id)}/ats/processing`,
    {
      method: 'PATCH',
      headers: internalHeaders()
    }
  );
  if (!res.ok) {
    throw new Error(`ats processing failed: ${res.status}`);
  }
}

export async function patchAtsComplete(id, payload) {
  const res = await fetch(
    `${BASE}/api/internal/applications/${encodeURIComponent(id)}/ats/complete`,
    {
      method: 'PATCH',
      headers: internalHeaders(),
      body: JSON.stringify(payload)
    }
  );
  if (!res.ok) {
    throw new Error(`ats complete failed: ${res.status}`);
  }
}

export async function patchAtsFailed(id, errorMessage) {
  const res = await fetch(
    `${BASE}/api/internal/applications/${encodeURIComponent(id)}/ats/failed`,
    {
      method: 'PATCH',
      headers: internalHeaders(),
      body: JSON.stringify({ error: errorMessage })
    }
  );
  if (!res.ok) {
    throw new Error(`ats failed patch failed: ${res.status}`);
  }
}
