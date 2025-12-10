import ApplicationService from '../services/ApplicationService.js';
import ResumeAnalysisService from '../services/ResumeAnalysisService.js';
import Application from '../models/Application.js';
import logger from '../config/logger.js';
import catchAsync from '../utils/catchAsync.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import { HTTP_STATUS } from '../config/constants.js';
import { logNested, logCompact } from '../utils/loggerHelper.js';

class ApplicationController {
  /**
   * Apply for a job with resume
   * @route POST /api/applications/job/:jobId/apply
   */
  applyForJob = catchAsync(async (req, res) => {
    const { jobId } = req.params;
    const candidateId = req.user.id;
    const file = req.file;

    if (!file) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Resume file is required');
    }

    logNested(req, 'Submitting application', { jobId });

    const application = await ApplicationService.createApplication({
      candidateId,
      jobId,
      file
    }, req);

    return ApiResponse.success(
      res,
      'Application submitted successfully. Resume analysis in progress.',
      {
        _id: application._id,
        jobId: application.jobId,
        status: application.status,
        appliedAt: application.appliedAt,
        atsAnalysisStatus: 'pending',
        resume: {
          fileName: application.resume.fileName,
          fileSize: application.resume.fileSize,
          uploadedAt: application.resume.uploadedAt
        }
      },
      HTTP_STATUS.CREATED
    );
  });

  /**
   * Withdraw application
   * @route DELETE /api/applications/job/:jobId/withdraw
   */
  withdrawApplication = catchAsync(async (req, res) => {
    const { jobId } = req.params;
    const candidateId = req.user.id;

    logger.info('Withdrawal requested', { candidateId, jobId });

    // Find application first
    const status = await ApplicationService.getApplicationStatus(candidateId, jobId);
    
    if (!status || !status.applied) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Application not found');
    }

    // Get the actual application to find its ID
    const Application = (await import('../models/Application.js')).default;
    const application = await Application.findOne({ userId: candidateId, jobId });

    await ApplicationService.withdrawApplication(application._id, candidateId);

    return ApiResponse.success(res, 'Application withdrawn successfully');
  });

  /**
   * Get application status
   * @route GET /api/applications/job/:jobId/status
   */
  getApplicationStatus = catchAsync(async (req, res) => {
    const { jobId } = req.params;
    const candidateId = req.user.id;

    const status = await ApplicationService.getApplicationStatus(candidateId, jobId);

    return ApiResponse.success(
      res, 
      'Status retrieved successfully', 
      status || { applied: false }
    );
  });

  /**
   * Get candidate's applications
   * @route GET /api/applications/my-applications
   */
  getUserApplications = catchAsync(async (req, res) => {
    const candidateId = req.user.id;

    const applications = await ApplicationService.getApplicationsByCandidate(candidateId);

    return ApiResponse.success(res, 'Applications retrieved successfully', applications);
  });

  /**
   * Get all applications for a job (Admin)
   * @route GET /api/applications/job/:jobId/all
   */
  getJobApplications = catchAsync(async (req, res) => {
    const { jobId } = req.params;

    const applications = await ApplicationService.getApplicationsByJob(jobId, req);

    return ApiResponse.success(res, 'Applications retrieved successfully', applications);
  });

  /**
   * Get resume pre-signed URL (Admin)
   * @route GET /api/applications/resume/:applicationId
   */
  getResumeUrl = catchAsync(async (req, res) => {
    const { applicationId } = req.params;

    const resumeUrl = await ApplicationService.generateResumeUrl(applicationId);

    return ApiResponse.success(res, 'Resume URL generated successfully', {
      resumeUrl,
      expiresIn: 3600
    });
  });

  /**
   * Retry ATS analysis for failed application (Admin)
   * @route POST /api/applications/:applicationId/retry-analysis
   */
  retryATSAnalysis = catchAsync(async (req, res) => {
    const { applicationId } = req.params;

    logger.info('Manual ATS analysis retry requested', { applicationId });

    const score = await ResumeAnalysisService.retryAnalysis(applicationId);

    return ApiResponse.success(res, 'ATS analysis completed successfully', {
      atsScore: score
    });
  });

  /**
   * Get ATS analysis status (Admin)
   * @route GET /api/applications/:applicationId/ats-status
   */
  getATSStatus = catchAsync(async (req, res) => {
    const { applicationId } = req.params;

    const status = await ResumeAnalysisService.getAnalysisStatus(applicationId);

    return ApiResponse.success(res, 'ATS status retrieved successfully', status);
  });

  /**
   * Update application status (Admin)
   * @route PATCH /api/applications/:applicationId/status
   */
  updateApplicationStatus = catchAsync(async (req, res) => {
    const { applicationId } = req.params;
    const { status } = req.body;

    const validStatuses = ['Under Review', 'Shortlisted', 'Rejected', 'Hired'];
    
    if (!status || !validStatuses.includes(status)) {
      return ApiResponse.error(res, 'Invalid status. Must be one of: ' + validStatuses.join(', '), 400);
    }

    const application = await Application.findById(applicationId);
    
    if (!application) {
      return ApiResponse.error(res, 'Application not found', 404);
    }

    application.status = status;
    await application.save();

    return ApiResponse.success(res, 'Application status updated successfully', {
      applicationId: application._id,
      status: application.status
    });
  });
}

export default new ApplicationController();
