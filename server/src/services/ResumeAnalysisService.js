import Application from '../models/Application.js';
import ResumeParserService from './ResumeParserService.js';
import ATSScoreService from './ATSScoreService.js';
import logger from '../config/logger.js';
import ApiError from '../utils/ApiError.js';
import { HTTP_STATUS } from '../config/constants.js';
import { logNested, logCompact } from '../utils/loggerHelper.js';

class ResumeAnalysisService {
  /**
   * Analyze resume and generate ATS score
   * @param {string} applicationId - MongoDB application ID
   * @returns {Promise<number>} ATS score
   */
  async analyzeResume(applicationId, req = null) {
    try {
      logNested(req, 'Starting resume analysis');

      // 1. Fetch application with populated job and user data
      const application = await Application.findById(applicationId)
        .populate('jobId')
        .populate('userId', 'fullName email');

      if (!application) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Application not found');
      }

      if (!application.resume?.s3Key) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'No resume found for this application');
      }

      // 2. Update status to 'processing'
      application.atsScore.status = 'processing';
      await application.save();

      // 3. Parse resume from S3 (text in memory only, never stored)
      logNested(req, 'Parsing resume from S3');

      const resumeText = await ResumeParserService.parseResumeFromS3(
        application.resume.s3Key
      );

      if (!resumeText || resumeText.trim().length === 0) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Failed to extract text from resume');
      }

      logCompact(req, 'Resume text extracted');

      // 4. Prepare job details for AI analysis
      const jobDetails = {
        title: application.jobId.title,
        department: application.jobId.department,
        location: application.jobId.location,
        description: application.jobId.description,
        requirements: application.jobId.requirements
      };

      // 5. Generate detailed ATS score using AI (resume text never stored, only in memory)
      logNested(req, 'Generating ATS score with AI');

      const scoreData = await ATSScoreService.generateATSScore(
        resumeText,
        jobDetails
      );

      // 6. Update application with detailed score and candidate info
      application.atsScore.score = scoreData.totalScore;
      application.atsScore.breakdown = scoreData.breakdown;
      application.atsScore.matchSummary = scoreData.matchSummary;
      application.atsScore.analyzedAt = new Date();
      application.atsScore.status = 'completed';
      application.atsScore.error = null;

      // Update candidate info if not already set
      if (!application.candidateInfo?.name && application.userId) {
        application.candidateInfo = {
          name: application.userId.fullName,
          email: application.userId.email
        };
      }

      await application.save();

      logCompact(req, 'ATS analysis completed', { score: `${scoreData.totalScore}%` });

      // 7. Resume text is now garbage collected (never stored in DB)
      return scoreData.totalScore;

    } catch (error) {
      logger.error('Error analyzing resume', { 
        applicationId, 
        error: error.message,
        stack: error.stack 
      });

      // Update application with error status
      try {
        await Application.findByIdAndUpdate(applicationId, {
          'atsScore.status': 'failed',
          'atsScore.error': error.message
        });
      } catch (updateError) {
        logger.error('Failed to update error status', { 
          applicationId, 
          error: updateError.message 
        });
      }

      throw error;
    }
  }

  /**
   * Retry failed analysis
   * @param {string} applicationId - Application ID
   * @returns {Promise<number>} ATS score
   */
  async retryAnalysis(applicationId) {
    logger.info('Retrying ATS analysis', { applicationId });

    // Reset error state
    await Application.findByIdAndUpdate(applicationId, {
      'atsScore.status': 'pending',
      'atsScore.error': null
    });

    return await this.analyzeResume(applicationId);
  }

  /**
   * Analyze multiple applications (batch processing)
   * @param {string[]} applicationIds - Array of application IDs
   * @returns {Promise<Array>} Results array
   */
  async analyzeBatch(applicationIds) {
    logger.info('Starting batch analysis', { count: applicationIds.length });

    const results = [];

    for (const appId of applicationIds) {
      try {
        const score = await this.analyzeResume(appId);
        results.push({ 
          applicationId: appId, 
          success: true, 
          score 
        });
      } catch (error) {
        results.push({ 
          applicationId: appId, 
          success: false, 
          error: error.message 
        });
      }
    }

    logger.info('Batch analysis completed', { 
      total: applicationIds.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });

    return results;
  }

  /**
   * Get analysis status for an application
   * @param {string} applicationId - Application ID
   * @returns {Promise<object>} Status object
   */
  async getAnalysisStatus(applicationId) {
    const application = await Application.findById(applicationId)
      .select('atsScore');

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
}

export default new ResumeAnalysisService();
