import express from 'express';
import Job from '../models/Job.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get analytics data for jobs created over time
router.get('/', authenticate, async (req, res) => {
  try {
    const { range = '90d' } = req.query;
    
    // Calculate date range
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
    
    // Aggregate jobs by creation date (using UTC dates)
    const jobsData = await Job.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" }
          },
          jobsCreated: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          jobsCreated: 1
        }
      }
    ]);
    
    // Create a complete date range with zero values for missing dates
    const completeData = [];
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setUTCDate(date.getUTCDate() - i);
      const dateString = date.toISOString().split('T')[0];
      
      // Find if we have data for this date
      const existingData = jobsData.find(item => item.date === dateString);
      
      completeData.push({
        date: dateString,
        jobsCreated: existingData ? existingData.jobsCreated : 0
      });
    }
    
    res.json({
      data: completeData,
      totalJobs: completeData.reduce((sum, item) => sum + item.jobsCreated, 0),
      range: range
    });
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
});

export default router;
