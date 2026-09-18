import sys

with open("app/api/student/dashboard-analytics/route.ts", "r", encoding="utf-8") as f:
    content = f.read()

# Add import
content = content.replace("import OfflineExam from '@/models/OfflineExam';", "import OfflineExam from '@/models/OfflineExam';\nimport SchoolExam from '@/models/SchoolExam';")

# Find the exact return statement for successful response
target = "return NextResponse.json({\n            student:"
replacement = """
        // 6. Get School Exam Data and correlate
        const schoolExams = await SchoolExam.find({ studentPhone: phoneNumber }).sort({ date: -1 }).lean();
        const formattedSchoolExams = schoolExams.map((exam: any) => {
            const examDate = new Date(exam.date);
            
            // Prior Online Tests
            const priorOnlineTests = formattedTests.filter((t: any) => 
                t.status === 'completed' && t.percentage !== null && new Date(t.deploymentDate) < examDate
            );
            const avgOnline = priorOnlineTests.length > 0 
                ? priorOnlineTests.reduce((sum: number, t: any) => sum + (t.percentage || 0), 0) / priorOnlineTests.length 
                : 0;

            // Prior Offline Exams
            const priorOfflineExams = formattedOfflineExams.filter((t: any) => 
                new Date(t.testDate) < examDate && typeof t.percentage === 'number'
            );
            const avgOffline = priorOfflineExams.length > 0
                ? priorOfflineExams.reduce((sum: number, t: any) => sum + (t.percentage || 0), 0) / priorOfflineExams.length
                : 0;

            // Prior Assignments
            const priorAssignments = formattedAssignments.filter((a: any) => 
                a.submittedAt && new Date(a.submittedAt) < examDate && a.quality
            );
            
            let assignScore = 0;
            if (priorAssignments.length > 0) {
                let total = 0;
                priorAssignments.forEach((a: any) => {
                    if (a.quality === 'GOOD') total += 100;
                    else if (a.quality === 'SATISFACTORY') total += 60;
                });
                assignScore = total / priorAssignments.length;
            }

            let systemAvg = 0;
            let weights = 0;
            if (priorOnlineTests.length > 0) { systemAvg += avgOnline * 0.4; weights += 0.4; }
            if (priorOfflineExams.length > 0) { systemAvg += avgOffline * 0.4; weights += 0.4; }
            if (priorAssignments.length > 0) { systemAvg += assignScore * 0.2; weights += 0.2; }
            
            if (weights > 0) {
                systemAvg = systemAvg / weights;
            }

            let syncStatus = 'IN_SYNC';
            if (exam.percentage > systemAvg + 10) syncStatus = 'IMPROVED';
            else if (exam.percentage < systemAvg - 10) syncStatus = 'DETERIORATED';

            return {
                ...exam,
                priorAvgOnline: parseFloat(avgOnline.toFixed(2)),
                priorAvgOffline: parseFloat(avgOffline.toFixed(2)),
                priorAssignmentScore: parseFloat(assignScore.toFixed(2)),
                priorSystemAvg: parseFloat(systemAvg.toFixed(2)),
                syncStatus
            };
        });

        return NextResponse.json({
            student:"""

content = content.replace(target, replacement)

content = content.replace("offlineExams: formattedOfflineExams\n        });", "offlineExams: formattedOfflineExams,\n            schoolExams: formattedSchoolExams\n        });")

with open("app/api/student/dashboard-analytics/route.ts", "w", encoding="utf-8") as f:
    f.write(content)
