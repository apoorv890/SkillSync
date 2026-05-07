import Job from '../models/Job.js';
import Candidate from '../models/Candidate.js';

export async function getJobsByIds(ids) {
  if (!ids?.length) {
    return [];
  }
  return Job.find({ _id: { $in: ids } }).lean();
}

export async function getAdminDashboardJobStats() {
  const totalJobs = await Job.countDocuments();
  const activeJobs = await Job.countDocuments({ status: 'active' });
  const jobsByStatus = {
    active: await Job.countDocuments({ status: 'active' }),
    draft: await Job.countDocuments({ status: 'draft' }),
    closed: await Job.countDocuments({ status: 'closed' })
  };
  const recentJobs = await Job.aggregate([
    {
      $lookup: {
        from: 'candidates',
        localField: '_id',
        foreignField: 'jobId',
        as: 'candidates'
      }
    },
    {
      $project: {
        title: 1,
        location: 1,
        status: 1,
        createdAt: 1,
        candidateCount: { $size: '$candidates' }
      }
    },
    { $sort: { createdAt: -1 } },
    { $limit: 10 }
  ]);
  return { totalJobs, activeJobs, jobsByStatus, recentJobs };
}

export async function getJobsAnalyticsTimeseries(range = '90d') {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const jobsData = await Job.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' }
        },
        jobsCreated: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        date: '$_id',
        jobsCreated: 1
      }
    }
  ]);

  const completeData = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - i);
    const dateString = date.toISOString().split('T')[0];
    const existingData = jobsData.find((item) => item.date === dateString);
    completeData.push({
      date: dateString,
      jobsCreated: existingData ? existingData.jobsCreated : 0
    });
  }

  return {
    data: completeData,
    totalJobs: completeData.reduce((sum, item) => sum + item.jobsCreated, 0),
    range
  };
}

export async function getCandidateCountByJobIds(jobIds) {
  if (!jobIds?.length) {
    return new Map();
  }
  const agg = await Candidate.aggregate([
    { $match: { jobId: { $in: jobIds } } },
    { $group: { _id: '$jobId', count: { $sum: 1 } } }
  ]);
  return new Map(agg.map((r) => [String(r._id), r.count]));
}

