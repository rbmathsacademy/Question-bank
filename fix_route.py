import os

content = """import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import SchoolExam from '@/models/SchoolExam';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const { id } = await params;
        await SchoolExam.findByIdAndDelete(id);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
"""
with open("app/api/admin/school-exams/[id]/route.ts", "w", encoding="utf-8") as f:
    f.write(content)
