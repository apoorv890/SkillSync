import Job from '../models/Job.js';
import Application from '../models/Application.js';
import S3Service from './S3Service.js';
import logger from '../utils/logger.js';
import { logCompact, logNested } from '../utils/loggerHelper.js';
import { ApiError, HTTP_STATUS } from '../utils/http.js';
import { JOB_STATUS } from '../utils/constants.js';
import {
  sanitizeJobStatus,
  sanitizeDepartment,
  sanitizeLocation
} from '../utils/querySanitizer.js';

class JobService {
  async getAllJobs(filters = {}, req = null) {
    logNested(req, 'Fetching all jobs', { filters: JSON.stringify(filters) });

    try {
      const query = {};

      const sanitizedStatus = sanitizeJobStatus(filters.status);
      if (sanitizedStatus) {
        query.status = sanitizedStatus;
      }

      const sanitizedDepartment = sanitizeDepartment(filters.department);
      if (sanitizedDepartment) {
        query.department = sanitizedDepartment;
      }

      const jobs = await Job.find(query).sort({ createdAt: -1 });

      logCompact(req, `Found ${jobs.length} jobs`, { count: jobs.length });
      return jobs;
    } catch (error) {
      const prefix = req?.logPrefix || '';
      logger.error(`${prefix}Error fetching jobs: ${error.message}`, {
        error: error.stack
      });
      throw error;
    }
  }

  async getJobById(jobId, req = null) {
    logNested(req, 'Fetching job by ID', { jobId });

    try {
      const job = await Job.findById(jobId);

      if (!job) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Job not found');
      }

      logCompact(req, 'Job found', { jobId, title: job.title });
      return job;
    } catch (error) {
      const prefix = req?.logPrefix || '';
      logger.error(`${prefix}Error fetching job: ${error.message}`, {
        jobId,
        error: error.stack
      });
      throw error;
    }
  }

  async createJob(jobData, recruiterId = null, req = null) {
    logNested(req, 'Creating new job', { title: jobData.title });

    try {
      const {
        title,
        location,
        workType,
        status,
        summary,
        keyResponsibilities,
        requiredSkills,
        preferredSkills,
        aboutCompany,
        compensation
      } = jobData;

      if (!title || !location || !summary || !requiredSkills) {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          'Missing required fields: title, location, summary, and requiredSkills are required'
        );
      }

      const job = await Job.create({
        recruiterId: recruiterId || null,
        title,
        location,
        workType: workType || 'Full-time',
        status: status || JOB_STATUS.ACTIVE,
        summary,
        keyResponsibilities: keyResponsibilities || '',
        requiredSkills,
        preferredSkills: preferredSkills || '',
        aboutCompany: aboutCompany || '',
        compensation: compensation || ''
      });

      logCompact(req, 'Job created successfully', { jobId: job._id });
      return job;
    } catch (error) {
      logger.error(`Error creating job: ${error.message}`, { error: error.stack });
      throw error;
    }
  }

  async updateJob(jobId, updateData) {
    logger.info('Updating job', { jobId });

    try {
      const job = await Job.findByIdAndUpdate(jobId, updateData, {
        new: true,
        runValidators: true
      });

      if (!job) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Job not found');
      }

      logger.info('Job updated successfully', { jobId });
      return job;
    } catch (error) {
      logger.error(`Error updating job: ${error.message}`, {
        jobId,
        error: error.stack
      });
      throw error;
    }
  }

  /**
   * Hard-deletes a job and every Application against it (and their S3 resumes),
   * so nothing about it remains for either the admin or the applicant to see.
   * Works regardless of the job's status. S3 cleanup is best-effort per file —
   * one failed delete doesn't block the rest, since leaving an orphaned S3
   * object is far less bad than aborting a user-requested deletion partway.
   */
  async deleteJob(jobId) {
    logger.info('Deleting job', { jobId });

    try {
      const job = await Job.findById(jobId);
      if (!job) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Job not found');
      }

      const applications = await Application.find({ jobId }).select('resume.s3Key').lean();

      for (const application of applications) {
        const s3Key = application.resume?.s3Key;
        if (!s3Key) continue;
        try {
          await S3Service.deleteFile(s3Key);
        } catch (error) {
          logger.error(`Failed to delete resume from S3 while deleting job`, {
            jobId,
            applicationId: application._id,
            s3Key,
            error: error.message
          });
        }
      }

      await Application.deleteMany({ jobId });
      await Job.findByIdAndDelete(jobId);

      logger.info('Job and related applications deleted successfully', {
        jobId,
        applicationsDeleted: applications.length
      });
    } catch (error) {
      logger.error(`Error deleting job: ${error.message}`, {
        jobId,
        error: error.stack
      });
      throw error;
    }
  }

  async searchJobs(searchTerm) {
    logger.info('Searching jobs', { searchTerm });

    try {
      const jobs = await Job.find({
        $text: { $search: searchTerm }
      }).sort({ createdAt: -1 });

      logger.info(`Found ${jobs.length} matching jobs`, { searchTerm });
      return jobs;
    } catch (error) {
      logger.error(`Error searching jobs: ${error.message}`, {
        searchTerm,
        error: error.stack
      });
      throw error;
    }
  }
}

export default new JobService();

