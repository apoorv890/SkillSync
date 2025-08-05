import mongoose from 'mongoose';

const candidateSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  atsScore: {
    type: Number,
    required: true
  },
  matchExplanation: {
    type: String,
    default: ''
  },
  resumeText: {
    type: String,
    default: ''
  },
  resumeUrl: {
    type: String,
    required: true
  },
  callScheduled: {
    type: Boolean,
    default: false
  },
  scheduledAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  skills: {
    type: [String],
    default: []
  },
  searchableName: {
    type: String,
    default: function() {
      return this.name ? this.name.toLowerCase() : '';
    }
  }
});

// Create text indexes for full-text search with weights
candidateSchema.index({ 
  name: 'text', 
  email: 'text', 
  resumeText: 'text',
  matchExplanation: 'text',
  skills: 'text'
}, {
  weights: {
    name: 10,
    email: 8,
    skills: 7,
    resumeText: 5,
    matchExplanation: 3
  },
  name: "CandidateTextIndex"
});

// Create regular indexes for exact matching and filtering
candidateSchema.index({ jobId: 1 });
candidateSchema.index({ name: 1 });
candidateSchema.index({ searchableName: 1 });
candidateSchema.index({ email: 1 });
candidateSchema.index({ atsScore: 1 });
candidateSchema.index({ createdAt: -1 });
candidateSchema.index({ callScheduled: 1 });

export default mongoose.model('Candidate', candidateSchema);