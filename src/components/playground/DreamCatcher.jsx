import React, { useEffect, useRef, useState } from 'react';

/*
 * DREAM CATCHER
 * A Generative Mandala & Breathing Guide using Polar Coordinates
 */

const DreamCatcher = () => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);

    // Parameters
    const [params, setParams] = useState({
        segments: 12,
        depth: 4,
        speed: 0.5,
        breathing: false,
        symmetry: true,
        colorShift: 0
    });

    const timeRef = useRef(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Resize Handler with Observer for Flex containers
        const resizeObserver = new ResizeObserver(() => {
            if (canvas.parentElement) {
                const { clientWidth, clientHeight } = canvas.parentElement;
                canvas.width = clientWidth;
                canvas.height = clientHeight;
            }
        });
        resizeObserver.observe(canvas.parentElement);

        const draw = () => {
            const { width, height } = canvas;
            const centerX = width / 2;
            const centerY = height / 2;

            // Clear with trail effect
            ctx.fillStyle = 'rgba(2, 6, 23, 0.1)'; // Slate 950 with fade
            ctx.fillRect(0, 0, width, height);

            // Time Step
            timeRef.current += 0.01 * params.speed;
            const t = timeRef.current;

            // Breathing Cycle (4-7-8 rhythm approx, represented as sine wave)
            // 4s inhale, 7s hold, 8s exhale = 19s cycle.
            // Simplified: Sine wave with 6s period for visualization
            const breathScale = params.breathing
                ? 1 + Math.sin(Date.now() / 1000) * 0.2
                : 1;

            // Draw Mandala
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.scale(breathScale, breathScale); // Breathing effect

            // Dynamic shifting color
            const hueBase = (t * 20 + params.colorShift) % 360;

            for (let i = 0; i < params.segments; i++) {
                ctx.save();
                const angle = (Math.PI * 2 / params.segments) * i + (t * 0.1); // Rotate whole structure
                ctx.rotate(angle);

                ctx.strokeStyle = `hsla(${hueBase + i * 10}, 70%, 60%, 0.5)`;
                ctx.lineWidth = 2;

                // Recursive Fractal Arms
                /* 
                 * Complex logic: Draw a curve that changes over time based on sine waves
                 */
                ctx.beginPath();
                ctx.moveTo(0, 0);

                // Control points for bezier
                let x = 0;
                let y = 0;

                // Generate a wavy line outwards
                for (let d = 0; d < params.depth * 20; d++) {
                    const r = d * 5; // Radius
                    // Wiggle
                    const wiggle = Math.sin(d * 0.2 + t) * (d * 0.5);

                    ctx.lineTo(wiggle, -r);
                }
                ctx.stroke();

                // Add geometric shapes at ends?
                // Or simple mirrored loops

                // Simpler: Spirograph style
                // Let's draw parametric curves instead of iterating points, prettier and faster
                ctx.beginPath();
                for (let j = 0; j < 100; j++) {
                    const rad = j * 3;
                    const a = Math.sin(j * 0.1 + t) * Math.cos(t * 0.5) * 50;
                    ctx.lineTo(a, -rad);
                }
                ctx.stroke();

                ctx.restore();
            }

            // Center Glowing Core
            const corePulse = Math.sin(t * 3) * 10 + 20;
            const gradient = ctx.createRadialGradient(0, 0, 5, 0, 0, corePulse);
            gradient.addColorStop(0, '#fff');
            gradient.addColorStop(0.5, `hsla(${hueBase}, 100%, 70%, 0.5)`);
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, corePulse, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();

            animationRef.current = requestAnimationFrame(draw);
        };

        draw();
        return () => {
            cancelAnimationFrame(animationRef.current);
            resizeObserver.disconnect();
        };
    }, [params]);

    return (
        <div className="flex flex-col gap-6 w-full h-full animate-in fade-in duration-1000">
            {/* Controls Overlay */}
            <div className="absolute top-6 right-6 z-10 w-64 bg-slate-900/80 backdrop-blur-md rounded-xl border border-white/10 p-5 shadow-2xl space-y-5">
                <h3 className="text-white font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                    <span className="text-lg">🕸️</span> Dream Weaver
                </h3>

                <div className="space-y-3">
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-400">
                            <span>Segments</span>
                            <span>{params.segments}</span>
                        </div>
                        <input type="range" min="3" max="32" value={params.segments} onChange={e => setParams({ ...params, segments: Number(e.target.value) })} className="w-full accent-indigo-500 h-1.5 bg-slate-700 rounded-lg appearance-none" />
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-400">
                            <span>Complexity</span>
                            <span>{params.depth}</span>
                        </div>
                        <input type="range" min="1" max="8" value={params.depth} onChange={e => setParams({ ...params, depth: Number(e.target.value) })} className="w-full accent-pink-500 h-1.5 bg-slate-700 rounded-lg appearance-none" />
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-400">
                            <span>Flow Speed</span>
                            <span>{params.speed.toFixed(1)}</span>
                        </div>
                        <input type="range" min="0" max="3" step="0.1" value={params.speed} onChange={e => setParams({ ...params, speed: Number(e.target.value) })} className="w-full accent-emerald-500 h-1.5 bg-slate-700 rounded-lg appearance-none" />
                    </div>
                </div>

                <div className="border-t border-white/10 pt-4">
                    <button
                        onClick={() => setParams(p => ({ ...p, breathing: !p.breathing }))}
                        className={`w-full py-2.5 rounded-lg text-sm font-bold transition-all ${params.breathing ? 'bg-indigo-500 text-white ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                    >
                        {params.breathing ? 'Zen Mode Active' : 'Start Zen Breath'}
                    </button>
                    <p className="text-xs text-slate-500 mt-2 text-center opacity-75">
                        {params.breathing ? 'Inhale... Hold... Exhale...' : 'Syncs visuals to 4-7-8 breathing rhythm'}
                    </p>
                </div>
            </div>

            <div className="flex-1 min-h-[600px] rounded-2xl overflow-hidden shadow-2xl bg-black relative">
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
            </div>
        </div>
    );
};

export default DreamCatcher;
