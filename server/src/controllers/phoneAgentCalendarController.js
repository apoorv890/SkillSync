import Application from '../models/Application.js';
import Job from '../models/Job.js';
import User from '../models/User.js';
import { catchAsync, ApiResponse, ApiError, HTTP_STATUS } from '../utils/http.js';
import { sanitizeObjectId } from '../utils/querySanitizer.js';
import {
  getAvailableSlots,
  scheduleInterview
} from '../services/GoogleCalendarService.js';
import { DateTime } from 'luxon';

const IST = 'Asia/Kolkata';

/** Mongo user id of the admin whose Google Calendar is connected (OAuth refresh token). */
async function resolveCalendarAdminUserId() {
  const explicit = (process.env.GOOGLE_CALENDAR_ADMIN_USER_ID || '').trim();
  if (explicit) return explicit;

  const admin = await User.findOne({
    role: 'admin',
    googleCalendarRefreshToken: { $exists: true, $nin: [null, ''] }
  })
    .select('_id')
    .lean();

  if (!admin?._id) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'No admin calendar connected. Set GOOGLE_CALENDAR_ADMIN_USER_ID or connect calendar via /api/calendar/auth-url.'
    );
  }
  return String(admin._id);
}

class PhoneAgentCalendarController {
  /**
   * GET /api/phone-agent/time — live clock in IST for the voice agent (no guessing).
   */
  nowIst = catchAsync(async (_req, res) => {
    const now = DateTime.now().setZone(IST);
    return ApiResponse.success(res, 'Current time (IST)', {
      timezone: IST,
      timezoneNote: 'Indian Standard Time (UTC+05:30). Never mention UTC to the candidate.',
      iso: now.toISO(),
      voiceLabel: now.toFormat("cccc d MMMM yyyy 'at' h:mm a 'IST'"),
      hour24: now.hour,
      weekdayName: now.toFormat('cccc')
    });
  });

  /**
   * GET /api/phone-agent/calendar/availability?week=auto|next
   * Called by phone-agent with SKILLSYNC_SERVICE_TOKEN (not user JWT).
   */
  availability = catchAsync(async (req, res) => {
    const week = req.query?.week === 'next' ? 'next' : 'auto';
    const adminUserId = await resolveCalendarAdminUserId();
    const data = await getAvailableSlots({ adminUserId, week });
    return ApiResponse.success(res, 'Availability retrieved', data);
  });

  /**
   * POST /api/phone-agent/calendar/schedule
   * Body: { applicationId, slotStartIso } (also accepts { applicationId, startIso } for agent compatibility)
   */
  schedule = catchAsync(async (req, res) => {
    const { applicationId, slotStartIso, startIso } = req.body || {};
    const effectiveSlotStartIso = slotStartIso || startIso;
    const sanitizedAppId = sanitizeObjectId(applicationId);
    if (!sanitizedAppId) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid applicationId');
    }
    if (typeof effectiveSlotStartIso !== 'string' || !effectiveSlotStartIso.trim()) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'slotStartIso is required');
    }

    const adminUserId = await resolveCalendarAdminUserId();

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

    const event = await scheduleInterview({
      adminUserId,
      slotStartIso: effectiveSlotStartIso.trim(),
      candidateEmail,
      candidateName,
      title,
      description
    });

    return ApiResponse.success(res, 'Interview scheduled', event, HTTP_STATUS.CREATED);
  });
}

export default new PhoneAgentCalendarController();
