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

