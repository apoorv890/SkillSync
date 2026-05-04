import * as applicationsClient from './applicationsClient.js';
import * as authClient from './authClient.js';
import * as jobsClient from './jobsClient.js';
import ResumeParserService from './ResumeParserService.js';
import ATSScoreService from './ATSScoreService.js';
import logger from '@skillsync/shared/logger';
import { ApiError } from '@skillsync/shared/http';
import { HTTP_STATUS } from '@skillsync/shared/constants';
import { logNested, logCompact } from '../utils/loggerHelper.js';

class ResumeAnalysisService {
  async analyzeResume(applicationId, req = null) {
    try {
      logNested(req, 'Starting resume analysis');

      const application = await applicationsClient.getApplicationForWorker(applicationId);

      if (!application) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Application not found');
      }

      const userRow = await authClient.getUserById(application.userId);
      const job = await jobsClient.getJobById(application.jobId);

      if (!job) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Job not found');
      }

      if (!application.resume?.s3Key) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'No resume found for this application');
      }

      await applicationsClient.patchAtsProcessing(applicationId);

      logNested(req, 'Parsing resume from S3');

      const resumeText = await ResumeParserService.parseResumeFromS3(application.resume.s3Key);

      if (!resumeText || resumeText.trim().length === 0) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Failed to extract text from resume');
      }

      logCompact(req, 'Resume text extracted');

      const jobDetails = {
        title: job.title,
        department: job.department || '',
        location: job.location,
        description: job.description || job.summary || '',
        requirements: job.requirements || job.requiredSkills || ''
      };

      logNested(req, 'Generating ATS score with AI');

      const scoreData = await ATSScoreService.generateATSScore(resumeText, jobDetails);

      const candidateInfoUpdate =
        !application.candidateInfo?.name && userRow
          ? { name: userRow.fullName, email: userRow.email }
          : undefined;

      await applicationsClient.patchAtsComplete(applicationId, {
        score: scoreData.totalScore,
        breakdown: scoreData.breakdown,
        matchSummary: scoreData.matchSummary,
        ...(candidateInfoUpdate ? { candidateInfo: candidateInfoUpdate } : {})
      });

      logCompact(req, 'ATS analysis completed', { score: `${scoreData.totalScore}%` });

      return scoreData.totalScore;
    } catch (error) {
      logger.error('Error analyzing resume', {
        applicationId,
        error: error.message,
        stack: error.stack
      });

      try {
        await applicationsClient.patchAtsFailed(applicationId, error.message);
      } catch (updateError) {
        logger.error('Failed to update error status', {
          applicationId,
          error: updateError.message
        });
      }

      throw error;
    }
  }

  async retryAnalysis(applicationId) {
    logger.info('Retrying ATS analysis', { applicationId });

    await applicationsClient.patchAtsResetRetry(applicationId);

    return await this.analyzeResume(applicationId);
  }

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
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length
    });

    return results;
  }
}

export default new ResumeAnalysisService();
