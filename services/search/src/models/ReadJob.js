import mongoose from 'mongoose';

const readJobSchema = new mongoose.Schema(
  {},
  {
    strict: false,
    collection: 'jobs'
  }
);

export default mongoose.models.SearchJobRead ||
  mongoose.model('SearchJobRead', readJobSchema);
