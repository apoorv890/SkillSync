import JobService from '../services/JobService.js';
import logger from '../config/logger.js';
import catchAsync from '../utils/catchAsync.js';
import ApiResponse from '../utils/ApiResponse.js';
import { HTTP_STATUS } from '../config/constants.js';

class JobController {
  /**
   * Get all jobs
   * @route GET /api/jobs
   */
  getAllJobs = catchAsync(async (req, res) => {
    const filters = {
      status: req.query.status,
      department: req.query.department
    };

    const jobs = await JobService.getAllJobs(filters, req); // Pass req for logging context

    return ApiResponse.success(res, 'Jobs retrieved successfully', jobs);
  });

  /**
   * Get job by ID
   * @route GET /api/jobs/:id
   */
  getJobById = catchAsync(async (req, res) => {
    const { id } = req.params;

    const job = await JobService.getJobById(id, req); // Pass req for logging context

    return ApiResponse.success(res, 'Job retrieved successfully', job);
  });

  /**
   * Create new job (Admin)
   * @route POST /api/jobs
   */
  createJob = catchAsync(async (req, res) => {
    const job = await JobService.createJob(req.body, req);

    return ApiResponse.success(
      res, 
      'Job created successfully', 
      job, 
      HTTP_STATUS.CREATED
    );
  });

  /**
   * Update job (Admin)
   * @route PUT /api/jobs/:id
   */
  updateJob = catchAsync(async (req, res) => {
    const { id } = req.params;

    const job = await JobService.updateJob(id, req.body);

    return ApiResponse.success(res, 'Job updated successfully', job);
  });

  /**
   * Delete job (Admin)
   * @route DELETE /api/jobs/:id
   */
  deleteJob = catchAsync(async (req, res) => {
    const { id } = req.params;

    await JobService.deleteJob(id);

    return ApiResponse.success(res, 'Job deleted successfully');
  });

  /**
   * Search jobs
   * @route GET /api/jobs/search
   */
  searchJobs = catchAsync(async (req, res) => {
    const { q } = req.query;

    const jobs = await JobService.searchJobs(q);

    return ApiResponse.success(res, 'Search completed successfully', jobs);
  });
}

export default new JobController();
