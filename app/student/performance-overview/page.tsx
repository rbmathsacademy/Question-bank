'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, TrendingUp, TrendingDown, CheckCircle, Target, Award, BookOpen, Medal, Star } from 'lucide-react';
import BatchTabSwitcher from '../../components/BatchTabSwitcher';

export default function PerformanceOverviewPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [selectedBatch, setSelectedBatch] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (selectedBatch) {
            fetchData(selectedBatch);
        }
    }, [selectedBatch]);

    const fetchData = async (batch?: string) => {
        setLoading(true);
        try {
            const url = batch ? `/api/student/dashboard-analytics?batch=${encodeURIComponent(batch)}` : '/api/student/dashboard-analytics';
            const res = await fetch(url);
            if (res.ok) {
                const result = await res.json();
                setData(result);
                if (!batch && result.student?.courses?.length > 0) {
                    const nonFreeBatches = result.student.courses.filter((c: string) => c.trim().toLowerCase() !== 'class xi (free batch) 2026-27');
                    if (nonFreeBatches.length > 1 && !selectedBatch) {
                        setSelectedBatch(nonFreeBatches[0]);
                    }
                }
            } else {
                if (res.status === 401) router.push('/student/login');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !data) {
        return (
            <div className="min-h-screen bg-[#050b14] flex items-center justify-center">
                <div className="w-10 h-10 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!data) return null;

    const schoolExams = data.schoolExams || [];
    const batches = data.student.courses.filter((c: string) => c.trim().toLowerCase() !== 'class xi (free batch) 2026-27');

    return (
        <div className="min-h-screen bg-[#050b14] font-sans text-slate-200 relative overflow-x-hidden">
            {/* Header */}
            <header className="sticky top-0 z-50 backdrop-blur-xl shadow-[0_1px_0_0_rgba(255,255,255,0.05)] bg-[#050b14]/70 px-4 py-3">
                <div className="max-w-7xl mx-auto flex items-center gap-3">
                    <button 
                        onClick={() => router.push('/student')} 
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-sm font-bold transition-colors shrink-0"
                    >
                        <ArrowLeft className="h-5 w-5" /> Back
                    </button>
                    <h1 className="text-sm font-bold text-white">Performance<span className="text-amber-400">Overview</span></h1>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-6 relative z-10 space-y-8">
                {batches.length > 1 && (
                    <BatchTabSwitcher
                        batches={batches}
                        selectedBatch={selectedBatch || batches[0]}
                        onSelect={(batch: string) => setSelectedBatch(batch)}
                    />
                )}

                <div className="space-y-6">
                    <h2 className="text-2xl font-black text-white flex items-center gap-3">
                        <TrendingUp className="text-amber-400 w-8 h-8" />
                        School vs System Correlation
                    </h2>
                    <p className="text-sm text-slate-400 mb-6">
                        Here you can see how your system practice directly impacts your school results. 
                        The system averages shown are calculated based ONLY on tests and assignments you completed *before* your school exam.
                    </p>

                    {schoolExams.length === 0 ? (
                        <div className="bg-[#1a1f2e] border border-white/5 rounded-2xl p-12 text-center">
                            <Award className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No school exam records found for this batch yet.</p>
                        </div>
                    ) : (
                        schoolExams.map((exam: any, idx: number) => {
                            const isImproved = exam.syncStatus === 'IMPROVED';
                            const isDeteriorated = exam.syncStatus === 'DETERIORATED';
                            const isInSync = exam.syncStatus === 'IN_SYNC';

                            return (
                                <div key={exam._id || idx} className={`bg-[#1a1f2e] border-2 rounded-2xl overflow-hidden shadow-xl ${
                                    isImproved ? 'border-emerald-500/30 shadow-emerald-500/10' :
                                    isDeteriorated ? 'border-orange-500/30 shadow-orange-500/10' :
                                    'border-blue-500/30 shadow-blue-500/10'
                                }`}>
                                    <div className={`px-5 py-4 border-b flex justify-between items-center ${
                                        isImproved ? 'bg-emerald-500/10 border-emerald-500/20' :
                                        isDeteriorated ? 'bg-orange-500/10 border-orange-500/20' :
                                        'bg-blue-500/10 border-blue-500/20'
                                    }`}>
                                        <div>
                                            <h3 className="text-lg font-black text-white">{exam.examName}</h3>
                                            <p className="text-xs font-medium text-slate-400 mt-0.5">
                                                {new Date(exam.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </p>
                                        </div>
                                        <div className="text-right flex flex-col items-end">
                                            <div className="flex items-end gap-1">
                                                <span className={`text-3xl font-black ${
                                                    isImproved ? 'text-emerald-400' :
                                                    isDeteriorated ? 'text-orange-400' :
                                                    'text-blue-400'
                                                }`}>{exam.marksObtained}</span>
                                                <span className="text-sm font-bold text-slate-500 mb-1">/{exam.fullMarks}</span>
                                            </div>
                                            <span className="text-xs font-black uppercase tracking-widest text-white/50">{exam.percentage.toFixed(1)}%</span>
                                        </div>
                                    </div>
                                    
                                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <h4 className="text-[10px] uppercase tracking-widest font-black text-slate-500">System Performance Prior to Exam</h4>
                                            
                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="bg-black/20 rounded-xl p-3 text-center border border-white/5">
                                                    <Target className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                                                    <p className="text-xs text-slate-400 mb-1">Online</p>
                                                    <p className="text-lg font-black text-white">{exam.priorAvgOnline > 0 ? `${exam.priorAvgOnline}%` : 'N/A'}</p>
                                                </div>
                                                <div className="bg-black/20 rounded-xl p-3 text-center border border-white/5">
                                                    <BookOpen className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                                                    <p className="text-xs text-slate-400 mb-1">Offline</p>
                                                    <p className="text-lg font-black text-white">{exam.priorAvgOffline > 0 ? `${exam.priorAvgOffline}%` : 'N/A'}</p>
                                                </div>
                                                <div className="bg-black/20 rounded-xl p-3 text-center border border-white/5">
                                                    <Star className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                                                    <p className="text-xs text-slate-400 mb-1">Assign.</p>
                                                    <p className="text-lg font-black text-white">{exam.priorAssignmentScore > 0 ? `${exam.priorAssignmentScore}%` : 'N/A'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    
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
                                    </div>

                                        <div className="flex flex-col justify-center border-t md:border-t-0 md:border-l border-white/10 pt-5 md:pt-0 md:pl-6">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-16 h-16 rounded-full flex items-center justify-center border-4 ${
                                                    isImproved ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' :
                                                    isDeteriorated ? 'bg-orange-500/20 border-orange-500/30 text-orange-400' :
                                                    'bg-blue-500/20 border-blue-500/30 text-blue-400'
                                                }`}>
                                                    {isImproved && <TrendingUp className="w-8 h-8" />}
                                                    {isDeteriorated && <TrendingDown className="w-8 h-8" />}
                                                    {isInSync && <CheckCircle className="w-8 h-8" />}
                                                </div>
                                                <div>
                                                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-1">Insight</p>
                                                    <h4 className={`text-sm font-black leading-tight ${
                                                        isImproved ? 'text-emerald-400' :
                                                        isDeteriorated ? 'text-orange-400' :
                                                        'text-blue-400'
                                                    }`}>
                                                        {isImproved && "Fantastic Improvement! ??"}
                                                        {isDeteriorated && "Let's bounce back! ??"}
                                                        {isInSync && "Consistent Performer! ?"}
                                                    </h4>
                                                    <p className="text-xs font-medium text-slate-400 mt-1">
                                                        System predicted ~{exam.priorSystemAvg}%. You scored {exam.percentage.toFixed(1)}%.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </main>
        </div>
    );
}

