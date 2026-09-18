import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import BatchStudent from '@/models/BatchStudent';
import SchoolExam from '@/models/SchoolExam';

export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const batch = searchParams.get('batch');
        const schoolName = searchParams.get('schoolName');
        const examName = searchParams.get('examName');

        if (!batch) {
            return NextResponse.json({ error: 'Batch is required' }, { status: 400 });
        }

        const students = await BatchStudent.find({ courses: batch }).select('name phoneNumber schoolName board').lean();
        
        let query: any = { batch };
        if (schoolName) query.schoolName = schoolName;
        if (examName) query.examName = examName;

        const schoolExams = await SchoolExam.find(query).sort({ date: -1 }).lean();

        // Map students to their exams
        const results = students.map(student => {
            const studentExams = schoolExams.filter((e: any) => e.studentPhone === student.phoneNumber);
            return {
                ...student,
                exams: studentExams
            };
        });

        // Unique exam names for the filter dropdown
        const uniqueExams = await SchoolExam.distinct('examName', { batch });
        const uniqueSchools = await BatchStudent.distinct('schoolName', { courses: batch });

        return NextResponse.json({ results, uniqueExams, uniqueSchools });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const body = await req.json();
        const { studentId, studentPhone, batch, schoolName, examName, date, fullMarks, marksObtained } = body;

        if (!studentId || !studentPhone || !batch || !examName || !date || fullMarks == null || marksObtained == null) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const percentage = (marksObtained / fullMarks) * 100;

        const newExam = new SchoolExam({
            studentId, studentPhone, batch, schoolName, examName, date, fullMarks, marksObtained, percentage
        });

        await newExam.save();
        return NextResponse.json({ success: true, exam: newExam });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
