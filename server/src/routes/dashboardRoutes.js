import express from 'express';
import mongoose from 'mongoose';
import * as jobsClient from '../services/jobsClient.js';
import Candidate from '../models/Candidate.js';
import Application from '../models/Application.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

function pickJobSummary(job) {
  if (!job) {
    return null;
  }
  return {
    _id: job._id,
    title: job.title,
    location: job.location,
    workType: job.workType,
    status: job.status,
    department: job.department
  };
}

async function attachJobsToApplications(apps) {
  const jobIds = [...new Set(apps.map((a) => String(a.jobId)).filter(Boolean))];
  const jobs = await jobsClient.getJobsByIds(jobIds);
  const map = new Map(jobs.map((j) => [String(j._id), j]));
  return apps.map((a) => ({
    ...a,
    jobId: pickJobSummary(map.get(String(a.jobId))) || a.jobId
  }));
}

async function attachJobsToCandidates(rows) {
  const jobIds = [...new Set(rows.map((c) => String(c.jobId)).filter(Boolean))];
  const jobs = await jobsClient.getJobsByIds(jobIds);
  const map = new Map(jobs.map((j) => [String(j._id), j]));
  return rows.map((c) => ({
    ...c,
    jobId: pickJobSummary(map.get(String(c.jobId))) || c.jobId
  }));
}

// Combined stats endpoint - returns data based on user role (MUST BE FIRST)
router.get('/stats', authenticate, async (req, res) => {
  try {
    const userRole = req.user?.role;
    
    if (userRole === 'admin') {
      const {
        totalJobs,
        activeJobs,
        jobsByStatus,
        recentJobs
      } = await jobsClient.getAdminDashboardJobStats();
      const totalCandidates = await Candidate.countDocuments();
      const interviewsScheduled = await Candidate.countDocuments({ interviewScheduled: true });

      return res.json({
        totalJobs,
        activeJobs,
        totalCandidates,
        interviewsScheduled,
        jobsByStatus,
        recentJobs
      });
    } else {
      // Return user stats
      const userId = req.userId || req.user._id;
      
      const totalApplications = await Application.countDocuments({ userId });
      
      // Pending = Under Review + applied
      const activeApplications = await Application.countDocuments({ 
        userId,
        status: { $in: ['Under Review', 'applied'] }
      });
      
      // Accepted = Shortlisted + Hired
      const acceptedApplications = await Application.countDocuments({ 
        userId,
        status: { $in: ['Shortlisted', 'Hired'] }
      });
      
      // Rejected
      const rejectedApplications = await Application.countDocuments({ 
        userId,
        status: 'Rejected'
      });
      
      const avgScoreResult = await Application.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        { $match: { 'atsScore.score': { $ne: null } } },
        {
          $group: {
            _id: null,
            avgScore: { $avg: '$atsScore.score' }
          }
        }
      ]);
      
      const averageScore = avgScoreResult.length > 0 
        ? Math.round(avgScoreResult[0].avgScore) 
        : 0;
      
      const applicationsByStatus = {
        applied: await Application.countDocuments({ userId, status: 'applied' }),
        underReview: await Application.countDocuments({ userId, status: 'Under Review' }),
        shortlisted: await Application.countDocuments({ userId, status: 'Shortlisted' }),
        hired: await Application.countDocuments({ userId, status: 'Hired' }),
        rejected: rejectedApplications,
        withdrawn: await Application.countDocuments({ userId, status: 'withdrawn' })
      };
      
      const recentApplicationsRaw = await Application.find({ userId })
        .sort({ appliedAt: -1 })
        .limit(10)
        .lean();

      const recentApplications = await attachJobsToApplications(recentApplicationsRaw);

      return res.json({
        totalApplications,
        activeApplications,
        acceptedApplications,
        rejectedApplications,
        averageScore,
        applicationsByStatus,
        recentApplications
      });
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// Admin Dashboard Stats
router.get('/admin', async (req, res) => {
  try {
    const {
      totalJobs,
      activeJobs,
      jobsByStatus,
      recentJobs
    } = await jobsClient.getAdminDashboardJobStats();

    const totalCandidates = await Candidate.countDocuments();

    const interviewsScheduled = await Candidate.countDocuments({ interviewScheduled: true });

    res.json({
      totalJobs,
      activeJobs,
      totalCandidates,
      interviewsScheduled,
      jobsByStatus,
      recentJobs
    });
  } catch (error) {
    console.error('Error fetching admin dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// User Dashboard Stats
router.get('/user', async (req, res) => {
  try {
    // For now, return mock data since we don't have user-specific applications
    // In a real app, you'd filter by user ID from authentication
    
    const totalApplications = await Candidate.countDocuments();
    const activeApplications = await Candidate.countDocuments({ 
      interviewScheduled: false 
    });
    const interviewsScheduled = await Candidate.countDocuments({ 
      interviewScheduled: true 
    });
    
    // Calculate average match score
    const avgScoreResult = await Candidate.aggregate([
      {
        $group: {
          _id: null,
          avgScore: { $avg: '$atsScore' }
        }
      }
    ]);
    
    const avgMatchScore = avgScoreResult.length > 0 
      ? Math.round(avgScoreResult[0].avgScore) 
      : 0;
    
    // Application status breakdown
    const applicationsByStatus = {
      pending: await Candidate.countDocuments({ interviewScheduled: false }),
      interviewed: await Candidate.countDocuments({ interviewScheduled: true }),
      rejected: 0 // This would need a status field in the Candidate model
    };
    
    const recentApplicationsRaw = await Candidate.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const recentApplications = await attachJobsToCandidates(recentApplicationsRaw);

    res.json({
      totalApplications,
      activeApplications,
      interviewsScheduled,
      avgMatchScore,
      applicationsByStatus,
      recentApplications
    });
  } catch (error) {
    console.error('Error fetching user dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

export default router;
