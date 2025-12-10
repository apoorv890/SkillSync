import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Job from '../models/Job.js';
import connectDB from '../config/database.js';

dotenv.config();

async function testAnalytics() {
  try {
    await connectDB();
    
    const range = '7d';
    const days = 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
    
    console.log('\n=== ANALYTICS API TEST ===\n');
    console.log('Range:', range);
    console.log('Start Date:', startDate.toISOString());
    console.log('Today:', new Date().toISOString());
    
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
    
    console.log('\n=== Aggregated Data ===');
    console.log(JSON.stringify(jobsData, null, 2));
    
    // Create complete date range
    const completeData = [];
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setUTCDate(date.getUTCDate() - i);
      const dateString = date.toISOString().split('T')[0];
      
      const existingData = jobsData.find(item => item.date === dateString);
      
      completeData.push({
        date: dateString,
        jobsCreated: existingData ? existingData.jobsCreated : 0
      });
    }
    
    console.log('\n=== Complete Data (with zeros) ===');
    console.log(JSON.stringify(completeData, null, 2));
    
    const totalJobs = completeData.reduce((sum, item) => sum + item.jobsCreated, 0);
    console.log('\n=== Summary ===');
    console.log('Total Jobs:', totalJobs);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testAnalytics();
