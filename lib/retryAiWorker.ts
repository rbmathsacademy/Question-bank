import AiRetryJob from '@/models/AiRetryJob';
import ChatMessage from '@/models/ChatMessage';
import { callGeminiWithFallback, driveUrlToBase64 } from '@/lib/geminiChat';

const RETRY_DELAYS_MINUTES = [0, 1, 2, 3]; // attempt 1 -> 1min, attempt 2 -> 2min, attempt 3 -> 3min

/**
 * Checks and processes any due AI retry jobs.
 * Uses atomic findOneAndUpdate to prevent duplicate concurrent runs.
 */
export async function processDueAiRetries(batchId?: string) {
    try {
        const now = new Date();
        const query: any = {
            status: 'pending',
            nextRetryAt: { $lte: now },
        };
        if (batchId) {
            query.batchId = batchId;
        }

        const dueJobs = await AiRetryJob.find(query).limit(5);
        if (!dueJobs || dueJobs.length === 0) return;

        for (const rawJob of dueJobs) {
            // Atomic lock: mark as processing so no other poll takes it
            const job = await AiRetryJob.findOneAndUpdate(
                { _id: rawJob._id, status: 'pending' },
                { $set: { status: 'processing' } },
                { new: true }
            );
            if (!job) continue;

            try {
                // Reconstruct conversation history for this doubt session
                const history: any[] = [];
                if (job.doubtSessionId) {
                    const historyMessages = await ChatMessage.find({
                        batchId: job.batchId,
                        'doubtMetadata.doubtSessionId': job.doubtSessionId,
                    }).sort({ createdAt: 1 });

                    for (const msg of historyMessages) {
                        if (msg.type === 'text' && msg.content) {
                            history.push({
                                role: msg.senderId === job.studentId ? 'user' : 'model',
                                parts: [{ text: msg.content }],
                            });
                        }
                    }
                }

                let imageBase64: string | undefined;
                if (job.imageUrl) {
                    imageBase64 = (await driveUrlToBase64(job.imageUrl)) ?? undefined;
                }

                const aiResponseText = await callGeminiWithFallback({
                    text: job.text,
                    imageBase64,
                    mimeType: job.mimeType || 'image/jpeg',
                    history,
                });

                // Post AI response into chat
                await ChatMessage.create({
                    batchId: job.batchId,
                    senderId: 'ai_assistant',
                    senderName: "RB Sir's Math-AI Assistant",
                    senderRole: 'admin',
                    content: aiResponseText,
                    type: 'text',
                    isAiResponse: true,
                    doubtMetadata: {
                        targetStudentId: job.studentId,
                        status: 'pending',
                        doubtSessionId: job.doubtSessionId,
                    },
                });

                await job.updateOne({ status: 'success' });
            } catch (err: any) {
                console.error(`[retry-ai] Job ${job._id} attempt ${job.attemptNumber} failed:`, err.message);
                const nextAttempt = job.attemptNumber + 1;
                if (nextAttempt > job.maxAttempts) {
                    await job.updateOne({ status: 'failed', lastError: err.message });
                } else {
                    const delayMinutes = RETRY_DELAYS_MINUTES[nextAttempt] ?? 3;
                    await job.updateOne({
                        status: 'pending',
                        attemptNumber: nextAttempt,
                        nextRetryAt: new Date(Date.now() + delayMinutes * 60 * 1000),
                        lastError: err.message,
                    });
                }
            }
        }
    } catch (err) {
        console.error('Error in processDueAiRetries:', err);
    }
}
