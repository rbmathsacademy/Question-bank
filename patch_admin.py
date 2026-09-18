import sys

with open("app/admin/analytics/page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add import
content = content.replace("import AnomalyDetectionPanel from './AnomalyDetectionPanel';", "import AnomalyDetectionPanel from './AnomalyDetectionPanel';\nimport SchoolPerformancePanel from './SchoolPerformancePanel';")

# Add state
content = content.replace("const [pdfLoading, setPdfLoading] = useState(false);", "const [pdfLoading, setPdfLoading] = useState(false);\n    const [activeTab, setActiveTab] = useState<'overview' | 'school'>('overview');")

# Wrap the existing content in tabs
target = "{/* Anomaly Detection Panel */}"
replacement = """{/* TABS */}
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

content = content.replace(target, replacement)

# We need to close the div we opened for the overview section
# Let's look for the end of the data section
end_target = """                </div>
            )}

            {/* Student Detail Slide-in Panel */}"""

end_replacement = """                        </div>
                    )}
                </div>
            )}

            {/* Student Detail Slide-in Panel */}"""
content = content.replace(end_target, end_replacement)

with open("app/admin/analytics/page.tsx", "w", encoding="utf-8") as f:
    f.write(content)
