'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Undo2, Redo2, Eraser, PenTool, ChevronLeft, ChevronRight, Palette, MousePointer2 } from 'lucide-react';

type Point = { x: number; y: number };

type Stroke = {
    id: string;
    points: Point[];
    color: string;
    width: number;
};

const COLORS = [
    { name: 'White', variants: ['#FFFFFF', '#A0A0A0'] },
    { name: 'Red', variants: ['#FF5252', '#B71C1C'] },
    { name: 'Orange', variants: ['#FFB74D', '#E65100'] },
    { name: 'Yellow', variants: ['#FFF176', '#F57F17'] },
    { name: 'Cyan', variants: ['#18FFFF', '#006064'] },
    { name: 'Magenta', variants: ['#FF4081', '#880E4F'] },
];

interface ScratchpadProps {
    resetKey: number | string; // Used to clear the board on question change
}

export default function Scratchpad({ resetKey }: ScratchpadProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    // State
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [history, setHistory] = useState<Stroke[][]>([]);
    const [historyStep, setHistoryStep] = useState<number>(0);
    
    // Tools
    const [activeTool, setActiveTool] = useState<'pen' | 'eraser' | 'cursor'>('pen');
    const [activeColor, setActiveColor] = useState('#FFFFFF');
    const [strokeWidth, setStrokeWidth] = useState(3);
    const eraserWidth = 20;

    // UI State
    const [isPaletteOpen, setIsPaletteOpen] = useState(true);

    // Drawing Ref State (mutated during drawing for performance)
    const currentStroke = useRef<Stroke | null>(null);
    const isDrawing = useRef(false);
    const lastRenderTime = useRef(0);

    // ─── DRAWING ENGINE ───
    const drawAllStrokes = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

        const allStrokes = [...strokes];
        if (currentStroke.current) {
            allStrokes.push(currentStroke.current);
        }

        allStrokes.forEach(stroke => {
            if (stroke.points.length === 0) return;
            
            ctx.beginPath();
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.width;

            if (stroke.points.length === 1) {
                // Draw dot
                const p = stroke.points[0];
                ctx.fillStyle = stroke.color;
                ctx.arc(p.x, p.y, stroke.width / 2, 0, Math.PI * 2);
                ctx.fill();
                return;
            }

            // Quadratic Bezier Curve Smoothing
            ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
            for (let i = 1; i < stroke.points.length - 1; i++) {
                const xc = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
                const yc = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
                ctx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, xc, yc);
            }
            // Curve to the last point
            const last = stroke.points[stroke.points.length - 1];
            ctx.lineTo(last.x, last.y);
            ctx.stroke();
        });
    }, [strokes]);

    // ─── INIT & RESIZE ───
    useEffect(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;

        const resizeCanvas = (e?: Event) => {
            const rect = container.getBoundingClientRect();
            // Handle high-DPI displays
            const dpr = window.devicePixelRatio || 1;
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            canvas.style.width = `${rect.width}px`;
            canvas.style.height = `${rect.height}px`;
            
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.scale(dpr, dpr);
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
            }
            drawAllStrokes(); // Redraw after resize
        };

        window.addEventListener('resize', resizeCanvas as EventListener);
        resizeCanvas();

        return () => window.removeEventListener('resize', resizeCanvas as EventListener);
    }, [drawAllStrokes]);

    // ─── CLEAR ON RESET ───
    useEffect(() => {
        setStrokes([]);
        setHistory([[]] as Stroke[][]);
        setHistoryStep(0);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx && canvasRef.current) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
    }, [resetKey]);

    // Sync canvas when strokes state changes
    useEffect(() => {
        drawAllStrokes();
    }, [strokes, drawAllStrokes]);

    // ─── EVENT HANDLERS ───
    const getPointerPos = (e: React.PointerEvent): Point => {
        const rect = canvasRef.current!.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const pushToHistory = (newStrokes: Stroke[]) => {
        const newHistory = history.slice(0, historyStep + 1);
        newHistory.push(newStrokes);
        // Keep max 10 steps
        if (newHistory.length > 11) newHistory.shift(); 
        
        setHistory(newHistory);
        setHistoryStep(newHistory.length - 1);
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        if (!canvasRef.current || activeTool === 'cursor') return;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        
        const pos = getPointerPos(e);
        isDrawing.current = true;

        if (activeTool === 'eraser') {
            eraseAt(pos);
        } else if (activeTool === 'pen') {
            currentStroke.current = {
                // eslint-disable-next-line react-hooks/purity
                id: Date.now().toString() + Math.random().toString(),
                points: [pos],
                color: activeColor,
                width: strokeWidth
            };
            drawAllStrokes();
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDrawing.current || activeTool === 'cursor') return;
        
        const pos = getPointerPos(e);

        if (activeTool === 'eraser') {
            // eslint-disable-next-line react-hooks/purity
            const now = performance.now();
            if (now - lastRenderTime.current > 16) {
                eraseAt(pos);
                lastRenderTime.current = now;
            }
        } else if (activeTool === 'pen' && currentStroke.current) {
            const ctx = canvasRef.current?.getContext('2d');
            if (ctx) {
                const points = currentStroke.current.points;
                const lastPoint = points[points.length - 1];
                
                // Draw incremental segment instantly
                ctx.beginPath();
                ctx.strokeStyle = currentStroke.current.color;
                ctx.lineWidth = currentStroke.current.width;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.moveTo(lastPoint.x, lastPoint.y);
                ctx.lineTo(pos.x, pos.y);
                ctx.stroke();

                points.push(pos);
            }
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!isDrawing.current || activeTool === 'cursor') return;
        isDrawing.current = false;
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);

        if (activeTool === 'pen' && currentStroke.current) {
            const newStrokes = [...strokes, currentStroke.current];
            setStrokes(newStrokes);
            pushToHistory(newStrokes);
            currentStroke.current = null;
            // The useEffect will trigger a full redraw with bezier curves smoothing out the jagged incremental lines!
        }
    };

    // ─── ERASER LOGIC ───
    // Distance from point to line segment
    const distToSegment = (p: Point, v: Point, w: Point) => {
        const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
        if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
        let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
    };

    const eraseAt = (pos: Point) => {
        setStrokes(prevStrokes => {
            const remaining = prevStrokes.filter(stroke => {
                // If it's a dot
                if (stroke.points.length === 1) {
                    return Math.hypot(stroke.points[0].x - pos.x, stroke.points[0].y - pos.y) > eraserWidth;
                }
                // Check all segments
                for (let i = 0; i < stroke.points.length - 1; i++) {
                    const dist = distToSegment(pos, stroke.points[i], stroke.points[i+1]);
                    if (dist <= eraserWidth) return false; // Delete stroke
                }
                return true;
            });
            
            // If something was actually deleted, push to history
            if (remaining.length !== prevStrokes.length) {
                pushToHistory(remaining);
            }
            return remaining;
        });
    };

    // ─── UNDO / REDO ───
    const undo = () => {
        if (historyStep > 0) {
            const newStep = historyStep - 1;
            setHistoryStep(newStep);
            setStrokes(history[newStep]);
        }
    };

    const redo = () => {
        if (historyStep < history.length - 1) {
            const newStep = historyStep + 1;
            setHistoryStep(newStep);
            setStrokes(history[newStep]);
        }
    };

    return (
        <div ref={containerRef} className="absolute inset-0 overflow-hidden bg-transparent z-40 pointer-events-none">
            {/* CANVAS */}
            <canvas
                ref={canvasRef}
                className={`absolute inset-0 touch-none ${activeTool === 'cursor' ? 'pointer-events-none' : 'pointer-events-auto cursor-crosshair'}`}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onPointerLeave={handlePointerUp}
            />

            {/* CURSOR BUTTON (Bottom Right of Left Panel) */}
            <button
                onClick={() => setActiveTool('cursor')}
                className={`absolute bottom-6 left-[calc(50%-4rem)] z-50 p-4 rounded-full shadow-2xl transition-all pointer-events-auto border-2 ${
                    activeTool === 'cursor' 
                        ? 'bg-blue-600 text-white border-blue-400 scale-110' 
                        : 'bg-gray-800 text-gray-400 border-gray-600 hover:text-white hover:bg-gray-700'
                }`}
                title="Pointer Mode (Click Buttons)"
            >
                <MousePointer2 className="w-6 h-6" />
            </button>

            {/* FLOATING PALETTE */}
            <div className={`absolute bottom-6 left-6 z-50 flex transition-transform duration-300 ${isPaletteOpen ? 'translate-x-0' : '-translate-x-[calc(100%+1.5rem)]'}`}>
                <div className="bg-gray-900/95 backdrop-blur-md border border-gray-700 p-2 rounded-xl shadow-2xl flex gap-3 pointer-events-auto items-center">
                    
                    {/* Tools */}
                    <div className="flex flex-col gap-2 pr-3 border-r border-gray-700">
                        <button 
                            onClick={() => setActiveTool('pen')}
                            className={`p-2 rounded-lg transition-colors ${activeTool === 'pen' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                            title="Pen"
                        >
                            <PenTool className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => setActiveTool('eraser')}
                            className={`p-2 rounded-lg transition-colors ${activeTool === 'eraser' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                            title="Stroke Eraser"
                        >
                            <Eraser className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Colors (Narrower) */}
                    <div className="flex flex-col gap-2 justify-center">
                        <div className="grid grid-cols-6 gap-1.5">
                            {COLORS.map((colorSet) => (
                                <div key={colorSet.name} className="flex flex-col gap-1.5">
                                    {colorSet.variants.map((hex) => (
                                        <button
                                            key={hex}
                                            onClick={() => { setActiveColor(hex); setActiveTool('pen'); }}
                                            className={`w-6 h-6 rounded-full border-2 transition-transform ${activeColor === hex && activeTool === 'pen' ? 'scale-125 border-white shadow-[0_0_8px_rgba(255,255,255,0.6)] z-10' : 'border-transparent hover:scale-110'}`}
                                            style={{ backgroundColor: hex }}
                                            title={colorSet.name}
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* History */}
                    <div className="flex flex-col gap-2 pl-3 border-l border-gray-700 justify-center">
                        <button 
                            onClick={undo}
                            disabled={historyStep === 0}
                            className="p-1.5 rounded-md bg-gray-800 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
                            title="Undo"
                        >
                            <Undo2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                            onClick={redo}
                            disabled={historyStep === history.length - 1}
                            className="p-1.5 rounded-md bg-gray-800 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
                            title="Redo"
                        >
                            <Redo2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* TOGGLE PALETTE BUTTON */}
            <button
                onClick={() => setIsPaletteOpen(!isPaletteOpen)}
                className={`absolute bottom-8 z-50 p-2 bg-gray-800 border border-gray-600 text-white rounded-r-lg shadow-lg pointer-events-auto transition-all duration-300 hover:bg-gray-700 ${isPaletteOpen ? 'left-[calc(100%-1rem)] opacity-0 pointer-events-none' : 'left-0'}`}
                title="Open Palette"
            >
                <ChevronRight className="w-4 h-4" />
            </button>
            <button
                onClick={() => setIsPaletteOpen(false)}
                className={`absolute bottom-[3.5rem] z-50 p-1 bg-gray-800 border border-gray-600 text-white rounded-full shadow-lg pointer-events-auto transition-all duration-300 hover:bg-gray-700 ${!isPaletteOpen ? 'opacity-0 pointer-events-none' : 'left-[220px]'}`}
                title="Hide Palette"
            >
                <ChevronLeft className="w-3 h-3" />
            </button>
        </div>
    );
}
