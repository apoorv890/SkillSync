import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Job from '../models/Job.js';
import connectDB from '@skillsync/shared/db';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

async function checkJobs() {
  try {
    await connectDB();
    
    const jobs = await Job.find({}).sort({ createdAt: -1 }).lean();
    
    console.log('\n=== DATABASE JOB ANALYSIS ===\n');
    console.log('Total jobs in database:', jobs.length);
    
    // Group by date
    const byDate = {};
    jobs.forEach(job => {
      const date = job.createdAt.toISOString().split('T')[0];
      if (!byDate[date]) {
        byDate[date] = [];
      }
      byDate[date].push(job);
    });
    
    console.log('\n=== Jobs by Date ===');
    Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([date, jobsOnDate]) => {
        console.log(`${date}: ${jobsOnDate.length} jobs`);
        jobsOnDate.forEach(job => {
          console.log(`  - ${job.title} (Created: ${job.createdAt.toISOString()})`);
        });
      });
    
    console.log('\n=== Recent 5 Jobs ===');
    jobs.slice(0, 5).forEach(job => {
      console.log(`${job.title}`);
      console.log(`  Created: ${job.createdAt.toISOString()}`);
      console.log(`  Date: ${job.createdAt.toISOString().split('T')[0]}`);
      console.log('');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkJobs();
