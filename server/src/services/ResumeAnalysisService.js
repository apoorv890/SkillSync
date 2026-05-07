import ResumeParserService from './ResumeParserService.js';
import ATSScoreService from './ATSScoreService.js';
import logger from '../utils/logger.js';
import { ApiError, HTTP_STATUS } from '../utils/http.js';
import Application from '../models/Application.js';
import Job from '../models/Job.js';
import User from '../models/User.js';

class ResumeAnalysisService {
  async analyze(applicationId, req = null) {
    try {
      const application = await Application.findById(applicationId).lean();

      if (!application) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Application not found');
      }

      const job = await Job.findById(application.jobId).lean();
      if (!job) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Job not found');
      }

      if (!application.resume?.s3Key) {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          'No resume found for this application'
        );
      }

      await Application.updateOne(
        { _id: applicationId },
        {
          $set: {
            'atsScore.status': 'processing',
            'atsScore.error': null
          }
        }
      );

      const resumeText = await ResumeParserService.parseResumeFromS3(
        application.resume.s3Key
      );

      if (!resumeText || resumeText.trim().length === 0) {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          'Failed to extract text from resume'
        );
      }

      const jobDetails = {
        title: job.title,
        department: job.department || '',
        location: job.location,
        description: job.description || job.summary || '',
        requirements: job.requirements || job.requiredSkills || ''
      };

      const scoreData = await ATSScoreService.generateATSScore(resumeText, jobDetails);

      const userRow = await User.findById(application.userId).lean();
      const candidateInfoUpdate =
        !application.candidateInfo?.name && userRow
          ? { name: userRow.fullName, email: userRow.email }
          : undefined;

      await Application.updateOne(
        { _id: applicationId },
        {
          $set: {
            'atsScore.score': scoreData.totalScore,
            'atsScore.breakdown': scoreData.breakdown,
            'atsScore.matchSummary': scoreData.matchSummary,
            'atsScore.analyzedAt': new Date(),
            'atsScore.status': 'completed',
            'atsScore.error': null,
            ...(candidateInfoUpdate ? { candidateInfo: candidateInfoUpdate } : {})
          }
        }
      );

      return scoreData.totalScore;
    } catch (error) {
      logger.error('Error analyzing resume', {
        applicationId,
        error: error.message,
        stack: error.stack
      });

      try {
        await Application.updateOne(
          { _id: applicationId },
          {
            $set: {
              'atsScore.status': 'failed',
              'atsScore.error': error.message
            }
          }
        );
      } catch (updateError) {
        logger.error('Failed to update error status', {
          applicationId,
          error: updateError.message
        });
      }

      throw error;
    }
  }
}

export default new ResumeAnalysisService();

