import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import dbConnect from '@/lib/db';
import BatchStudent from '@/models/BatchStudent';
import Student from '@/models/Student';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret-change-this-in-prod';
const key = new TextEncoder().encode(JWT_SECRET);

export async function POST(req: NextRequest) {
    const token = req.cookies.get('auth_token')?.value;

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { payload } = await jwtVerify(token, key);
        if (payload.role !== 'student') {
            return NextResponse.json({ error: 'Only students can update profile' }, { status: 403 });
        }

        const body = await req.json();
        const { collegeName } = body;

        if (!collegeName) {
            return NextResponse.json({ error: 'College name is required' }, { status: 400 });
        }

        await dbConnect();
        const rawId = payload.phoneNumber || payload.userId;
        const searchId = typeof rawId === 'string' ? rawId.trim() : rawId;

        const batchStudent = await BatchStudent.findOneAndUpdate(
            { phoneNumber: searchId },
            { collegeName },
            { new: true }
        );

        if (!batchStudent) {
            return NextResponse.json({ error: 'Student not found in batch records' }, { status: 404 });
        }

        if (batchStudent.loginId) {
            await Student.findOneAndUpdate(
                { email: batchStudent.loginId.toLowerCase() },
                { collegeName }
            );
        }

        return NextResponse.json({ success: true, collegeName: batchStudent.collegeName });
    } catch (error) {
        console.error("Update College Profile API Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
