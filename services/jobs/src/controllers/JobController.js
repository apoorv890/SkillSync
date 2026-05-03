import JobService from '../services/JobService.js';
import logger from '@skillsync/shared/logger';
import { catchAsync, ApiResponse } from '@skillsync/shared/http';
import { HTTP_STATUS } from '@skillsync/shared/constants';

class JobController {
  getAllJobs = catchAsync(async (req, res) => {
    const filters = {
      status: req.query.status,
      department: req.query.department
    };

    const jobs = await JobService.getAllJobs(filters, req);

    return ApiResponse.success(res, 'Jobs retrieved successfully', jobs);
  });

  getJobById = catchAsync(async (req, res) => {
    const { id } = req.params;

    const job = await JobService.getJobById(id, req);

    return ApiResponse.success(res, 'Job retrieved successfully', job);
  });

  createJob = catchAsync(async (req, res) => {
    const job = await JobService.createJob(req.body, req);

    return ApiResponse.success(res, 'Job created successfully', job, HTTP_STATUS.CREATED);
  });

  updateJob = catchAsync(async (req, res) => {
    const { id } = req.params;

    const job = await JobService.updateJob(id, req.body);

    return ApiResponse.success(res, 'Job updated successfully', job);
  });

  deleteJob = catchAsync(async (req, res) => {
    const { id } = req.params;

    await JobService.deleteJob(id);

    return ApiResponse.success(res, 'Job deleted successfully');
  });

  searchJobs = catchAsync(async (req, res) => {
    const { q } = req.query;

    const jobs = await JobService.searchJobs(q);

    return ApiResponse.success(res, 'Search completed successfully', jobs);
  });
}

export default new JobController();
