import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import BatchStudent from '@/models/BatchStudent';
import User from '@/models/User';
import Student from '@/models/Student';

// POST - Bulk rename collegeName across students
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
        const { oldCollege, newCollege, studentIds } = body;

        if (!oldCollege || !newCollege?.trim()) {
            return NextResponse.json({ error: 'Old and new college names are required' }, { status: 400 });
        }
        if (oldCollege.trim() === newCollege.trim()) {
            return NextResponse.json({ error: 'Old and new college names are the same' }, { status: 400 });
        }

        const filter: any = { collegeName: oldCollege };
        // If specific student IDs are given, restrict to those
        if (Array.isArray(studentIds) && studentIds.length > 0) {
            filter._id = { $in: studentIds };
        }

        const result = await BatchStudent.updateMany(filter, { $set: { collegeName: newCollege.trim() } });
        
        // Also update in Student if they have linked accounts
        if (Array.isArray(studentIds) && studentIds.length > 0) {
            // Find students to get their loginIds
            const students = await BatchStudent.find({ _id: { $in: studentIds }, loginId: { $exists: true, $ne: '' } });
            const loginIds = students.map(s => s.loginId?.toLowerCase());
            if (loginIds.length > 0) {
                await Student.updateMany({ email: { $in: loginIds } }, { $set: { collegeName: newCollege.trim() } });
            }
        }

        return NextResponse.json({
            message: `College renamed from "${oldCollege}" to "${newCollege.trim()}" for ${result.modifiedCount} student(s)`,
            updatedCount: result.modifiedCount
        });
    } catch (error: any) {
        console.error('Failed to rename college:', error);
        return NextResponse.json({ error: 'Failed to rename college' }, { status: 500 });
    }
}
