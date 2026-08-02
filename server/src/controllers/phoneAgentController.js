import Application from '../models/Application.js';
import CallSession from '../models/CallSession.js';
import Job from '../models/Job.js';
import User from '../models/User.js';
import { catchAsync, ApiResponse, ApiError, HTTP_STATUS } from '../utils/http.js';
import { sanitizeObjectId } from '../utils/querySanitizer.js';

class PhoneAgentController {
  createSession = catchAsync(async (req, res) => {
    const { callSid, candidateId, jobId, callerPhone } = req.body || {};

    if (!callSid || typeof callSid !== 'string') {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'callSid is required');
    }

    const sanitizedCandidateId = sanitizeObjectId(candidateId);
    const sanitizedJobId = sanitizeObjectId(jobId);

    const session = await CallSession.create({
      callSid: callSid.trim(),
      userId: sanitizedCandidateId || null,
      jobId: sanitizedJobId || null,
      callerPhone: typeof callerPhone === 'string' ? callerPhone.trim() : null,
      status: 'initiated',
      startedAt: new Date()
    });

    return ApiResponse.success(res, 'Session created', { sessionId: session._id }, HTTP_STATUS.CREATED);
  });

  getContext = catchAsync(async (req, res) => {
    const sessionId = sanitizeObjectId(req.params.id);
    if (!sessionId) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid session id');
    }

    const session = await CallSession.findById(sessionId).lean();
    if (!session) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Session not found');
    }

    const user = session.userId ? await User.findById(session.userId).lean() : null;
    const job = session.jobId ? await Job.findById(session.jobId).lean() : null;

    // Minimal “sanitized context” for now; refine later.
    return ApiResponse.success(res, 'Context retrieved', {
      candidateName: user?.fullName || null,
      jobTitle: job?.title || null,
      jobRequirements: job?.requiredSkills || job?.requirements || null,
      resumeSummary: null,
      interviewScript: null
    });
  });

  getApplicationContext = catchAsync(async (req, res) => {
    const applicationId = sanitizeObjectId(req.params.applicationId);
    if (!applicationId) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid application id');
    }

    const application = await Application.findById(applicationId).lean();
    if (!application) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Application not found');
    }

    const user = application.userId ? await User.findById(application.userId).lean() : null;
    const job = application.jobId ? await Job.findById(application.jobId).lean() : null;

    return ApiResponse.success(res, 'Context retrieved', {
      applicationId: String(application._id),
      candidateName: user?.fullName || application.candidateInfo?.name || null,
      candidateEmail: user?.email || application.candidateInfo?.email || null,
      jobTitle: job?.title || null,
      jobRequirements: job?.requiredSkills || job?.requirements || null,
      // Keep these null for now; later phases can include resume summaries/interview scripts.
      resumeSummary: null,
      interviewScript: null
    });
  });

  /**
   * GET /api/phone-agent/calls/:callSid/application-context
   * Resolves application + job/candidate context from the CallSession row written when SkillSync initiates the outbound call.
   */
  getApplicationContextByCallSid = catchAsync(async (req, res) => {
    const callSid =
      typeof req.params.callSid === 'string' ? req.params.callSid.trim() : '';
    if (!callSid) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid callSid');
    }

    const link = await CallSession.findOne({ callSid }).lean();
    if (!link?.applicationId) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        'No application linked to this call. Place outbound calls via SkillSync (includes applicationId), or pass applicationId on the Twilio voice/stream URL.'
      );
    }

    const applicationId = sanitizeObjectId(link.applicationId);
    if (!applicationId) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid application id on call session');
    }

    const application = await Application.findById(applicationId).lean();
    if (!application) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Application not found');
    }

    const user = application.userId ? await User.findById(application.userId).lean() : null;
    const job = application.jobId ? await Job.findById(application.jobId).lean() : null;

    return ApiResponse.success(res, 'Context retrieved', {
      applicationId: String(application._id),
      candidateName: user?.fullName || application.candidateInfo?.name || null,
      candidateEmail: user?.email || application.candidateInfo?.email || null,
      jobTitle: job?.title || null,
      jobRequirements: job?.requiredSkills || job?.requirements || null,
      resumeSummary: null,
      interviewScript: null
    });
  });

  /**
   * POST /api/phone-agent/calls/:callSid/start
   * Marks a CallSession in-progress once the phone-agent's Gemini Live session
   * is actually up (upserts by callSid — covers calls that never went through
   * PhoneController.callCandidate's pre-created CallSession row).
   */
  markCallStarted = catchAsync(async (req, res) => {
    const callSid =
      typeof req.params.callSid === 'string' ? req.params.callSid.trim() : '';
    if (!callSid) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid callSid');
    }

    const { applicationId } = req.body || {};
    const sanitizedAppId = sanitizeObjectId(applicationId);

    const session = await CallSession.findOneAndUpdate(
      { callSid },
      {
        $setOnInsert: { callSid, startedAt: new Date() },
        $set: {
          status: 'in-progress',
          ...(sanitizedAppId ? { applicationId: sanitizedAppId } : {})
        }
      },
      { upsert: true, new: true }
    );

    return ApiResponse.success(res, 'Call marked in-progress', { sessionId: session._id });
  });

  /**
   * POST /api/phone-agent/calls/:callSid/end
   * Body: { status?: 'completed'|'failed', outcome?: string, transcript?: string }
   * Marks a CallSession ended (upserts by callSid, same reasoning as markCallStarted).
   */
  markCallEnded = catchAsync(async (req, res) => {
    const callSid =
      typeof req.params.callSid === 'string' ? req.params.callSid.trim() : '';
    if (!callSid) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid callSid');
    }

    const { status, outcome, transcript } = req.body || {};
    const finalStatus = status === 'failed' ? 'failed' : 'completed';

    const session = await CallSession.findOneAndUpdate(
      { callSid },
      {
        $setOnInsert: { callSid, startedAt: new Date() },
        $set: {
          status: finalStatus,
          endedAt: new Date(),
          ...(typeof outcome === 'string' && outcome ? { outcome } : {}),
          ...(typeof transcript === 'string' && transcript ? { transcript } : {})
        }
      },
      { upsert: true, new: true }
    );

    return ApiResponse.success(res, 'Call marked ended', { sessionId: session._id });
  });

  postEvent = catchAsync(async (req, res) => {
    const sessionId = sanitizeObjectId(req.params.id);
    if (!sessionId) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid session id');
    }
    const { event, data } = req.body || {};
    if (!event || typeof event !== 'string') {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'event is required');
    }

    await CallSession.updateOne(
      { _id: sessionId },
      {
        $push: {
          events: {
            event,
            data: data ?? null,
            at: new Date()
          }
        }
      }
    );

    return ApiResponse.success(res, 'Event appended');
  });

  finalize = catchAsync(async (req, res) => {
    const sessionId = sanitizeObjectId(req.params.id);
    if (!sessionId) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid session id');
    }
    const { transcript, outcome, score, applicationId } = req.body || {};

    const session = await CallSession.findById(sessionId);
    if (!session) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Session not found');
    }

    if (typeof transcript === 'string') session.transcript = transcript;
    if (typeof outcome === 'string') session.outcome = outcome;
    if (typeof score === 'number') session.score = score;
    session.status = 'completed';
    session.endedAt = new Date();

    // Optional: update application stage if provided.
    const sanitizedAppId = sanitizeObjectId(applicationId) || session.applicationId;
    if (sanitizedAppId) {
      await Application.updateOne(
        { _id: sanitizedAppId },
        { $set: { status: 'Under Review' } } // keep neutral for now; refine later
      );
      session.applicationId = sanitizedAppId;
    }

    await session.save();

    return ApiResponse.success(res, 'Session finalized');
  });
}

export default new PhoneAgentController();

