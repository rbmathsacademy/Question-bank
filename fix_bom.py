import os

files = [
    "app/admin/analytics/SchoolPerformancePanel.tsx",
    "app/admin/analytics/page.tsx",
    "app/student/performance-overview/page.tsx",
    "app/student/page.tsx",
    "models/SchoolExam.ts",
    "app/api/admin/school-exams/route.ts",
    "app/api/admin/school-exams/[id]/route.ts",
    "app/api/student/dashboard-analytics/route.ts"
]

for file_path in files:
    with open(file_path, "rb") as f:
        raw = f.read()
    
    if raw.startswith(b'\xff\xfe'):
        content = raw.decode("utf-16le")
    elif raw.startswith(b'\xef\xbb\xbf'):
        content = raw.decode("utf-8-sig")
    else:
        try:
            content = raw.decode("utf-8")
        except:
            content = raw.decode("windows-1252")
            
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
        
    print(f"Fixed {file_path}")
