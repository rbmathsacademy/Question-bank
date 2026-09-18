import re

with open("app/admin/analytics/SchoolPerformancePanel.tsx", "rb") as f:
    content = f.read().decode("utf-8")

old_block = """        if (priorOnlineTests.length > 0) { systemAvg += avgOnline * 0.4; weights += 0.4; }
        if (priorOfflineExams.length > 0) { systemAvg += avgOffline * 0.4; weights += 0.4; }
        if (priorAssignments.length > 0) { systemAvg += assignScore * 0.2; weights += 0.2; }"""

new_block = """        if (priorOnlineTests.length > 0) { systemAvg += avgOnline * 0.35; weights += 0.35; }
        if (priorOfflineExams.length > 0) { systemAvg += avgOffline * 0.60; weights += 0.60; }
        if (priorAssignments.length > 0) { systemAvg += assignScore * 0.05; weights += 0.05; }"""

content = content.replace(old_block, new_block)

with open("app/admin/analytics/SchoolPerformancePanel.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated Admin UI")
