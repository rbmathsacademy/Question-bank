import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import BatchStudent from '@/models/BatchStudent';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const batch = searchParams.get('batch');
        const school = searchParams.get('school');
        const mode = searchParams.get('mode');

        const query: any = { collegeName: { $exists: true, $nin: [null, ''] } };
        
        if (batch) {
            const escapedBatch = batch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.courses = { $regex: new RegExp(`^${escapedBatch}$`, 'i') };
        }
        
        if (school) {
            const escapedSchool = school.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.schoolName = { $regex: new RegExp(`^${escapedSchool}$`, 'i') };
        }

        if (mode) {
            query.modeOfClass = mode;
        }

        const colleges = await BatchStudent.distinct('collegeName', query);
        const sorted = (colleges as string[])
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b));
        return NextResponse.json({ colleges: sorted });
    } catch (error: any) {
        console.error('Failed to fetch colleges:', error);
        return NextResponse.json({ error: 'Failed to fetch colleges' }, { status: 500 });
    }
}
