import mongoose from 'mongoose';

const readCandidateSchema = new mongoose.Schema(
  {},
  {
    strict: false,
    collection: 'candidates'
  }
);

export default mongoose.models.SearchCandidateRead ||
  mongoose.model('SearchCandidateRead', readCandidateSchema);
