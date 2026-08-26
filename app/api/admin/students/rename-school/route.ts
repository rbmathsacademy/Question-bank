import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import BatchStudent from '@/models/BatchStudent';
import User from '@/models/User';

// POST - Bulk rename schoolName across students
export async function POST(req: NextRequest) {
    try {
        await dbConnect();

        const userEmail = req.headers.get('X-User-Email');
        if (!userEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await User.findOne({ email: userEmail });
        if (!user || !['admin', 'manager'].includes(user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { oldSchool, newSchool, studentIds } = body;

        if (!oldSchool || !newSchool?.trim()) {
            return NextResponse.json({ error: 'Old and new school names are required' }, { status: 400 });
        }
        if (oldSchool.trim() === newSchool.trim()) {
            return NextResponse.json({ error: 'Old and new school names are the same' }, { status: 400 });
        }

        const filter: any = { schoolName: oldSchool };
        // If specific student IDs are given, restrict to those
        if (Array.isArray(studentIds) && studentIds.length > 0) {
            filter._id = { $in: studentIds };
        }

        const result = await BatchStudent.updateMany(filter, { $set: { schoolName: newSchool.trim() } });

        return NextResponse.json({
            message: `School renamed from "${oldSchool}" to "${newSchool.trim()}" for ${result.modifiedCount} student(s)`,
            updatedCount: result.modifiedCount
        });
    } catch (error: any) {
        console.error('Failed to rename school:', error);
        return NextResponse.json({ error: 'Failed to rename school' }, { status: 500 });
    }
}
