export const maxDuration = 60;

/**
 * POST /api/cron/retry-ai
 * Called by Vercel Cron every minute.
 * Picks up any pending AiRetryJob whose nextRetryAt <= now, runs Gemini,
 * and either saves the answer or schedules the next retry.
 *
 * Retry schedule: attempt 1 → 1 min later, attempt 2 → 2 min later, attempt 3 → 3 min later
 * After 3 failures the job is marked "failed" and no more retries are done.
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import AiRetryJob from '@/models/AiRetryJob';
import ChatMessage from '@/models/ChatMessage';
import { callGeminiWithFallback, driveUrlToBase64 } from '@/lib/geminiChat';

// Delay (in minutes) for each subsequent attempt
const RETRY_DELAYS_MINUTES = [0, 1, 2, 3]; // index = attemptNumber (1-based → use index 1,2,3)

export async function GET(req: NextRequest) {
    // Allow Vercel Cron (they send Authorization: Bearer <CRON_SECRET>) OR our own secret header
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Find all pending jobs that are due
    const now = new Date();
    const dueJobs = await AiRetryJob.find({
        status: 'pending',
        nextRetryAt: { $lte: now },
    }).limit(10); // Process up to 10 at once per cron tick

    if (dueJobs.length === 0) {
        return NextResponse.json({ processed: 0 });
    }

    let processed = 0;
    let succeeded = 0;
    let rescheduled = 0;
    let failed = 0;

    for (const job of dueJobs) {
        try {
            // Rebuild conversation history for the doubt session
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

            // Resolve image
            let imageBase64: string | undefined;
            if (job.imageUrl) {
                imageBase64 = (await driveUrlToBase64(job.imageUrl)) ?? undefined;
            }

            // Attempt Gemini
            const aiResponseText = await callGeminiWithFallback({
                text: job.text,
                imageBase64,
                mimeType: job.mimeType || 'image/jpeg',
                history,
            });

            // ✅ Success — save response
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
            succeeded++;
        } catch (err: any) {
            console.error(`[retry-ai] Job ${job._id} attempt ${job.attemptNumber} failed:`, err.message);

            const nextAttempt = job.attemptNumber + 1;
            if (nextAttempt > job.maxAttempts) {
                // Give up
                await job.updateOne({ status: 'failed', lastError: err.message });
                failed++;
            } else {
                // Schedule next retry
                const delayMinutes = RETRY_DELAYS_MINUTES[nextAttempt] ?? 3;
                await job.updateOne({
                    attemptNumber: nextAttempt,
                    nextRetryAt: new Date(Date.now() + delayMinutes * 60 * 1000),
                    lastError: err.message,
                });
                rescheduled++;
            }
        }
        processed++;
    }

    return NextResponse.json({ processed, succeeded, rescheduled, failed });
}
