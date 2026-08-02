import Application from '../models/Application.js';
import Job from '../models/Job.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';
import { catchAsync, ApiResponse, ApiError, HTTP_STATUS } from '../utils/http.js';
import { sanitizeObjectId } from '../utils/querySanitizer.js';
import {
  getAvailableSlots,
  scheduleInterview,
  isGoogleAuthError
} from '../services/GoogleCalendarService.js';
import { DateTime } from 'luxon';

const IST = 'Asia/Kolkata';

/** Shared with resolveRecruiterForApplication's "no usable calendar" case below —
 *  from the candidate's perspective an invalid/expired token and a missing one
 *  mean the same thing: this recruiter's calendar isn't usable right now. */
const CALENDAR_UNAVAILABLE_MESSAGE =
  "This role's recruiter hasn't connected their Google Calendar yet. Scheduling isn't available right now — someone from our team will follow up to arrange a time.";

/**
 * Resolves which admin's Google Calendar to use for a given application, via
 * Application -> Job.recruiterId — replacing the old "first admin with a
 * connected calendar" fallback (nondeterministic: which admin got picked
 * depended on Mongo's default document order, not on which job/recruiter
 * the call was actually about).
 *
 * Fallback (only when the job has no recruiterId, or that recruiter hasn't
 * connected a calendar yet): GOOGLE_CALENDAR_ADMIN_USER_ID, if the operator
 * has explicitly configured one, as a deliberate opt-in default — not an
 * arbitrary DB lookup. If that isn't set either, this fails with a clear
 * error rather than silently booking onto the wrong recruiter's calendar.
 */
async function resolveRecruiterForApplication(applicationId) {
  const sanitizedAppId = sanitizeObjectId(applicationId);
  if (!sanitizedAppId) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid applicationId');
  }

  const application = await Application.findById(sanitizedAppId).lean();
  if (!application) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Application not found');
  }

  const job = application.jobId ? await Job.findById(application.jobId).lean() : null;
  if (!job) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Job not found for this application');
  }

  const recruiter = job.recruiterId
    ? await User.findById(job.recruiterId).select('_id googleCalendarRefreshToken').lean()
    : null;

  if (recruiter?.googleCalendarRefreshToken) {
    return { adminUserId: String(recruiter._id), application, job };
  }

  const fallbackId = (process.env.GOOGLE_CALENDAR_ADMIN_USER_ID || '').trim();
  if (fallbackId) {
    const fallbackAdmin = await User.findById(fallbackId)
      .select('_id googleCalendarRefreshToken')
      .lean();
    if (fallbackAdmin?.googleCalendarRefreshToken) {
      logger.warn(
        `Job ${job._id} has no usable recruiter calendar (recruiterId=${job.recruiterId || 'none'}); ` +
          `using GOOGLE_CALENDAR_ADMIN_USER_ID fallback for application ${sanitizedAppId}`
      );
      return { adminUserId: String(fallbackAdmin._id), application, job };
    }
  }

  throw new ApiError(
    HTTP_STATUS.BAD_REQUEST,
    job.recruiterId
      ? CALENDAR_UNAVAILABLE_MESSAGE
      : 'This job has no assigned recruiter and no default calendar is configured. Scheduling isn\'t available right now.'
  );
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
   * GET /api/phone-agent/calendar/availability?week=auto|next&applicationId=...
   * Called by phone-agent with VOICEHIRE_SERVICE_TOKEN (not user JWT).
   * applicationId is required — availability is always for a specific job's
   * assigned recruiter, not a global calendar.
   */
  availability = catchAsync(async (req, res) => {
    const week = req.query?.week === 'next' ? 'next' : 'auto';
    const applicationId =
      typeof req.query?.applicationId === 'string' ? req.query.applicationId.trim() : '';
    if (!applicationId) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'applicationId is required');
    }

    const { adminUserId } = await resolveRecruiterForApplication(applicationId);

    let data;
    try {
      data = await getAvailableSlots({ adminUserId, week });
    } catch (error) {
      if (isGoogleAuthError(error)) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, CALENDAR_UNAVAILABLE_MESSAGE);
      }
      throw error;
    }

    return ApiResponse.success(res, 'Availability retrieved', data);
  });

  /**
   * POST /api/phone-agent/calendar/schedule
   * Body: { applicationId, slotStartIso } (also accepts { applicationId, startIso } for agent compatibility)
   */
  schedule = catchAsync(async (req, res) => {
    const { applicationId, slotStartIso, startIso } = req.body || {};
    const effectiveSlotStartIso = slotStartIso || startIso;
    if (typeof effectiveSlotStartIso !== 'string' || !effectiveSlotStartIso.trim()) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'slotStartIso is required');
    }
    if (!applicationId) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'applicationId is required');
    }

    const { adminUserId, application, job } = await resolveRecruiterForApplication(applicationId);

    const user = application.userId ? await User.findById(application.userId).lean() : null;

    const candidateEmail = user?.email || application.candidateInfo?.email || null;
    const candidateName = user?.fullName || application.candidateInfo?.name || null;
    const title = job?.title
      ? `Interview: ${job.title}${candidateName ? ` — ${candidateName}` : ''}`
      : 'VoiceHire Interview';
    const description = `Application: ${String(application._id)}`;

    let event;
    try {
      event = await scheduleInterview({
        adminUserId,
        slotStartIso: effectiveSlotStartIso.trim(),
        candidateEmail,
        candidateName,
        title,
        description
      });
    } catch (error) {
      if (isGoogleAuthError(error)) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, CALENDAR_UNAVAILABLE_MESSAGE);
      }
      throw error;
    }

    return ApiResponse.success(res, 'Interview scheduled', event, HTTP_STATUS.CREATED);
  });
}

export default new PhoneAgentCalendarController();
