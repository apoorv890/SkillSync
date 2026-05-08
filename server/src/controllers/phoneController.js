import Application from '../models/Application.js';
import CallSession from '../models/CallSession.js';
import User from '../models/User.js';
import { catchAsync, ApiResponse, HTTP_STATUS } from '../utils/http.js';

function normalizePhone(raw) {
  if (typeof raw !== 'string') return null;
  const v = raw.trim();
  if (!v) return null;
  return v;
}

class PhoneController {
  callCandidate = catchAsync(async (req, res) => {
    const { applicationId } = req.body || {};

    if (!applicationId) {
      return ApiResponse.error(res, 'applicationId is required', HTTP_STATUS.BAD_REQUEST);
    }

    const application = await Application.findById(applicationId).lean();
    if (!application) {
      return ApiResponse.error(res, 'Application not found', HTTP_STATUS.NOT_FOUND);
    }

    const user = await User.findById(application.userId).lean();
    if (!user) {
      return ApiResponse.error(res, 'Candidate user not found', HTTP_STATUS.NOT_FOUND);
    }

    const to = normalizePhone(user.phoneNumber);
    if (!to) {
      return ApiResponse.error(
        res,
        'Candidate phone number is not set in profile',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const baseUrl = (process.env.PHONE_AGENT_BASE_URL || '').trim().replace(/\/$/, '');
    if (!baseUrl) {
      return ApiResponse.error(
        res,
        'PHONE_AGENT_BASE_URL is not configured',
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }

    const upstream = await fetch(`${baseUrl}/twilio/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to })
    });

    const upstreamBody = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      const msg =
        upstreamBody?.error ||
        upstreamBody?.message ||
        `phone-agent call failed (${upstream.status})`;
      return ApiResponse.error(res, msg, HTTP_STATUS.BAD_REQUEST);
    }

    // Best-effort: create a call session record for admin-triggered calls.
    try {
      const sid = typeof upstreamBody?.sid === 'string' ? upstreamBody.sid : null;
      if (sid) {
        await CallSession.create({
          callSid: sid,
          applicationId: application._id,
          userId: application.userId,
          jobId: application.jobId,
          callerPhone: null,
          status: 'initiated',
          startedAt: new Date()
        });
      }
    } catch {
      // ignore: call should still succeed even if telemetry write fails
    }

    return ApiResponse.success(res, 'Call initiated', {
      sid: upstreamBody?.sid
    });
  });
}

export default new PhoneController();

