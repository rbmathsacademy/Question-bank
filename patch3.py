import re

with open("app/api/admin/analytics/batch/route.ts", "rb") as f:
    content = f.read().decode("utf-8")

content = content.replace(
    ".select('title totalMarks deployment.startTime excludedStudents')",
    ".select('title totalMarks deployment.startTime deployment.students excludedStudents')"
)

def replacer(match):
    return """const studentAttempts = attempts.filter((a: any) => a.studentPhone === student.phoneNumber);
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

# Because of unpredictable whitespace, let's just use string find and slicing
idx_start = content.find("const studentAttempts = attempts.filter")
if idx_start != -1:
    idx_end = content.find("});", idx_start) + 3
    if idx_end != 2:
        new_content = content[:idx_start] + replacer(None) + content[idx_end:]
        with open("app/api/admin/analytics/batch/route.ts", "w", encoding="utf-8") as f:
            f.write(new_content)
        print("Patched successfully")
    else:
        print("End not found")
else:
    print("Start not found")
