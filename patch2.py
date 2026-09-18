with open("app/api/admin/analytics/batch/route.ts", "rb") as f:
    content = f.read().decode("utf-8")

content = content.replace(
    ".select('title totalMarks deployment.startTime excludedStudents')",
    ".select('title totalMarks deployment.startTime deployment.students excludedStudents')"
)

old_block = """            const studentAttempts = attempts.filter((a: any) => a.studentPhone === student.phoneNumber);
            const studentTests = tests.filter((t: any) => {
                const excluded: string[] = (t as any).excludedStudents || [];
                return !excluded.includes(student.phoneNumber);
            });"""

new_block = """            const studentAttempts = attempts.filter((a: any) => a.studentPhone === student.phoneNumber);
            const studentTests = tests.filter((t: any) => {
                const excluded: string[] = (t as any).excludedStudents || [];
                if (excluded.includes(student.phoneNumber)) return false;
                
                const targetStudents = (t.deployment && t.deployment.students) ? t.deployment.students : [];
                if (targetStudents.length > 0) {
                    const isTargeted = targetStudents.some((ts: any) => ts.phoneNumber === student.phoneNumber);
                    if (!isTargeted) return false;
                }
                return true;
            });"""

content = content.replace(old_block, new_block)

with open("app/api/admin/analytics/batch/route.ts", "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
