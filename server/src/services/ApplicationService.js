import Application from '../models/Application.js';
import User from '../models/User.js';
import Job from '../models/Job.js';
import S3Service from './S3Service.js';
import ResumeAnalysisService from './ResumeAnalysisService.js';
import logger from '../utils/logger.js';
import { logCompact, logNested } from '../utils/loggerHelper.js';
import { ApiError, HTTP_STATUS } from '../utils/http.js';
import { APPLICATION_STATUS, JOB_STATUS } from '../utils/constants.js';
import { sanitizeObjectId } from '../utils/querySanitizer.js';

class ApplicationService {
  async createApplication({ candidateId, jobId, file }, req = null) {
    logNested(req, 'Creating application', { jobId });

    try {
      const sanitizedJobId = sanitizeObjectId(jobId);
      const sanitizedCandidateId = sanitizeObjectId(candidateId);

      if (!sanitizedJobId) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid job ID');
      }

      if (!sanitizedCandidateId) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid candidate ID');
      }

      const job = await Job.findById(sanitizedJobId).lean();
      if (!job) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Job not found');
      }
      if (job.status !== JOB_STATUS.ACTIVE) {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          'This job is not accepting applications'
        );
      }

      const existingApp = await Application.findOne({
        userId: sanitizedCandidateId,
        jobId: sanitizedJobId
      });
      if (existingApp) {
        if (existingApp.status === APPLICATION_STATUS.WITHDRAWN) {
          logger.info(`Reactivating withdrawn application`, {
            applicationId: existingApp._id
          });
          existingApp.status = APPLICATION_STATUS.APPLIED;
          existingApp.appliedAt = new Date();
          existingApp.withdrawnAt = null;
          await existingApp.save();
          return existingApp;
        }
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          'You have already applied for this job'
        );
      }

      const user = await User.findById(sanitizedCandidateId).lean();
      if (!user) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
      }

      logNested(req, 'Uploading resume to S3');
      const s3Data = await S3Service.uploadResume(file, candidateId);

      const application = await Application.create({
        userId: sanitizedCandidateId,
        jobId: sanitizedJobId,
        candidateInfo: {
          name: user.fullName,
          email: user.email
        },
        resume: {
          fileUrl: s3Data.location,
          s3Key: s3Data.key,
          fileName: file.originalname,
          fileType: file.mimetype,
          fileSize: file.size,
          uploadedAt: new Date()
        },
        status: APPLICATION_STATUS.APPLIED,
        atsScore: {
          status: 'pending'
        }
      });

      logCompact(req, 'Application created successfully', {
        applicationId: application._id
      });

      return application;
    } catch (error) {
      logger.error(`Error creating application: ${error.message}`, {
        candidateId,
        jobId,
        error: error.stack
      });
      throw error;
    }
  }

  async triggerATSAnalysis(applicationId) {
    return ResumeAnalysisService.analyze(applicationId);
  }

  async retryATSAnalysis(applicationId) {
    return ResumeAnalysisService.analyze(applicationId);
  }

  async withdrawApplication(candidateId, jobId) {
    logger.info(`Withdrawing application`, { candidateId, jobId });

    const sanitizedCandidateId = sanitizeObjectId(candidateId);
    const sanitizedJobId = sanitizeObjectId(jobId);

    if (!sanitizedCandidateId || !sanitizedJobId) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        'Invalid candidate or job ID'
      );
    }

    const application = await Application.findOne({
      userId: sanitizedCandidateId,
      jobId: sanitizedJobId
    });

    if (!application) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Application not found');
    }

    if (application.status === APPLICATION_STATUS.WITHDRAWN) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Application already withdrawn');
    }

    if (application.resume?.s3Key) {
      logger.info(`Deleting resume from S3`, { s3Key: application.resume.s3Key });
      await S3Service.deleteFile(application.resume.s3Key);
    }

    await Application.findByIdAndDelete(application._id);

    logger.info(`Application withdrawn successfully`, { applicationId: application._id });
  }

  async getApplicationsByCandidate(candidateId, req = null) {
    logNested(req, 'Fetching applications for candidate', { candidateId });

    const sanitizedCandidateId = sanitizeObjectId(candidateId);
    if (!sanitizedCandidateId) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid candidate ID');
    }

    const applications = await Application.find({ userId: sanitizedCandidateId })
      .sort({ appliedAt: -1 })
      .lean();

    const jobIds = [...new Set(applications.map((a) => String(a.jobId)).filter(Boolean))];
    const jobs = await Job.find({ _id: { $in: jobIds } }).lean();
    const jobMap = new Map(jobs.map((j) => [String(j._id), j]));

    const enriched = applications.map((a) => ({
      ...a,
      jobId: jobMap.get(String(a.jobId)) || a.jobId
    }));

    logCompact(req, `Found ${enriched.length} applications`, { candidateId });
    return enriched;
  }

  async getApplicationsByJob(jobId, req = null) {
    logNested(req, 'Fetching applications for job', { jobId });

    const sanitizedJobId = sanitizeObjectId(jobId);
    if (!sanitizedJobId) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid job ID');
    }

    const applications = await Application.find({ jobId: sanitizedJobId })
      .select(
        'candidateInfo atsScore status appliedAt resume.fileName resume.fileSize userId'
      )
      .sort({ 'atsScore.score': -1, appliedAt: -1 })
      .lean();

    const userIds = [...new Set(applications.map((a) => String(a.userId)))];
    const users = await User.find({ _id: { $in: userIds } })
      .select('fullName email')
      .lean();
    const userMap = new Map(users.map((u) => [String(u._id), u]));

    const formattedApplications = applications.map((app) => {
      const uid = String(app.userId);
      const u = userMap.get(uid);
      return {
        _id: app._id,
        candidateName: app.candidateInfo?.name || u?.fullName || 'N/A',
        candidateEmail: app.candidateInfo?.email || u?.email || 'N/A',
        atsScore: app.atsScore?.score || null,
        atsStatus: app.atsScore?.status || 'pending',
        atsError: app.atsScore?.error || null,
        appliedAt: app.appliedAt,
        status: app.status,
        resumeFileName: app.resume?.fileName
      };
    });

    logCompact(req, `Found ${formattedApplications.length} applications`, { jobId });
    return formattedApplications;
  }

  async generateResumeUrl(applicationId) {
    logger.info(`Generating resume URL`, { applicationId });

    const sanitizedAppId = sanitizeObjectId(applicationId);
    if (!sanitizedAppId) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid application ID');
    }

    const application = await Application.findById(sanitizedAppId).lean();

    if (!application) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Application not found');
    }

    if (!application.resume?.s3Key) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Resume not found');
    }

    const url = await S3Service.getPreSignedUrl(application.resume.s3Key);

    logger.info(`Resume URL generated`, { applicationId });
    return url;
  }

  async getApplicationStatus(candidateId, jobId) {
    logger.info(`Checking application status`, { candidateId, jobId });

    const sanitizedCandidateId = sanitizeObjectId(candidateId);
    const sanitizedJobId = sanitizeObjectId(jobId);

    if (!sanitizedCandidateId || !sanitizedJobId) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid candidate or job ID');
    }

    const application = await Application.findOne({
      userId: sanitizedCandidateId,
      jobId: sanitizedJobId
    }).lean();

    if (!application) {
      return null;
    }

    return {
      applied: true,
      status: application.status,
      appliedAt: application.appliedAt,
      withdrawnAt: application.withdrawnAt,
      hasResume: !!application.resume?.s3Key
    };
  }

  async getAtsStatus(applicationId) {
    const sanitizedAppId = sanitizeObjectId(applicationId);
    if (!sanitizedAppId) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid application ID');
    }
    const application = await Application.findById(sanitizedAppId)
      .select('atsScore')
      .lean();
    if (!application) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Application not found');
    }
    const a = application.atsScore || {};
    return {
      status: a.status || 'pending',
      score: a.score ?? null,
      analyzedAt: a.analyzedAt || null,
      error: a.error || null
    };
  }
}

export default new ApplicationService();

