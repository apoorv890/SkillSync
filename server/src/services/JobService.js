import Job from '../models/Job.js';
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

  async createJob(jobData, req = null) {
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

  async deleteJob(jobId) {
    logger.info('Deleting job', { jobId });

    try {
      const job = await Job.findByIdAndDelete(jobId);

      if (!job) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Job not found');
      }

      logger.info('Job deleted successfully', { jobId });
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

