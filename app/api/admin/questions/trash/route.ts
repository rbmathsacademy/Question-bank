import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Question from '@/models/Question';

const GLOBAL_ADMIN_KEY = 'globaladmin_25';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    await dbConnect();
    const email = req.headers.get('X-User-Email');
    const adminKey = req.headers.get('X-Global-Admin-Key');

    if (!email && adminKey !== GLOBAL_ADMIN_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Auto-purge old trash (older than 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        await Question.deleteMany({ deleted: true, deletedAt: { $lt: thirtyDaysAgo } });

        const questions = await Question.find(
            { deleted: true },
            { id: 1, text: 1, topic: 1, subtopic: 1, deletedAt: 1, uploadedBy: 1 }
        ).sort({ deletedAt: -1 }).lean();

        return NextResponse.json(questions);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    await dbConnect();
    const email = req.headers.get('X-User-Email');
    const adminKey = req.headers.get('X-Global-Admin-Key');

    if (!email && adminKey !== GLOBAL_ADMIN_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { ids, action } = body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
        }

        if (action === 'restore') {
            await Question.updateMany(
                { id: { $in: ids } },
                { $set: { deleted: false, deletedAt: null } }
            );
            return NextResponse.json({ message: 'Questions restored successfully' });
        } else if (action === 'purge') {
            await Question.deleteMany({ id: { $in: ids } });
            return NextResponse.json({ message: 'Questions permanently deleted' });
        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
