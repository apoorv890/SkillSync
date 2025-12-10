import Application from '../models/Application.js';
import Job from '../models/Job.js';
import User from '../models/User.js';
import S3Service from './S3Service.js';
import ResumeAnalysisService from './ResumeAnalysisService.js';
import logger from '../config/logger.js';
import { logCompact, logNested } from '../utils/loggerHelper.js';
import ApiError from '../utils/ApiError.js';
import { APPLICATION_STATUS, JOB_STATUS, HTTP_STATUS } from '../config/constants.js';

class ApplicationService {
  /**
   * Create new job application
   * @param {Object} data - Application data
   * @returns {Promise<Object>} Created application
   */
  async createApplication({ candidateId, jobId, file }, req = null) {
    logNested(req, 'Creating application', { jobId });

    try {
      // Validate job exists and is active
      const job = await Job.findById(jobId);
      if (!job) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Job not found');
      }
      if (job.status !== JOB_STATUS.ACTIVE) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'This job is not accepting applications');
      }

      // Check for duplicate application
      const existingApp = await Application.findOne({ userId: candidateId, jobId });
      if (existingApp) {
        if (existingApp.status === APPLICATION_STATUS.WITHDRAWN) {
          logger.info(`Reactivating withdrawn application`, { applicationId: existingApp._id });
          existingApp.status = APPLICATION_STATUS.APPLIED;
          existingApp.appliedAt = new Date();
          existingApp.withdrawnAt = null;
          await existingApp.save();
          return existingApp;
        }
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'You have already applied for this job');
      }

      // Get candidate details
      const user = await User.findById(candidateId);
      if (!user) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
      }

      // Upload resume to S3
      logNested(req, 'Uploading resume to S3');
      const s3Data = await S3Service.uploadResume(file, candidateId);

      // Create application
      const application = await Application.create({
        userId: candidateId,
        jobId,
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
        status: APPLICATION_STATUS.APPLIED
      });

      logCompact(req, 'Application created successfully', { applicationId: application._id });

      // Trigger async ATS analysis (non-blocking)
      setImmediate(() => {
        ResumeAnalysisService.analyzeResume(application._id.toString(), req)
          .catch((error) => {
            logger.error(`ATS analysis failed: ${error.message}`);
          });
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

  /**
   * Withdraw application
   * @param {string} applicationId - Application ID
   * @param {string} candidateId - Candidate ID
   */
  async withdrawApplication(applicationId, candidateId) {
    logger.info(`Withdrawing application`, { applicationId, candidateId });

    try {
      const application = await Application.findOne({ 
        _id: applicationId, 
        userId: candidateId 
      });

      if (!application) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Application not found');
      }

      if (application.status === APPLICATION_STATUS.WITHDRAWN) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Application already withdrawn');
      }

      // Delete resume from S3
      if (application.resume?.s3Key) {
        logger.info(`Deleting resume from S3`, { s3Key: application.resume.s3Key });
        await S3Service.deleteFile(application.resume.s3Key);
      }

      // Delete application
      await Application.findByIdAndDelete(applicationId);

      logger.info(`Application withdrawn successfully`, { applicationId });
    } catch (error) {
      logger.error(`Error withdrawing application: ${error.message}`, { 
        applicationId, 
        candidateId, 
        error: error.stack 
      });
      throw error;
    }
  }

  /**
   * Get applications by candidate
   * @param {string} candidateId - Candidate ID
   * @returns {Promise<Array>} List of applications
   */
  async getApplicationsByCandidate(candidateId, req = null) {
    logNested(req, 'Fetching applications for candidate', { candidateId });

    try {
      const applications = await Application.find({ userId: candidateId })
        .populate('jobId')
        .sort({ appliedAt: -1 });

      logCompact(req, `Found ${applications.length} applications`, { candidateId });
      return applications;
    } catch (error) {
      logger.error(`Error fetching applications: ${error.message}`, { 
        candidateId, 
        error: error.stack 
      });
      throw error;
    }
  }

  /**
   * Get applications by job
   * @param {string} jobId - Job ID
   * @returns {Promise<Array>} List of applications
   */
  async getApplicationsByJob(jobId, req = null) {
    logNested(req, 'Fetching applications for job', { jobId });

    try {
      const applications = await Application.find({ jobId })
        .populate('userId', 'fullName email')
        .select('candidateInfo atsScore status appliedAt resume.fileName resume.fileSize userId')
        .sort({ 'atsScore.score': -1, appliedAt: -1 });

      // Format response with ATS data
      const formattedApplications = applications.map(app => ({
        _id: app._id,
        candidateName: app.candidateInfo?.name || app.userId?.fullName || 'N/A',
        candidateEmail: app.candidateInfo?.email || app.userId?.email || 'N/A',
        atsScore: app.atsScore?.score || null,
        atsStatus: app.atsScore?.status || 'pending',
        atsError: app.atsScore?.error || null,
        appliedAt: app.appliedAt,
        status: app.status,
        resumeFileName: app.resume?.fileName
      }));

      logCompact(req, `Found ${formattedApplications.length} applications`, { jobId });
      return formattedApplications;
    } catch (error) {
      logger.error(`Error fetching job applications: ${error.message}`, { 
        jobId, 
        error: error.stack 
      });
      throw error;
    }
  }

  /**
   * Generate resume URL
   * @param {string} applicationId - Application ID
   * @returns {Promise<string>} Pre-signed URL
   */
  async generateResumeUrl(applicationId) {
    logger.info(`Generating resume URL`, { applicationId });

    try {
      const application = await Application.findById(applicationId);

      if (!application) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Application not found');
      }

      if (!application.resume?.s3Key) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Resume not found');
      }

      const url = await S3Service.getPreSignedUrl(application.resume.s3Key);

      logger.info(`Resume URL generated`, { applicationId });
      return url;
    } catch (error) {
      logger.error(`Error generating resume URL: ${error.message}`, { 
        applicationId, 
        error: error.stack 
      });
      throw error;
    }
  }

  /**
   * Get application status
   * @param {string} candidateId - Candidate ID
   * @param {string} jobId - Job ID
   * @returns {Promise<Object|null>} Application status
   */
  async getApplicationStatus(candidateId, jobId) {
    logger.info(`Checking application status`, { candidateId, jobId });

    try {
      const application = await Application.findOne({ 
        userId: candidateId, 
        jobId 
      });

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
    } catch (error) {
      logger.error(`Error checking application status: ${error.message}`, { 
        candidateId, 
        jobId, 
        error: error.stack 
      });
      throw error;
    }
  }
}

export default new ApplicationService();
