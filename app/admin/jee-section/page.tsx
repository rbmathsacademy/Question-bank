'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ChevronDown, X, Check, ArrowLeft, ArrowRight, Home, Loader2 } from 'lucide-react';
import Latex from 'react-latex-next';
import LatexWithImages from '../../components/LatexWithImages';
import 'katex/dist/katex.min.css';

// ─── Inline MultiSelect (dark theme, compact) ───
const MultiSelect = ({ options, selected, onChange, placeholder }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (value: string) => {
        let newSelected = selected.includes(value)
            ? selected.filter((item: string) => item !== value)
            : [...selected, value];
        if (value !== "No Topic" && !selected.includes(value)) {
            newSelected = newSelected.filter((item: string) => item !== "No Topic");
        }
        if (selected.includes(value) && newSelected.length === 0) {
            newSelected = ["No Topic"];
        }
        onChange(newSelected);
    };

    const filteredOptions = options.filter((opt: string) =>
        opt.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="relative flex-1 min-w-[160px]" ref={containerRef}>
            <div
                className="w-full bg-gray-900 border border-gray-700 text-gray-300 rounded-lg p-2 text-xs min-h-[38px] flex items-center justify-between cursor-pointer hover:border-gray-500 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex flex-wrap gap-1 overflow-hidden">
                    {selected.length === 0 || (selected.length === 1 && selected[0] === "No Topic") ? (
                        <span className="text-gray-500">{placeholder}</span>
                    ) : selected.length > 2 ? (
                        <span className="text-white">{selected.filter((s: string) => s !== "No Topic").length} selected</span>
                    ) : (
                        selected.filter((s: string) => s !== "No Topic").map((s: string) => (
                            <span key={s} className="bg-blue-900 text-blue-200 px-1.5 py-0.5 rounded text-[10px] truncate max-w-[120px]">{s}</span>
                        ))
                    )}
                </div>
                <ChevronDown className="h-3 w-3 text-gray-400 flex-shrink-0 ml-1" />
            </div>
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl max-h-72 overflow-hidden flex flex-col">
                    <div className="p-2 border-b border-gray-700 sticky top-0 bg-gray-800 z-10">
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-600 text-gray-300 px-2 py-1 rounded text-xs focus:outline-none focus:border-blue-500"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    {selected.filter((s: string) => s !== "No Topic").length > 0 && (
                        <div
                            className="px-3 py-2 hover:bg-red-900/30 cursor-pointer flex items-center gap-2 text-xs text-red-400 border-b border-gray-700"
                            onClick={() => onChange(["No Topic"])}
                        >
                            <X className="h-3 w-3" /> Clear
                        </div>
                    )}
                    <div className="overflow-y-auto max-h-56">
                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-gray-500 italic">No matches</div>
                        ) : (
                            filteredOptions.map((opt: string) => (
                                <div
                                    key={opt}
                                    className="px-3 py-2 hover:bg-gray-700 cursor-pointer flex items-center gap-2 text-xs text-gray-300"
                                    onClick={() => toggleOption(opt)}
                                >
                                    <div className={`w-3 h-3 rounded border border-gray-500 flex items-center justify-center flex-shrink-0 ${selected.includes(opt) ? 'bg-blue-600 border-blue-600' : ''}`}>
                                        {selected.includes(opt) && <Check className="h-2 w-2 text-white" />}
                                    </div>
                                    <span className="truncate">{opt}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Main Page ───
interface Question {
    id: string;
    text: string;
    type: string;
    topic: string;
    subtopic: string;
    answer?: string;
    hint?: string;
    explanation?: string;
    image?: string;
    examNames?: string[];
    examName?: string;
    marks?: number;
    options?: string[];
    batches?: string[];
}

export default function JEESection() {
    // Auth
    const [userEmail, setUserEmail] = useState<string | null>(null);

    // Data
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(false);

    // Filters
    const [selectedTopics, setSelectedTopics] = useState<string[]>(["No Topic"]);
    const [selectedSubtopics, setSelectedSubtopics] = useState<string[]>([]);
    const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
    const [selectedExams, setSelectedExams] = useState<string[]>([]);
    const [serverFilters, setServerFilters] = useState<{ topics: string[]; subtopics: string[]; examNames: string[]; batches: string[] }>({ topics: [], subtopics: [], examNames: [], batches: [] });
    const [filtersLoading, setFiltersLoading] = useState(true);

    // Question viewer
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [showExplanation, setShowExplanation] = useState(false);

    // ─── Auth ───
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            setUserEmail(user.email);
            fetchFilters(user.email);
        }
    }, []);

    // ─── Fetch Filters ───
    const fetchFilters = async (email: string) => {
        setFiltersLoading(true);
        try {
            const headers: any = { 'X-User-Email': email };
            if (typeof window !== 'undefined' && localStorage.getItem('globalAdminActive') === 'true') {
                headers['X-Global-Admin-Key'] = 'globaladmin_25';
            }
            const res = await fetch('/api/admin/questions/filters', { headers });
            if (res.ok) {
                const data = await res.json();
                setServerFilters(data);
            }
        } catch (error) {
            console.error('[JEE FILTERS] Error:', error);
        } finally {
            setFiltersLoading(false);
        }
    };

    // ─── Fetch Questions ───
    const fetchQuestions = async (email: string, filters?: { topics?: string[]; exams?: string[]; batches?: string[] }) => {
        setLoading(true);
        try {
            const headers: any = { 'X-User-Email': email };
            if (typeof window !== 'undefined' && localStorage.getItem('globalAdminActive') === 'true') {
                headers['X-Global-Admin-Key'] = 'globaladmin_25';
            }
            const params = new URLSearchParams();
            if (filters?.topics && filters.topics.length > 0) params.set('topic', filters.topics.join('|||'));
            if (filters?.exams && filters.exams.length > 0) params.set('exam', filters.exams.join('|||'));
            if (filters?.batches && filters.batches.length > 0) params.set('batch', filters.batches.join('|||'));
            const url = `/api/admin/questions${params.toString() ? '?' + params.toString() : ''}`;
            const res = await fetch(url, { headers, cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                const sorted = data.sort((a: any, b: any) => {
                    if (a.order !== b.order) return (a.order || 0) - (b.order || 0);
                    return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
                });
                setQuestions(sorted);
            }
        } catch (error) {
            console.error('[JEE] Fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    // ─── Trigger fetch on topic change ───
    useEffect(() => {
        if (!userEmail) return;
        const actualTopics = selectedTopics.filter(t => t !== "No Topic");
        if (actualTopics.length > 0) {
            fetchQuestions(userEmail, { topics: actualTopics, exams: selectedExams.length > 0 ? selectedExams : undefined, batches: selectedBatches.length > 0 ? selectedBatches : undefined });
        } else if (selectedExams.length > 0 || selectedBatches.length > 0) {
            fetchQuestions(userEmail, { exams: selectedExams.length > 0 ? selectedExams : undefined, batches: selectedBatches.length > 0 ? selectedBatches : undefined });
        } else {
            setQuestions([]);
        }
    }, [selectedTopics, selectedExams, selectedBatches, userEmail]);

    // ─── Reset viewer on filter change ───
    useEffect(() => {
        setCurrentIndex(0);
        setSelectedOption(null);
        setShowExplanation(false);
    }, [selectedTopics, selectedSubtopics, selectedBatches, selectedExams]);

    // ─── Helper: filter by batches ───
    const filterByBatches = (qs: Question[]) => {
        if (selectedBatches.length === 0) return qs;
        return qs.filter(q => {
            const qBatches = q.batches || [];
            const wantUntagged = selectedBatches.includes('Untagged');
            const realBatches = selectedBatches.filter(b => b !== 'Untagged');
            return (wantUntagged && qBatches.length === 0) ||
                (realBatches.length > 0 && realBatches.some(b => qBatches.includes(b)));
        });
    };

    // ─── Cascading Filter Options ───
    const topics = useMemo(() => {
        const hasNarrowing = selectedExams.length > 0 || selectedBatches.length > 0 || selectedSubtopics.length > 0;
        if (!hasNarrowing && questions.length === 0 && serverFilters.topics.length > 0) {
            return ["No Topic", ...serverFilters.topics];
        }
        const set = new Set<string>();
        let filtered = filterByBatches(questions);
        if (selectedSubtopics.length > 0) filtered = filtered.filter(q => selectedSubtopics.includes(q.subtopic));
        if (selectedExams.length > 0) {
            filtered = filtered.filter(q => {
                const qExams = q.examNames || (q.examName ? [q.examName] : []);
                return qExams.some((e: string) => selectedExams.includes(e));
            });
        }
        filtered.forEach(q => set.add(q.topic));
        if (!hasNarrowing && serverFilters.topics.length > 0) serverFilters.topics.forEach(t => set.add(t));
        return ["No Topic", ...Array.from(set).filter(Boolean).sort()];
    }, [questions, selectedSubtopics, selectedExams, selectedBatches, serverFilters]);

    const subtopics = useMemo(() => {
        const actualTopics = selectedTopics.filter(t => t !== "No Topic");
        let filtered = filterByBatches(questions);
        if (actualTopics.length > 0) filtered = filtered.filter(q => actualTopics.includes(q.topic));
        if (selectedExams.length > 0) {
            filtered = filtered.filter(q => {
                const qExams = q.examNames || (q.examName ? [q.examName] : []);
                return qExams.some((e: string) => selectedExams.includes(e));
            });
        }
        return Array.from(new Set(filtered.map(q => q.subtopic))).filter(Boolean).sort();
    }, [questions, selectedTopics, selectedExams, selectedBatches]);

    const examNames = useMemo(() => {
        const actualTopics = selectedTopics.filter(t => t !== "No Topic");
        const hasNarrowing = actualTopics.length > 0 || selectedBatches.length > 0 || selectedSubtopics.length > 0;
        if (!hasNarrowing && questions.length === 0 && serverFilters.examNames.length > 0) return serverFilters.examNames;
        const set = new Set<string>();
        let filtered = filterByBatches(questions);
        if (actualTopics.length > 0) filtered = filtered.filter(q => actualTopics.includes(q.topic));
        if (selectedSubtopics.length > 0) filtered = filtered.filter(q => selectedSubtopics.includes(q.subtopic));
        filtered.forEach(q => {
            if (q.examNames && Array.isArray(q.examNames)) q.examNames.forEach(e => set.add(e));
            else if (q.examName) set.add(q.examName);
        });
        if (!hasNarrowing && serverFilters.examNames.length > 0) serverFilters.examNames.forEach(e => set.add(e));
        return Array.from(set).filter(Boolean).sort();
    }, [questions, selectedTopics, selectedSubtopics, selectedBatches, serverFilters]);

    const availableBatchNames = useMemo(() => {
        const set = new Set<string>();
        serverFilters.batches.forEach(b => { if (b) set.add(b); });
        const actualTopics = selectedTopics.filter(t => t !== "No Topic");
        let filtered = questions;
        if (actualTopics.length > 0) filtered = filtered.filter(q => actualTopics.includes(q.topic));
        if (selectedSubtopics.length > 0) filtered = filtered.filter(q => selectedSubtopics.includes(q.subtopic));
        if (selectedExams.length > 0) {
            filtered = filtered.filter(q => {
                const qExams = q.examNames || (q.examName ? [q.examName] : []);
                return qExams.some((e: string) => selectedExams.includes(e));
            });
        }
        filtered.forEach(q => {
            if (q.batches && Array.isArray(q.batches)) q.batches.forEach(b => set.add(b));
        });
        return ['Untagged', ...Array.from(set).filter(Boolean).sort()];
    }, [questions, selectedTopics, selectedSubtopics, selectedExams, serverFilters.batches]);

    // ─── Filtered MCQ Questions ───
    const mcqQuestions = useMemo(() => {
        if (selectedTopics.includes("No Topic") && selectedExams.length === 0 && selectedBatches.length === 0) return [];
        const actualTopics = selectedTopics.filter(t => t !== "No Topic");
        return questions.filter(q => {
            if (q.type !== 'mcq') return false;
            if (!q.options || q.options.length === 0) return false;
            if (actualTopics.length > 0 && !actualTopics.includes(q.topic)) return false;
            if (selectedSubtopics.length > 0 && !selectedSubtopics.includes(q.subtopic)) return false;
            if (selectedExams.length > 0) {
                const qExams = q.examNames || (q.examName ? [q.examName] : []);
                if (!qExams.some((e: string) => selectedExams.includes(e))) return false;
            }
            if (selectedBatches.length > 0) {
                const qBatches = q.batches || [];
                const wantUntagged = selectedBatches.includes('Untagged');
                const realBatches = selectedBatches.filter(b => b !== 'Untagged');
                const batchMatch = (wantUntagged && qBatches.length === 0) ||
                    (realBatches.length > 0 && realBatches.some(b => qBatches.includes(b)));
                if (!batchMatch) return false;
            }
            return true;
        });
    }, [questions, selectedTopics, selectedSubtopics, selectedExams, selectedBatches]);

    const currentQuestion = mcqQuestions[currentIndex] || null;
    const totalQuestions = mcqQuestions.length;

    // ─── Answer Matching ───
    const getCorrectOptionIndex = useCallback((q: Question): number => {
        if (!q || !q.options || !q.answer) return -1;
        const answer = q.answer.trim().toLowerCase();

        // Try direct text match first
        for (let i = 0; i < q.options.length; i++) {
            const optText = q.options[i].trim().toLowerCase();
            if (optText === answer) return i;
        }

        // Try if answer contains LaTeX and option contains same LaTeX
        for (let i = 0; i < q.options.length; i++) {
            const optText = q.options[i].trim().toLowerCase().replace(/\s+/g, '');
            const ansClean = answer.replace(/\s+/g, '');
            if (optText === ansClean) return i;
        }

        // Try matching by option letter: "(a)", "(b)", "(c)", "(d)" or "a)", "b)", etc.
        const letterMatch = answer.match(/^\(?([a-d])\)?\.?\s*/i);
        if (letterMatch) {
            const idx = letterMatch[1].toLowerCase().charCodeAt(0) - 'a'.charCodeAt(0);
            if (idx >= 0 && idx < q.options.length) return idx;
        }

        // Try if answer is contained in an option or option contained in answer
        for (let i = 0; i < q.options.length; i++) {
            const optText = q.options[i].trim().toLowerCase();
            if (answer.includes(optText) || optText.includes(answer)) return i;
        }

        // Try numeric match (strip $ signs for LaTeX numbers)
        const stripMath = (s: string) => s.replace(/\$/g, '').replace(/\\,/g, '').replace(/\s+/g, '').trim();
        const ansNum = stripMath(answer);
        for (let i = 0; i < q.options.length; i++) {
            if (stripMath(q.options[i]) === ansNum) return i;
        }

        return -1;
    }, []);

    // ─── Option Click ───
    const handleOptionClick = (idx: number) => {
        if (selectedOption !== null) return; // Already answered
        setSelectedOption(idx);
        setShowExplanation(true);
    };

    // ─── Navigation ───
    const goNext = () => {
        if (currentIndex < totalQuestions - 1) {
            setCurrentIndex(prev => prev + 1);
            setSelectedOption(null);
            setShowExplanation(false);
        }
    };

    const goBack = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setSelectedOption(null);
            setShowExplanation(false);
        }
    };

    // Keyboard navigation
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === 'n') goNext();
            if (e.key === 'ArrowLeft' || e.key === 'p') goBack();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [currentIndex, totalQuestions]);

    const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

    const correctIdx = currentQuestion ? getCorrectOptionIndex(currentQuestion) : -1;

    const getOptionStyle = (idx: number) => {
        if (selectedOption === null) {
            return 'bg-gray-900 border-gray-600 hover:border-blue-500 hover:bg-gray-800 cursor-pointer';
        }
        // After selection
        if (idx === correctIdx) {
            return 'bg-green-900/60 border-green-500 shadow-lg shadow-green-500/20';
        }
        if (idx === selectedOption && idx !== correctIdx) {
            return 'bg-red-900/60 border-red-500 shadow-lg shadow-red-500/20';
        }
        return 'bg-gray-900/50 border-gray-700 opacity-50';
    };

    // Scroll to top of question panel on question change
    const questionPanelRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        questionPanelRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, [currentIndex]);

    return (
        <div className="h-screen w-screen bg-black text-white flex flex-col overflow-hidden">
            {/* ─── Top Bar: Filters ─── */}
            <div className="flex-shrink-0 bg-gray-950 border-b border-gray-800 px-4 py-3">
                <div className="flex items-center gap-3">
                    {/* Back button */}
                    <a
                        href="/admin/dashboard"
                        className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm flex-shrink-0"
                    >
                        <Home className="h-4 w-4" />
                    </a>

                    <div className="h-6 w-px bg-gray-700 flex-shrink-0" />

                    {/* Filters */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <MultiSelect
                            options={topics}
                            selected={selectedTopics}
                            onChange={setSelectedTopics}
                            placeholder="Topic"
                        />
                        <MultiSelect
                            options={subtopics}
                            selected={selectedSubtopics}
                            onChange={setSelectedSubtopics}
                            placeholder="Sub Topic"
                        />
                        <MultiSelect
                            options={availableBatchNames}
                            selected={selectedBatches}
                            onChange={setSelectedBatches}
                            placeholder="Batch"
                        />
                        <MultiSelect
                            options={examNames}
                            selected={selectedExams}
                            onChange={setSelectedExams}
                            placeholder="Exam"
                        />
                    </div>

                    {/* Question counter */}
                    {totalQuestions > 0 && (
                        <div className="flex-shrink-0 text-sm text-gray-400 font-mono">
                            Q {currentIndex + 1} / {totalQuestions}
                        </div>
                    )}
                </div>
            </div>

            {/* ─── Main Content: Split View ─── */}
            <div className="flex-1 flex min-h-0">
                {/* ─── Left Panel: Blank Scratchpad ─── */}
                <div className="w-1/2 bg-black relative border-r border-gray-800">
                    {/* Watermark */}
                    <div className="absolute bottom-8 right-8 text-right select-none pointer-events-none opacity-20">
                        <p className="text-3xl font-bold text-white tracking-wide">© RB Maths Academy</p>
                        <p className="text-2xl font-semibold text-gray-300 mt-1">Dr. Ritwick Banerjee</p>
                    </div>
                </div>

                {/* ─── Right Panel: Questions ─── */}
                <div className="w-1/2 flex flex-col">
                    <div ref={questionPanelRef} className="flex-1 overflow-y-auto p-6 pb-24">
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                                <span className="ml-3 text-gray-400">Loading questions...</span>
                            </div>
                        ) : totalQuestions === 0 ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center">
                                    <p className="text-2xl text-gray-500 mb-2">📋</p>
                                    <p className="text-gray-400 text-lg">Select filters to load MCQ questions</p>
                                    <p className="text-gray-600 text-sm mt-1">Only MCQ-type questions will appear here</p>
                                </div>
                            </div>
                        ) : currentQuestion ? (
                            <div>
                                {/* Question Number + Topic */}
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="bg-blue-600 text-white text-sm font-bold px-3 py-1 rounded-lg">
                                        Q{currentIndex + 1}
                                    </span>
                                    <span className="text-gray-500 text-sm">{currentQuestion.topic}</span>
                                    {currentQuestion.subtopic && (
                                        <span className="text-gray-600 text-xs">• {currentQuestion.subtopic}</span>
                                    )}
                                    {(currentQuestion.examNames && currentQuestion.examNames.length > 0) && (
                                        <span className="bg-teal-900/60 text-teal-300 text-xs font-semibold px-2 py-0.5 rounded-md border border-teal-700/50">
                                            {currentQuestion.examNames.join(', ')}
                                        </span>
                                    )}
                                    {currentQuestion.marks && (
                                        <span className="text-yellow-500 text-xs ml-auto">[{currentQuestion.marks} mark{currentQuestion.marks > 1 ? 's' : ''}]</span>
                                    )}
                                </div>

                                {/* Question Text */}
                                <div className="text-xl leading-relaxed mb-8 text-gray-100">
                                    <LatexWithImages>{currentQuestion.text}</LatexWithImages>
                                </div>

                                {/* Question Image */}
                                {currentQuestion.image && (
                                    <div className="mb-6">
                                        <img
                                            src={currentQuestion.image}
                                            alt="Question"
                                            className="max-w-full h-auto rounded-lg border border-gray-700"
                                            style={{ maxHeight: '300px' }}
                                        />
                                    </div>
                                )}

                                {/* Options */}
                                <div className="space-y-3 mb-8">
                                    {currentQuestion.options?.map((opt, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleOptionClick(idx)}
                                            disabled={selectedOption !== null}
                                            className={`w-full text-left flex items-start gap-4 p-4 rounded-xl border-2 transition-all duration-300 ${getOptionStyle(idx)}`}
                                        >
                                            <span className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold border-2 transition-all duration-300 ${
                                                selectedOption === null
                                                    ? 'border-gray-500 text-gray-400'
                                                    : idx === correctIdx
                                                        ? 'border-green-400 text-green-400 bg-green-900/40'
                                                        : idx === selectedOption
                                                            ? 'border-red-400 text-red-400 bg-red-900/40'
                                                            : 'border-gray-700 text-gray-600'
                                            }`}>
                                                {selectedOption !== null && idx === correctIdx ? (
                                                    <Check className="h-5 w-5" />
                                                ) : selectedOption !== null && idx === selectedOption && idx !== correctIdx ? (
                                                    <X className="h-5 w-5" />
                                                ) : (
                                                    optionLabels[idx]
                                                )}
                                            </span>
                                            <span className="text-lg leading-relaxed pt-1.5 flex-1">
                                                <LatexWithImages>{opt}</LatexWithImages>
                                            </span>
                                        </button>
                                    ))}
                                </div>

                                {/* Answer */}
                                {showExplanation && currentQuestion.answer && (
                                    <div className="mb-4 p-4 rounded-xl bg-blue-950/40 border border-blue-800">
                                        <p className="text-sm font-bold text-blue-400 mb-2">Answer</p>
                                        <div className="text-base text-gray-200">
                                            <LatexWithImages>{currentQuestion.answer}</LatexWithImages>
                                        </div>
                                    </div>
                                )}

                                {/* Explanation */}
                                {showExplanation && currentQuestion.explanation && (
                                    <div className="p-4 rounded-xl bg-gray-900 border border-gray-700">
                                        <p className="text-sm font-bold text-yellow-400 mb-3">Explanation</p>
                                        <div className="text-base text-gray-300 leading-relaxed">
                                            <LatexWithImages>{currentQuestion.explanation}</LatexWithImages>
                                        </div>
                                    </div>
                                )}

                                {/* Hint (if no explanation) */}
                                {showExplanation && !currentQuestion.explanation && currentQuestion.hint && (
                                    <div className="p-4 rounded-xl bg-gray-900 border border-gray-700">
                                        <p className="text-sm font-bold text-purple-400 mb-2">Hint</p>
                                        <div className="text-base text-gray-300">
                                            <LatexWithImages>{currentQuestion.hint}</LatexWithImages>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </div>

                    {/* ─── Navigation Bar ─── */}
                    {totalQuestions > 0 && (
                        <div className="flex-shrink-0 bg-gray-950 border-t border-gray-800 px-6 py-3 flex items-center justify-between">
                            <button
                                onClick={goBack}
                                disabled={currentIndex === 0}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all ${
                                    currentIndex === 0
                                        ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                                        : 'bg-gray-800 text-white hover:bg-gray-700 active:scale-95'
                                }`}
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back
                            </button>

                            <div className="flex items-center gap-2">
                                {Array.from({ length: Math.min(totalQuestions, 15) }, (_, i) => {
                                    const start = Math.max(0, Math.min(currentIndex - 7, totalQuestions - 15));
                                    const qIdx = start + i;
                                    if (qIdx >= totalQuestions) return null;
                                    return (
                                        <button
                                            key={qIdx}
                                            onClick={() => { setCurrentIndex(qIdx); setSelectedOption(null); setShowExplanation(false); }}
                                            className={`w-7 h-7 rounded-full text-xs font-bold transition-all ${
                                                qIdx === currentIndex
                                                    ? 'bg-blue-600 text-white scale-110'
                                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                                            }`}
                                        >
                                            {qIdx + 1}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={goNext}
                                disabled={currentIndex >= totalQuestions - 1}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all ${
                                    currentIndex >= totalQuestions - 1
                                        ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                                        : 'bg-blue-600 text-white hover:bg-blue-500 active:scale-95'
                                }`}
                            >
                                Next
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
