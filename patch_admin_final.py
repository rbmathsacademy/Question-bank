import sys

with open("app/admin/analytics/page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add import
content = content.replace("import AnomalyDetectionPanel from './AnomalyDetectionPanel';", "import AnomalyDetectionPanel from './AnomalyDetectionPanel';\nimport SchoolPerformancePanel from './SchoolPerformancePanel';")

# Add state
content = content.replace("const [pdfLoading, setPdfLoading] = useState(false);", "const [pdfLoading, setPdfLoading] = useState(false);\n    const [activeTab, setActiveTab] = useState<'overview' | 'school'>('overview');")

# Wrap the existing content in tabs
target_start = """            {data && (
                <div className="space-y-6">
                    {/* Anomaly Detection Panel */}"""
replacement_start = """            {data && (
                <div className="space-y-6">
                    {/* TABS */}
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
                            {/* Anomaly Detection Panel */}"""

content = content.replace(target_start, replacement_start, 1)

# Find the end of the data rendering (the one right before `{/* Student Detail Modal */}`)
target_end = """                        </div>
                    </div>
                </div>
            )}

            {/* Student Detail Modal */}"""

replacement_end = """                        </div>
                    </div>
                </div>
                    )}
                </div>
            )}

            {/* Student Detail Modal */}"""

content = content.replace(target_end, replacement_end, 1)

with open("app/admin/analytics/page.tsx", "w", encoding="utf-8") as f:
    f.write(content)
