import jwt from 'jsonwebtoken';
import Application from '../models/Application.js';
import Job from '../models/Job.js';
import User from '../models/User.js';
import { ApiResponse, ApiError, HTTP_STATUS, catchAsync } from '../utils/http.js';
import {
  getCalendarAuthUrl,
  exchangeCalendarCodeAndStore,
  getAvailableSlots,
  scheduleInterview,
  isGoogleAuthError
} from '../services/GoogleCalendarService.js';
import { sanitizeObjectId } from '../utils/querySanitizer.js';

const CALENDAR_RECONNECT_MESSAGE =
  'Your Google Calendar connection is no longer valid. Please reconnect it from the dashboard (Connect/Reconnect Calendar) and try again.';

function getJwtSecret() {
  const secret = (process.env.JWT_SECRET || '').trim();
  if (!secret) throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'JWT_SECRET not set');
  return secret;
}

function signState(userId) {
  return jwt.sign({ t: 'gcal', userId }, getJwtSecret(), { expiresIn: '10m' });
}

function verifyState(state) {
  const decoded = jwt.verify(state, getJwtSecret());
  if (!decoded || decoded.t !== 'gcal' || !decoded.userId) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid state');
  }
  return String(decoded.userId);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

class CalendarController {
  authUrl = catchAsync(async (req, res) => {
    const state = signState(String(req.userId));
    const url = getCalendarAuthUrl(state);
    return ApiResponse.success(res, 'Auth URL generated', { url });
  });

  oauthCallback = catchAsync(async (req, res) => {
    const q = req.query || {};
    const oauthErr = typeof q.error === 'string' ? q.error : '';
    const oauthDesc =
      typeof q.error_description === 'string' ? q.error_description : '';

    if (oauthErr) {
      return res.type('text/html').send(
        `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Calendar</title></head><body>
        <h3>Google sign-in was not completed</h3>
        <p><strong>${escapeHtml(oauthErr)}</strong></p>
        ${oauthDesc ? `<p>${escapeHtml(oauthDesc)}</p>` : ''}
        <p>Close this tab and try connecting again from SkillSync.</p>
        </body></html>`
      );
    }

    const { code, state } = q;
    if (typeof code !== 'string' || !code.trim()) {
      return res.type('text/html').send(
        `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Calendar</title></head><body>
        <h3>This page is only used after Google redirects back</h3>
        <p>Do not open this URL directly. Instead:</p>
        <ol>
          <li>Sign in as <strong>admin</strong> in SkillSync.</li>
          <li>Call <code>GET /api/calendar/auth-url</code> with your Bearer token (or use the app flow).</li>
          <li>Open the <strong>url</strong> from that response in the browser — Google will redirect here with a <code>code</code>.</li>
        </ol>
        </body></html>`
      );
    }
    if (typeof state !== 'string' || !state.trim()) {
      return res.type('text/html').send(
        `<!DOCTYPE html><html><body><h3>Missing state</h3><p>Start again from <code>/api/calendar/auth-url</code>.</p></body></html>`
      );
    }

    const userId = verifyState(state);
    await exchangeCalendarCodeAndStore({ userId, code: code.trim() });

    res.type('text/html').send(
      `<!DOCTYPE html><html><body><h3>Calendar connected</h3><p>You can close this tab.</p></body></html>`
    );
  });

  availability = catchAsync(async (req, res) => {
    const week = req.query?.week === 'next' ? 'next' : 'auto';

    let data;
    try {
      data = await getAvailableSlots({ adminUserId: String(req.userId), week });
    } catch (error) {
      if (isGoogleAuthError(error)) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, CALENDAR_RECONNECT_MESSAGE);
      }
      throw error;
    }

    return ApiResponse.success(res, 'Availability retrieved', data);
  });

  schedule = catchAsync(async (req, res) => {
    const { applicationId, slotStartIso } = req.body || {};
    const sanitizedAppId = sanitizeObjectId(applicationId);
    if (!sanitizedAppId) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid applicationId');
    }
    if (typeof slotStartIso !== 'string' || !slotStartIso.trim()) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'slotStartIso is required');
    }

    const application = await Application.findById(sanitizedAppId).lean();
    if (!application) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Application not found');

    const job = application.jobId ? await Job.findById(application.jobId).lean() : null;
    const user = application.userId ? await User.findById(application.userId).lean() : null;

    const candidateEmail = user?.email || application.candidateInfo?.email || null;
    const candidateName = user?.fullName || application.candidateInfo?.name || null;
    const title = job?.title
      ? `Interview: ${job.title}${candidateName ? ` — ${candidateName}` : ''}`
      : 'SkillSync Interview';
    const description = `Application: ${String(application._id)}`;

    let event;
    try {
      event = await scheduleInterview({
        adminUserId: String(req.userId),
        slotStartIso: slotStartIso.trim(),
        candidateEmail,
        candidateName,
        title,
        description
      });
    } catch (error) {
      if (isGoogleAuthError(error)) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, CALENDAR_RECONNECT_MESSAGE);
      }
      throw error;
    }

    return ApiResponse.success(res, 'Interview scheduled', event, HTTP_STATUS.CREATED);
  });
}

export default new CalendarController();

