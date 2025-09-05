import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Job from '../models/Job.js';
import connectDB from '../config/database.js';

dotenv.config();

async function removeDuplicates() {
  try {
    await connectDB();
    
    console.log('\n=== REMOVING DUPLICATE JOBS ===\n');
    
    // Get all jobs from Dec 3, sorted by creation time (newest first)
    const dec3Jobs = await Job.find({
      createdAt: {
        $gte: new Date('2025-12-03T00:00:00.000Z'),
        $lt: new Date('2025-12-04T00:00:00.000Z')
      }
    }).sort({ createdAt: -1 }).lean();
    
    console.log(`Total jobs on Dec 3: ${dec3Jobs.length}`);
    
    // The 14 newest jobs are the duplicates (created at 12:15:08)
    const duplicatesToRemove = dec3Jobs.slice(0, 14);
    
    console.log('\nJobs to be removed (14 most recent):');
    duplicatesToRemove.forEach((job, index) => {
      console.log(`${index + 1}. ${job.title} - Created: ${job.createdAt.toISOString()}`);
    });
    
    // Get the IDs to remove
    const idsToRemove = duplicatesToRemove.map(job => job._id);
    
    // Remove the duplicates
    const result = await Job.deleteMany({
      _id: { $in: idsToRemove }
    });
    
    console.log(`\n✅ Successfully removed ${result.deletedCount} duplicate jobs`);
    
    // Verify the final count
    const finalCount = await Job.countDocuments();
    const dec3FinalCount = await Job.countDocuments({
      createdAt: {
        $gte: new Date('2025-12-03T00:00:00.000Z'),
        $lt: new Date('2025-12-04T00:00:00.000Z')
      }
    });
    
    console.log(`\n=== FINAL STATUS ===`);
    console.log(`Total jobs in database: ${finalCount}`);
    console.log(`Jobs on Dec 3: ${dec3FinalCount}`);
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

removeDuplicates();
