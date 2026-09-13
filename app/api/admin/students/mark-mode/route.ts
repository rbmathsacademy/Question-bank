import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import dbConnect from '@/lib/db';
import BatchStudent from '@/models/BatchStudent';
import Student from '@/models/Student';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret-change-this-in-prod';
const key = new TextEncoder().encode(JWT_SECRET);

export async function POST(req: NextRequest) {
    try {
        const token = req.cookies.get('auth_token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { payload } = await jwtVerify(token, key);
        if (payload.role !== 'admin') {
            return NextResponse.json({ error: 'Only admins can mark mode' }, { status: 403 });
        }

        const { studentIds, mode } = await req.json();

        if (!Array.isArray(studentIds) || studentIds.length === 0) {
            return NextResponse.json({ error: 'No students selected' }, { status: 400 });
        }
        
        if (!['online', 'offline', ''].includes(mode)) {
            return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
        }

        await dbConnect();

        // Find students to update Student login accounts as well
        const students = await BatchStudent.find({ _id: { $in: studentIds } });

        const updated = await BatchStudent.updateMany(
            { _id: { $in: studentIds } },
            { $set: { modeOfClass: mode } }
        );

        // Update main Student records if they exist
        const emails = students.map(s => s.loginId?.toLowerCase()).filter(Boolean);
        if (emails.length > 0) {
            await Student.updateMany(
                { email: { $in: emails } },
                { $set: { modeOfClass: mode } }
            );
        }

        return NextResponse.json({ 
            success: true, 
            message: `Updated mode to ${mode || 'None'} for ${updated.modifiedCount} student(s)` 
        });

    } catch (error: any) {
        console.error("Mark Mode API Error:", error);
        return NextResponse.json({ error: 'Failed to update mode' }, { status: 500 });
    }
}
