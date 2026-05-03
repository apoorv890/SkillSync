import Application from '../models/Application.js';
import { ApiError } from '@skillsync/shared/http';
import { HTTP_STATUS } from '@skillsync/shared/constants';

const BASE = process.env.RESUME_ANALYSIS_SERVICE_URL || 'http://127.0.0.1:5004';
const INTERNAL = process.env.INTERNAL_SERVICE_TOKEN || '';

function internalHeaders() {
  if (!INTERNAL) {
    throw new Error('INTERNAL_SERVICE_TOKEN is required for API-to-resume-analysis calls');
  }
  return {
    'Content-Type': 'application/json',
    'X-Internal-Token': INTERNAL
  };
}

/**
 * Fire-and-forget ATS pipeline on the resume-analysis service.
 */
export function triggerAnalyze(applicationId) {
  return fetch(`${BASE}/api/internal/analyze`, {
    method: 'POST',
    headers: internalHeaders(),
    body: JSON.stringify({ applicationId })
  }).then(async (res) => {
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Resume analysis returned ${res.status}`);
    }
    return res.json();
  });
}

export async function retryAnalysis(applicationId) {
  const res = await fetch(`${BASE}/api/internal/analyze/retry`, {
    method: 'POST',
    headers: internalHeaders(),
    body: JSON.stringify({ applicationId })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Resume analysis retry returned ${res.status}`);
  }
  const data = await res.json();
  return data.score;
}

export async function getAnalysisStatus(applicationId) {
  const application = await Application.findById(applicationId).select('atsScore');

  if (!application) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Application not found');
  }

  return {
    status: application.atsScore?.status || 'pending',
    score: application.atsScore?.score || null,
    analyzedAt: application.atsScore?.analyzedAt || null,
    error: application.atsScore?.error || null
  };
}
