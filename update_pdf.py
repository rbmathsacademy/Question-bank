import re

with open("app/admin/analytics/generateBatchSchoolReportPDF.ts", "rb") as f:
    content = f.read().decode("utf-8")

# Change headers
content = content.replace(
    "['Student Name', 'School', 'Exam', 'School Actual', 'System Prediction', 'Status', 'Insight']",
    "['Student Name', 'School', 'Exam', 'System Marks Prediction', 'School Exam Marks', 'Status', 'Insight']"
)

# Swap order in tableData.push
old_push = """                tableData.push([
                    student.name,
                    exam.schoolName || student.schoolName || '-',
                    exam.examName,
                    `${exam.percentage.toFixed(1)}%`,
                    prediction,
                    status,
                    insight
                ]);"""

new_push = """                tableData.push([
                    student.name,
                    exam.schoolName || student.schoolName || '-',
                    exam.examName,
                    prediction,
                    `${exam.percentage.toFixed(1)}%`,
                    status,
                    insight
                ]);"""

content = content.replace(old_push, new_push)

with open("app/admin/analytics/generateBatchSchoolReportPDF.ts", "w", encoding="utf-8") as f:
    f.write(content)
print("PDF updated")
