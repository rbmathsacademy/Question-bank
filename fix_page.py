import os

with open("app/admin/analytics/page.tsx", "rb") as f:
    content = f.read().decode("utf-8")

content = content.replace(
    "<SchoolPerformancePanel batch={selectedBatch} />",
    "<SchoolPerformancePanel batch={selectedBatch} analyticsData={data} />"
)

with open("app/admin/analytics/page.tsx", "w", encoding="utf-8") as f:
    f.write(content)
