import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Question from '@/models/Question';

// POST /api/admin/questions/check-id-clash
// Body: { ids: string[] }
// Returns: { clashes: Question[] } — existing DB questions whose IDs are in the incoming list
export async function POST(req: Request) {
    await dbConnect();
    const email = req.headers.get('X-User-Email');
    const adminKey = req.headers.get('X-Global-Admin-Key');

    if (!email && adminKey !== 'globaladmin_25') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { ids } = await req.json();
        if (!Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ clashes: [] });
        }

        // Find all questions in DB whose id matches any incoming id
        const existing = await Question.find(
            { id: { $in: ids } },
            { id: 1, text: 1, topic: 1, subtopic: 1, uploadedBy: 1, facultyName: 1, _id: 0 }
        ).lean();

        return NextResponse.json({ clashes: existing });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
