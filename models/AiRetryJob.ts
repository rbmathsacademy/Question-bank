import mongoose from 'mongoose';

const AiRetryJobSchema = new mongoose.Schema({
    // The original ask-ai payload needed to retry
    batchId:        { type: String, required: true },
    studentId:      { type: String, required: true },
    text:           { type: String, required: true },
    imageUrl:       { type: String },          // Google Drive URL if any
    mimeType:       { type: String, default: 'image/jpeg' },
    doubtSessionId: { type: String },          // pre-assigned session id
    
    // Retry state
    attemptNumber:  { type: Number, default: 1 },   // 1, 2, 3
    maxAttempts:    { type: Number, default: 3 },
    nextRetryAt:    { type: Date,   required: true },
    status:         { type: String, enum: ['pending', 'success', 'failed'], default: 'pending', index: true },
    lastError:      { type: String },
}, { timestamps: true });

// Auto-delete completed/failed jobs after 24 hours
AiRetryJobSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 86400 });
AiRetryJobSchema.index({ status: 1, nextRetryAt: 1 });

const AiRetryJob = mongoose.models.AiRetryJob || mongoose.model('AiRetryJob', AiRetryJobSchema);
export default AiRetryJob;
