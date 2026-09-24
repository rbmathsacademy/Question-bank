'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Undo2, Redo2, Eraser, PenTool, MousePointer2 } from 'lucide-react';
import { getStroke } from 'perfect-freehand';

type Point = { x: number; y: number; pressure?: number };

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
    const [activeColor, setActiveColor] = useState('#FFF176');
    const [strokeWidth, setStrokeWidth] = useState(1);
    const eraserWidth = 20;

    // UI State
    const [showColors, setShowColors] = useState(false);

    // Drawing Ref State (mutated during drawing for performance)
    const currentStroke = useRef<Stroke | null>(null);
    const isDrawing = useRef(false);
    const lastRenderTime = useRef(0);
    const pendingRender = useRef(false);
    const rAFId = useRef(0);
    
    // Canvases
    const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);

    const dirtyRectRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

    const getDpr = () => Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2);

    const renderStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
        if (stroke.points.length === 0) return;
        const rawPoints = stroke.points.map(p => [p.x, p.y, p.pressure || 0.5] as number[]);
        const outline = getStroke(rawPoints, {
            size: stroke.width * 2.5,
            thinning: 0.6,
            smoothing: 0.5,
            streamline: 0.5,
        });
        
        if (!outline || outline.length === 0) return;
        
        ctx.beginPath();
        ctx.moveTo(outline[0][0], outline[0][1]);
        
        for (let i = 0; i < outline.length; i++) {
            const [x0, y0] = outline[i];
            const [x1, y1] = outline[(i + 1) % outline.length];
            ctx.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
        }
        
        ctx.closePath();
        ctx.fillStyle = stroke.color;
        ctx.fill();
    };

    const updateBgCanvas = useCallback(() => {
        const bgCanvas = bgCanvasRef.current;
        if (!bgCanvas) return;
        
        const ctx = bgCanvas.getContext('2d');
        if (!ctx) return;
        
        const dpr = getDpr();
        ctx.clearRect(0, 0, bgCanvas.width / dpr, bgCanvas.height / dpr);
        
        strokes.forEach(stroke => renderStroke(ctx, stroke));
    }, [strokes]);

    // Sync bg canvas when strokes state changes
    useEffect(() => {
        updateBgCanvas();
        drawActive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [strokes, updateBgCanvas]);

    // ─── DRAWING ENGINE ───
    const drawActive = useCallback((predictedPoints: Point[] = []) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = getDpr();
        
        if (dirtyRectRef.current) {
            const { x, y, w, h } = dirtyRectRef.current;
            ctx.clearRect(x, y, w, h);
        } else {
            ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        }
        
        // 2. Draw current stroke
        if (currentStroke.current) {
            let pointsToRender = currentStroke.current.points;
            if (predictedPoints && predictedPoints.length > 0) {
                pointsToRender = [...pointsToRender, ...predictedPoints];
            }
            const tempStroke = { ...currentStroke.current, points: pointsToRender };

            // Compute bounding box for next clear
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            tempStroke.points.forEach(p => {
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
                if (p.y < minY) minY = p.y;
                if (p.y > maxY) maxY = p.y;
            });
            const pad = tempStroke.width * 5;
            dirtyRectRef.current = {
                x: minX - pad,
                y: minY - pad,
                w: (maxX - minX) + pad * 2,
                h: (maxY - minY) + pad * 2
            };

            renderStroke(ctx, tempStroke);
        } else {
            dirtyRectRef.current = null;
        }
    }, []);

    // ─── INIT & RESIZE ───
    useEffect(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        const bgCanvas = bgCanvasRef.current;
        if (!container || !canvas || !bgCanvas) return;

        const resizeCanvas = (e?: Event) => {
            const rect = container.getBoundingClientRect();
            // Handle high-DPI displays
            const dpr = getDpr();
            
            // Size Active Canvas
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

            // Size Background Canvas
            bgCanvas.width = rect.width * dpr;
            bgCanvas.height = rect.height * dpr;
            bgCanvas.style.width = `${rect.width}px`;
            bgCanvas.style.height = `${rect.height}px`;
            
            const bgCtx = bgCanvas.getContext('2d');
            if (bgCtx) {
                bgCtx.scale(dpr, dpr);
                bgCtx.lineCap = 'round';
                bgCtx.lineJoin = 'round';
            }

            updateBgCanvas();
            drawActive(); // Redraw after resize
        };

        window.addEventListener('resize', resizeCanvas as EventListener);
        resizeCanvas();

        return () => window.removeEventListener('resize', resizeCanvas as EventListener);
    }, [updateBgCanvas, drawActive]);

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


    // ─── EVENT HANDLERS ───
    const getPointerPos = (clientX: number, clientY: number, pressure?: number): Point => {
        const rect = canvasRef.current!.getBoundingClientRect();
        return {
            x: clientX - rect.left,
            y: clientY - rect.top,
            pressure: pressure || 0.5
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
        
        const pos = getPointerPos(e.clientX, e.clientY, e.pressure);
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
            drawActive();
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDrawing.current || activeTool === 'cursor') return;
        
        if (activeTool === 'eraser') {
            const pos = getPointerPos(e.clientX, e.clientY, e.pressure);
            // eslint-disable-next-line react-hooks/purity
            const now = performance.now();
            if (now - lastRenderTime.current > 16) {
                eraseAt(pos);
                lastRenderTime.current = now;
            }
        } else if (activeTool === 'pen' && currentStroke.current) {
            // Use getCoalescedEvents for high-frequency touch smoothing
            const events = e.nativeEvent.getCoalescedEvents ? e.nativeEvent.getCoalescedEvents() : [e.nativeEvent];
            events.forEach(ev => {
                currentStroke.current!.points.push(getPointerPos(ev.clientX, ev.clientY, (ev as PointerEvent).pressure));
            });

            const predictedEvents = (e.nativeEvent as any).getPredictedEvents ? (e.nativeEvent as any).getPredictedEvents() : [];
            const predictedPoints = predictedEvents.map((ev: any) => getPointerPos(ev.clientX, ev.clientY, ev.pressure));

            if (!pendingRender.current) {
                pendingRender.current = true;
                rAFId.current = requestAnimationFrame(() => {
                    drawActive(predictedPoints);
                    pendingRender.current = false;
                });
            }
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!isDrawing.current || activeTool === 'cursor') return;
        isDrawing.current = false;
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);

        if (activeTool === 'pen' && currentStroke.current) {
            cancelAnimationFrame(rAFId.current);
            pendingRender.current = false;
            
            // Final render before commit
            drawActive();


            const newStrokes = [...strokes, currentStroke.current];
            setStrokes(newStrokes);
            pushToHistory(newStrokes);
        }
        currentStroke.current = null;
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
            {/* BACKGROUND CANVAS (Static History) */}
            <canvas
                ref={bgCanvasRef}
                className="absolute inset-0 touch-none pointer-events-none"
                style={{ willChange: 'transform' }}
            />

            {/* ACTIVE CANVAS (Current Stroke) */}
            <canvas
                ref={canvasRef}
                className={`absolute inset-0 touch-none ${activeTool === 'cursor' ? 'pointer-events-none' : 'pointer-events-auto cursor-crosshair'}`}
                style={{ willChange: 'transform' }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onPointerLeave={handlePointerUp}
            />

            {/* COLOR OPTIONS POPUP */}
            {showColors && activeTool === 'pen' && (
                <div className="absolute bottom-20 left-4 z-50 bg-gray-900/95 backdrop-blur-md border border-gray-700 p-3 rounded-xl shadow-2xl pointer-events-auto flex flex-col gap-4">
                    
                    {/* Thickness Selector */}
                    <div className="flex items-center justify-between px-2 pb-3 border-b border-gray-700">
                        <span className="text-xs text-gray-400 font-medium">Thickness</span>
                        <div className="flex items-center gap-3">
                            {[1, 2, 3].map(w => (
                                <button
                                    key={w}
                                    onClick={() => { setStrokeWidth(w); setShowColors(false); }}
                                    className={`w-6 h-6 flex items-center justify-center rounded-full transition-colors ${strokeWidth === w ? 'bg-gray-700' : 'hover:bg-gray-800'}`}
                                >
                                    <div className="bg-white rounded-full" style={{ width: w * 3 + 2, height: w * 3 + 2 }} />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 justify-center">
                        <div className="grid grid-cols-6 gap-2">
                            {COLORS.map((colorSet) => (
                                <div key={colorSet.name} className="flex flex-col gap-2">
                                    {colorSet.variants.map((hex) => (
                                        <button
                                            key={hex}
                                            onClick={() => { setActiveColor(hex); setShowColors(false); }}
                                            className={`w-7 h-7 rounded-full border-2 transition-transform ${activeColor === hex ? 'scale-125 border-white shadow-[0_0_8px_rgba(255,255,255,0.6)] z-10' : 'border-transparent hover:scale-110'}`}
                                            style={{ backgroundColor: hex }}
                                            title={colorSet.name}
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* NEW BOTTOM ROW PALETTE */}
            <div className="absolute bottom-4 left-4 z-50 flex gap-2 pointer-events-auto bg-gray-900/90 backdrop-blur-md p-1.5 rounded-full border border-gray-700 shadow-xl">
                {/* Pen */}
                <button 
                    onClick={() => {
                        if (activeTool === 'pen') {
                            setShowColors(!showColors);
                        } else {
                            setActiveTool('pen');
                            setShowColors(false);
                        }
                    }}
                    className={`p-2.5 rounded-full transition-colors relative ${activeTool === 'pen' ? 'bg-blue-600 text-white shadow-lg' : 'bg-transparent text-gray-400 hover:text-white hover:bg-gray-800'}`}
                    title="Pen (Click again for colors)"
                >
                    <PenTool className="w-5 h-5" />
                    {activeTool === 'pen' && (
                        <span className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full border border-gray-900" style={{ backgroundColor: activeColor }} />
                    )}
                </button>

                {/* Eraser */}
                <button 
                    onClick={() => { setActiveTool('eraser'); setShowColors(false); }}
                    className={`p-2.5 rounded-full transition-colors ${activeTool === 'eraser' ? 'bg-blue-600 text-white shadow-lg' : 'bg-transparent text-gray-400 hover:text-white hover:bg-gray-800'}`}
                    title="Stroke Eraser"
                >
                    <Eraser className="w-5 h-5" />
                </button>

                {/* Undo */}
                <button 
                    onClick={undo}
                    disabled={historyStep === 0}
                    className="p-2.5 rounded-full bg-transparent text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-800 hover:text-white transition-colors"
                    title="Undo"
                >
                    <Undo2 className="w-5 h-5" />
                </button>

                {/* Redo */}
                <button 
                    onClick={redo}
                    disabled={historyStep === history.length - 1}
                    className="p-2.5 rounded-full bg-transparent text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-800 hover:text-white transition-colors"
                    title="Redo"
                >
                    <Redo2 className="w-5 h-5" />
                </button>

                {/* Pointer / Cursor */}
                <button
                    onClick={() => { setActiveTool('cursor'); setShowColors(false); }}
                    className={`p-2.5 rounded-full transition-colors ${activeTool === 'cursor' ? 'bg-blue-600 text-white shadow-lg' : 'bg-transparent text-gray-400 hover:text-white hover:bg-gray-800'}`}
                    title="Pointer Mode (Click Buttons)"
                >
                    <MousePointer2 className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
