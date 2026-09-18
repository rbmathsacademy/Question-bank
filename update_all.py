import re

with open("app/api/student/dashboard-analytics/route.ts", "rb") as f:
    content = f.read().decode("utf-8")

content = re.sub(r'systemAvg \+= avgOnline \* 0\.4; weights \+= 0\.4;', 'systemAvg += avgOnline * 0.35; weights += 0.35;', content)
content = re.sub(r'systemAvg \+= avgOffline \* 0\.4; weights \+= 0\.4;', 'systemAvg += avgOffline * 0.60; weights += 0.60;', content)
content = re.sub(r'systemAvg \+= assignScore \* 0\.2; weights \+= 0\.2;', 'systemAvg += assignScore * 0.05; weights += 0.05;', content)

with open("app/api/student/dashboard-analytics/route.ts", "w", encoding="utf-8") as f:
    f.write(content)

with open("app/admin/analytics/SchoolPerformancePanel.tsx", "rb") as f:
    content = f.read().decode("utf-8")

content = re.sub(r'systemAvg \+= avgOnline \* 0\.4; weights \+= 0\.4;', 'systemAvg += avgOnline * 0.35; weights += 0.35;', content)
content = re.sub(r'systemAvg \+= avgOffline \* 0\.4; weights \+= 0\.4;', 'systemAvg += avgOffline * 0.60; weights += 0.60;', content)
content = re.sub(r'systemAvg \+= assignScore \* 0\.2; weights \+= 0\.2;', 'systemAvg += assignScore * 0.05; weights += 0.05;', content)

with open("app/admin/analytics/SchoolPerformancePanel.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Both updated")
