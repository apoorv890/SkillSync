import express from 'express';
import mongoose from 'mongoose';
import Job from '../models/Job.js';
import Candidate from '../models/Candidate.js';
import Application from '../models/Application.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Combined stats endpoint - returns data based on user role (MUST BE FIRST)
router.get('/stats', authenticate, async (req, res) => {
  try {
    const userRole = req.user?.role;
    
    if (userRole === 'admin') {
      // Return admin stats
      const totalJobs = await Job.countDocuments();
      const activeJobs = await Job.countDocuments({ status: 'active' });
      const totalCandidates = await Candidate.countDocuments();
      const interviewsScheduled = await Candidate.countDocuments({ interviewScheduled: true });
      
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
            department: 1,
            status: 1,
            createdAt: 1,
            candidateCount: { $size: '$candidates' }
          }
        },
        { $sort: { createdAt: -1 } },
        { $limit: 10 }
      ]);
      
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
      const userId = req.user.id;
      
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
      
      const recentApplications = await Application.find({ userId })
        .populate('jobId', 'title location workType status')
        .sort({ appliedAt: -1 })
        .limit(10)
        .lean();
      
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
    // Get total jobs count
    const totalJobs = await Job.countDocuments();
    
    // Get active jobs count
    const activeJobs = await Job.countDocuments({ status: 'active' });
    
    // Get total candidates count
    const totalCandidates = await Candidate.countDocuments();
    
    // Get interviews scheduled count
    const interviewsScheduled = await Candidate.countDocuments({ interviewScheduled: true });
    
    // Get jobs by status
    const jobsByStatus = {
      active: await Job.countDocuments({ status: 'active' }),
      draft: await Job.countDocuments({ status: 'draft' }),
      closed: await Job.countDocuments({ status: 'closed' })
    };
    
    // Get recent jobs with candidate count
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
          department: 1,
          status: 1,
          createdAt: 1,
          candidateCount: { $size: '$candidates' }
        }
      },
      { $sort: { createdAt: -1 } },
      { $limit: 10 }
    ]);
    
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
    
    // Get recent applications
    const recentApplications = await Candidate.find()
      .populate('jobId', 'title department company')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    
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
