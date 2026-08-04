import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Question from '@/models/Question';
import OnlineTest from '@/models/OnlineTest';
import BatchStudent from '@/models/BatchStudent';
import User from '@/models/User';

const FREE_BATCH = 'Class XI (Free batch) 2026-27';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        await dbConnect();

        const [questionCount, testCount, studentCount, enrollmentAgg, staff] = await Promise.all([
            Question.countDocuments(),
            OnlineTest.countDocuments({ status: 'deployed' }),
            // Unique students: count of documents excluding free-batch-only students
            BatchStudent.countDocuments({
                $nor: [{ courses: [FREE_BATCH] }]
            }),
            // Total enrollments: sum of courses.length per student, excluding the free batch course from the count
            BatchStudent.aggregate([
                { $match: { $nor: [{ courses: [FREE_BATCH] }] } },
                {
                    $project: {
                        // Filter out the free batch from each student's courses array, then count what remains
                        paidCourseCount: {
                            $size: {
                                $filter: {
                                    input: '$courses',
                                    as: 'c',
                                    cond: { $ne: ['$$c', FREE_BATCH] }
                                }
                            }
                        }
                    }
                },
                { $group: { _id: null, total: { $sum: '$paidCourseCount' } } }
            ]),
            User.find({
                role: { $in: ['manager', 'copy_checker'] }
            }).select('name phoneNumber role email createdAt').sort({ createdAt: -1 })
        ]);

        const totalEnrollments = enrollmentAgg[0]?.total ?? studentCount;

        return NextResponse.json({
            totalQuestions: questionCount,
            activeTests: testCount,
            totalStudents: studentCount,
            totalEnrollments,
            staff: staff || []
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
