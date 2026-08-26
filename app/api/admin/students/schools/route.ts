import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import BatchStudent from '@/models/BatchStudent';

export const dynamic = 'force-dynamic';

// GET - Return distinct school names for filter dropdowns
export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const schools = await BatchStudent.distinct('schoolName', { schoolName: { $exists: true, $nin: [null, ''] } });
        const sorted = (schools as string[])
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b));
        return NextResponse.json({ schools: sorted });
    } catch (error: any) {
        console.error('Failed to fetch schools:', error);
        return NextResponse.json({ error: 'Failed to fetch schools' }, { status: 500 });
    }
}
