import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  workType: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Internship'],
    default: 'Full-time'
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'closed'],
    default: 'draft'
  },
  summary: {
    type: String,
    required: function() {
      // Required for new jobs, optional if legacy description exists
      return !this.description;
    }
  },
  keyResponsibilities: {
    type: String,
    default: ''
  },
  requiredSkills: {
    type: String,
    required: function() {
      // Required for new jobs, optional if legacy requirements exists
      return !this.requirements;
    }
  },
  preferredSkills: {
    type: String,
    default: ''
  },
  aboutCompany: {
    type: String,
    default: ''
  },
  compensation: {
    type: String,
    default: ''
  },
  // Legacy fields for backward compatibility
  description: {
    type: String,
    default: ''
  },
  requirements: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  keywords: {
    type: [String],
    default: []
  },
  searchableTitle: {
    type: String,
    default: function() {
      return this.title ? this.title.toLowerCase() : '';
    }
  }
});

// Create text indexes for full-text search with weights
jobSchema.index({ 
  title: 'text', 
  location: 'text', 
  description: 'text', 
  requirements: 'text',
  keywords: 'text'
}, {
  weights: {
    title: 10,
    location: 5,
    keywords: 8,
    description: 3,
    requirements: 3
  },
  name: "JobTextIndex"
});

// Create regular indexes for exact matching
jobSchema.index({ title: 1 });
jobSchema.index({ searchableTitle: 1 });
jobSchema.index({ location: 1 });
jobSchema.index({ status: 1 });
jobSchema.index({ createdAt: -1 });

export default mongoose.model('Job', jobSchema);