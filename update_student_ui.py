import re

with open("app/student/performance-overview/page.tsx", "rb") as f:
    content = f.read().decode("utf-8")

# 1. Add the new header right after the first header block
header_regex = re.compile(
    r'(<div className={`px-5 py-4 border-b flex justify-between items-center[^>]+>.*?</div>\s*</div>\s*</div>)',
    re.DOTALL
)

new_header = r'''\1
                                    
                                    <div className="px-5 py-3 bg-indigo-950/40 border-b border-indigo-500/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                                        <div>
                                            <h4 className="text-indigo-300 font-bold text-sm flex items-center gap-2">
                                                <Target className="w-4 h-4" /> System Marks Prediction
                                            </h4>
                                            <p className="text-indigo-400/60 text-[10px] uppercase tracking-wider font-semibold mt-0.5 max-w-md">
                                                Calculated using your average scores across online tests, offline exams, and assignments completed prior to this exam.
                                            </p>
                                        </div>
                                        <div className="text-xl font-black text-indigo-300 bg-indigo-500/10 px-3 py-1 rounded-lg border border-indigo-500/20">
                                            {exam.priorSystemAvg}%
                                        </div>
                                    </div>'''

content = header_regex.sub(new_header, content)

# 2. Change text-lg to text-sm in the insight block
# old: <h4 className={`text-lg font-black leading-tight ${
# new: <h4 className={`text-sm font-black leading-tight ${
content = content.replace("text-lg font-black leading-tight", "text-sm font-black leading-tight")

with open("app/student/performance-overview/page.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("UI updated")
