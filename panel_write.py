with open('app/admin/analytics/SchoolPerformancePanel.tsx', 'w', encoding='utf-8') as f: f.write(r''''use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, Search, Check, X, FileText, Send, User, Download, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { generateSchoolReportPDF } from './generateSchoolReportPDF';

export default function SchoolPerformancePanel({ batch, analyticsData }: { batch: string, analyticsData?: any }) {
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState<any[]>([]);
    const [uniqueExams, setUniqueExams] = useState<string[]>([]);
    const [uniqueSchools, setUniqueSchools] = useState<string[]>([]);

    const [filterSchool, setFilterSchool] = useState('');
    const [filterExam, setFilterExam] = useState('');
    
    // Add marks modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [formExamName, setFormExamName] = useState('');
    const [formDate, setFormDate] = useState('');
    const [formFullMarks, setFormFullMarks] = useState(100);
    const [formMarksObtained, setFormMarksObtained] = useState('');

    // WhatsApp
    const [selectedPhones, setSelectedPhones] = useState<Set<string>>(new Set());
    const [whatsappMessage, setWhatsappMessage] = useState('Here is your latest school exam analysis...');

    useEffect(() => {
        fetchData();
    }, [batch, filterSchool, filterExam]);

    const fetchData = async () => {
        setLoading(true);
        try {
            let url = `/api/admin/school-exams?batch=${encodeURIComponent(batch)}`;
            if (filterSchool) url += `&schoolName=${encodeURIComponent(filterSchool)}`;
            if (filterExam) url += `&examName=${encodeURIComponent(filterExam)}`;

            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setStudents(data.results || []);
                setUniqueExams(data.uniqueExams || []);
                setUniqueSchools(data.uniqueSchools || []);
            }
        } catch (error) {
            toast.error('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveMarks = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent || !formExamName || !formDate || !formMarksObtained) {
            toast.error('Please fill all required fields');
            return;
        }

        const payload = {
            studentId: selectedStudent._id,
            studentPhone: selectedStudent.phoneNumber,
            batch,
            schoolName: selectedStudent.schoolName || '',
            examName: formExamName,
            date: new Date(formDate),
            fullMarks: Number(formFullMarks),
            marksObtained: Number(formMarksObtained)
        };

        try {
            const res = await fetch('/api/admin/school-exams', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success('Marks added successfully');
                setIsModalOpen(false);
                fetchData();
            } else {
                const error = await res.json();
                toast.error(error.error || 'Failed to save');
            }
        } catch (error) {
            toast.error('Error saving marks');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this record?')) return;
        try {
            const res = await fetch(`/api/admin/school-exams/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Deleted successfully');
                fetchData();
            } else {
                toast.error('Failed to delete');
            }
        } catch (error) {
            toast.error('Error deleting record');
        }
    };

    const copyForWhatsApp = () => {
        if (selectedPhones.size === 0) return toast.error('No students selected');
        if (!whatsappMessage) return toast.error('Message cannot be empty');
        
        const actualPhones = Array.from(selectedPhones);
        const dataStr = `WHATSAPP_BULK|||${whatsappMessage}|||${actualPhones.join(',')}`;
        navigator.clipboard.writeText(dataStr);
        toast.success(`Copied ${actualPhones.length} number(s)! Open WhatsApp Web and press F9`);
    };

    const toggleSelection = (phone: string) => {
        const newSet = new Set(selectedPhones);
        if (newSet.has(phone)) newSet.delete(phone);
        else newSet.add(phone);
        setSelectedPhones(newSet);
    };

    const getCorrelationData = (student: any, exam: any) => {
        if (!analyticsData || !analyticsData.analytics) return null;
        
        const studentStats = analyticsData.analytics.find((a: any) => a.student.phoneNumber === student.phoneNumber);
        if (!studentStats) return null;

        const examDate = new Date(exam.date);
        
        const priorOnlineTests = studentStats.tests.filter((t: any) => 
            t.status === 'completed' && t.percentage !== null && t.submittedAt && new Date(t.submittedAt) < examDate
        );
        const avgOnline = priorOnlineTests.length > 0 
            ? priorOnlineTests.reduce((sum: number, t: any) => sum + (t.percentage || 0), 0) / priorOnlineTests.length 
            : 0;

        const priorOfflineExams = studentStats.offlineExams.filter((t: any) => 
            new Date(t.testDate) < examDate && typeof t.percentage === 'number'
        );
        const avgOffline = priorOfflineExams.length > 0
            ? priorOfflineExams.reduce((sum: number, t: any) => sum + (t.percentage || 0), 0) / priorOfflineExams.length
            : 0;

        const priorAssignments = studentStats.assignments.filter((a: any) => 
            a.submittedAt && new Date(a.submittedAt) < examDate && a.quality
        );
        
        let assignScore = 0;
        if (priorAssignments.length > 0) {
            let total = 0;
            priorAssignments.forEach((a: any) => {
                if (a.quality === 'GOOD') total += 100;
                else if (a.quality === 'SATISFACTORY') total += 60;
            });
            assignScore = total / priorAssignments.length;
        }

        let systemAvg = 0;
        let weights = 0;
        if (priorOnlineTests.length > 0) { systemAvg += avgOnline * 0.4; weights += 0.4; }
        if (priorOfflineExams.length > 0) { systemAvg += avgOffline * 0.4; weights += 0.4; }
        if (priorAssignments.length > 0) { systemAvg += assignScore * 0.2; weights += 0.2; }
        
        if (weights > 0) {
            systemAvg = systemAvg / weights;
        }

        let syncStatus = 'IN_SYNC';
        if (exam.percentage > systemAvg + 10) syncStatus = 'IMPROVED';
        else if (exam.percentage < systemAvg - 10) syncStatus = 'DETERIORATED';

        return {
            priorAvgOnline: parseFloat(avgOnline.toFixed(2)),
            priorAvgOffline: parseFloat(avgOffline.toFixed(2)),
            priorAssignmentScore: parseFloat(assignScore.toFixed(2)),
            priorSystemAvg: parseFloat(systemAvg.toFixed(2)),
            syncStatus
        };
    };

    const handleDownloadPDF = (student: any, exam: any) => {
        const correlation = getCorrelationData(student, exam);
        if (!correlation) {
            toast.error('Analytics data not fully loaded yet for correlation PDF');
            return;
        }
        generateSchoolReportPDF(student, exam, correlation);
        toast.success('Report downloaded');
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                <div className="flex gap-4 w-full md:w-auto">
                    <select 
                        value={filterSchool} 
                        onChange={(e) => setFilterSchool(e.target.value)}
                        className="bg-slate-900 border border-slate-700 text-slate-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                    >
                        <option value="">All Schools</option>
                        {uniqueSchools.map(s => <option key={s} value={s}>{s || 'Unknown'}</option>)}
                    </select>

                    <select 
                        value={filterExam} 
                        onChange={(e) => setFilterExam(e.target.value)}
                        className="bg-slate-900 border border-slate-700 text-slate-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                    >
                        <option value="">All Exams</option>
                        {uniqueExams.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                </div>

                <div className="flex gap-2 w-full md:w-auto items-center">
                    <input 
                        type="text" 
                        placeholder="WhatsApp message..."
                        value={whatsappMessage}
                        onChange={(e) => setWhatsappMessage(e.target.value)}
                        className="bg-slate-900 border border-slate-700 text-slate-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-indigo-500 flex-1"
                    />
                    <button 
                        onClick={copyForWhatsApp}
                        className="px-4 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap"
                    >
                        <Send className="w-4 h-4" /> WhatsApp ({selectedPhones.size})
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12"><div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {students.map(student => (
                        <div key={student.phoneNumber} className="bg-slate-800/40 border border-slate-700/50 rounded-xl overflow-hidden shadow-lg">
                            <div className="p-4 border-b border-slate-700/50 flex justify-between items-start bg-slate-800/60">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedPhones.has(student.phoneNumber)}
                                            onChange={() => toggleSelection(student.phoneNumber)}
                                            className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900"
                                        />
                                        <h3 className="text-slate-200 font-bold text-lg">{student.name}</h3>
                                    </div>
                                    <p className="text-slate-400 text-xs ml-6">{student.schoolName || 'No School'} - {student.phoneNumber}</p>
                                </div>
                                <button 
                                    onClick={() => {
                                        setSelectedStudent(student);
                                        setFormExamName(uniqueExams.length > 0 ? uniqueExams[0] : 'Mid Terms');
                                        setFormDate(new Date().toISOString().split('T')[0]);
                                        setFormMarksObtained('');
                                        setIsModalOpen(true);
                                    }}
                                    className="p-1.5 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-md transition-colors"
                                    title="Add Exam Record"
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <div className="p-4 flex flex-col gap-3">
                                {student.exams.length === 0 ? (
                                    <p className="text-slate-500 text-sm text-center py-4 italic">No exams recorded.</p>
                                ) : (
                                    student.exams.map((exam: any) => {
                                        const correlation = getCorrelationData(student, exam);
                                        return (
                                        <div key={exam._id} className="bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-sm relative group overflow-hidden">
                                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                <button 
                                                    onClick={() => handleDownloadPDF(student, exam)}
                                                    className="p-1 bg-slate-800 rounded text-slate-300 hover:text-blue-400 border border-slate-600 shadow-lg"
                                                    title="Download Parent PDF"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(exam._id)}
                                                    className="p-1 bg-slate-800 rounded text-slate-300 hover:text-red-400 border border-slate-600 shadow-lg"
                                                    title="Delete Record"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                            
                                            <div className="flex justify-between items-end mb-1 pr-16">
                                                <span className="font-semibold text-slate-300">{exam.examName}</span>
                                                <span className="font-bold text-emerald-400 text-lg">{exam.marksObtained}<span className="text-slate-500 text-xs font-normal">/{exam.fullMarks}</span></span>
                                            </div>
                                            <div className="text-xs text-slate-500 flex justify-between border-b border-slate-800 pb-2 mb-2">
                                                <span>{new Date(exam.date).toLocaleDateString()}</span>
                                                <span>{exam.percentage.toFixed(1)}%</span>
                                            </div>

                                            {/* Correlation Insight Display */}
                                            {correlation && (
                                                <div className="flex items-center justify-between mt-1">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] uppercase tracking-wider text-slate-500">System Prediction</span>
                                                        <span className="font-medium text-slate-300">{correlation.priorSystemAvg}%</span>
                                                    </div>
                                                    
                                                    {correlation.syncStatus === 'IMPROVED' && (
                                                        <div className="flex items-center gap-1 text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded text-xs font-bold">
                                                            <TrendingUp className="w-3 h-3"/> Exceeded
                                                        </div>
                                                    )}
                                                    {correlation.syncStatus === 'DETERIORATED' && (
                                                        <div className="flex items-center gap-1 text-red-400 bg-red-400/10 px-2 py-1 rounded text-xs font-bold">
                                                            <TrendingDown className="w-3 h-3"/> Underperformed
                                                        </div>
                                                    )}
                                                    {correlation.syncStatus === 'IN_SYNC' && (
                                                        <div className="flex items-center gap-1 text-blue-400 bg-blue-400/10 px-2 py-1 rounded text-xs font-bold">
                                                            <Minus className="w-3 h-3"/> In Sync
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )})
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && selectedStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
                            <h2 className="text-lg font-bold text-white">Add Exam Record</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
                        </div>
                        <form onSubmit={handleSaveMarks} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Student</label>
                                <div className="text-slate-200 bg-slate-800 px-3 py-2 rounded-lg">{selectedStudent.name} ({selectedStudent.phoneNumber})</div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Exam Name</label>
                                <input 
                                    type="text" 
                                    required 
                                    value={formExamName}
                                    onChange={(e) => setFormExamName(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500" 
                                    placeholder="e.g. Pre-Board 1"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Exam Date</label>
                                <input 
                                    type="date" 
                                    required 
                                    value={formDate}
                                    onChange={(e) => setFormDate(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500" 
                                />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Full Marks</label>
                                    <input 
                                        type="number" 
                                        required min="1"
                                        value={formFullMarks}
                                        onChange={(e) => setFormFullMarks(Number(e.target.value))}
                                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500" 
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Marks Obtained</label>
                                    <input 
                                        type="number" 
                                        required min="0" step="0.5"
                                        value={formMarksObtained}
                                        onChange={(e) => setFormMarksObtained(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500" 
                                    />
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold transition-colors">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition-colors">Save Marks</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}''')
