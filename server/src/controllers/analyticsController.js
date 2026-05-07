import * as jobsClient from '../services/jobsClient.js';

export async function getAnalytics(req, res) {
  try {
    const { range = '90d' } = req.query;
    const payload = await jobsClient.getJobsAnalyticsTimeseries(range);
    res.json(payload);
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
}

