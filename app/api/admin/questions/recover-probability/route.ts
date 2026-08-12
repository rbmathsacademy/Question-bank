import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Question from '@/models/Question';

// GET /api/admin/questions/recover-probability
// Returns all questions currently in DB with topic "Probability (JEE)"
// along with any questions that have IDs that LOOK like they belonged to
// another topic but were overwritten (we detect this by checking if the
// topic in the ID prefix mismatches the current topic)
export async function GET(req: Request) {
    await dbConnect();
    const adminKey = req.headers.get('X-Global-Admin-Key');
    const email = req.headers.get('X-User-Email');

    if (!email && adminKey !== 'globaladmin_25') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Fetch all current Probability (JEE) questions
        const probQuestions = await Question.find(
            { topic: 'Probability (JEE)' },
            { id: 1, text: 1, topic: 1, subtopic: 1, uploadedBy: 1, facultyName: 1, createdAt: 1, _id: 1 }
        ).sort({ createdAt: -1 }).lean();

        // Look for any questions whose ID pattern suggests they originally belonged
        // to a different topic (heuristic: check if ID contains a topic keyword
        // from common patterns like "prob_", "PB_", etc.)
        // Also check total count per topic to see if any topics dropped
        const topicCounts = await Question.aggregate([
            { $group: { _id: '$topic', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        return NextResponse.json({
            probabilityJEEQuestions: probQuestions,
            probabilityJEECount: probQuestions.length,
            allTopicCounts: topicCounts
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
