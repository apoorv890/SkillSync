import mongoose from 'mongoose';

const callSessionSchema = new mongoose.Schema(
  {
    callSid: { type: String, required: true, index: true },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      default: null
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      default: null
    },
    callerPhone: { type: String, default: null },
    status: {
      type: String,
      enum: ['initiated', 'in-progress', 'completed', 'failed'],
      default: 'initiated'
    },
    transcript: { type: String, default: null },
    outcome: { type: String, default: null },
    score: { type: Number, default: null },
    events: { type: [mongoose.Schema.Types.Mixed], default: [] },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

callSessionSchema.index({ applicationId: 1, createdAt: -1 });
callSessionSchema.index({ userId: 1, createdAt: -1 });
callSessionSchema.index({ jobId: 1, createdAt: -1 });

export default mongoose.model('CallSession', callSessionSchema);

