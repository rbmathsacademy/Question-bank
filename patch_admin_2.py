import sys

with open("app/admin/analytics/page.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    if "import AnomalyDetectionPanel from './AnomalyDetectionPanel';" in line:
        new_lines.append(line)
        new_lines.append("import SchoolPerformancePanel from './SchoolPerformancePanel';\n")
    elif "const [pdfLoading, setPdfLoading] = useState(false);" in line:
        new_lines.append(line)
        new_lines.append("    const [activeTab, setActiveTab] = useState<'overview' | 'school'>('overview');\n")
    elif "{/* Anomaly Detection Panel */}" in line:
        new_lines.append("""                    {/* TABS */}
                    <div className="flex border-b border-white/10 mb-6">
                        <button 
                            onClick={() => setActiveTab('overview')} 
                            className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'overview' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                        >
                            Overview & Anomalies
                        </button>
                        <button 
                            onClick={() => setActiveTab('school')} 
                            className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'school' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                        >
                            School Performance
                        </button>
                    </div>

                    {activeTab === 'school' ? (
                        <SchoolPerformancePanel batch={selectedBatch} />
                    ) : (
                        <div className="space-y-6">
                            {/* Anomaly Detection Panel */}
""")
    elif "{/* Student Detail Slide-in Panel */}" in line:
        new_lines.append("""                        </div>
                    )}

                    {/* Student Detail Slide-in Panel */}
""")
    else:
        new_lines.append(line)

with open("app/admin/analytics/page.tsx", "w", encoding="utf-8") as f:
    f.writelines(new_lines)
