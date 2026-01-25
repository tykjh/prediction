import React, { useEffect, useRef, useState, useCallback } from 'react';

/* 
 * ==========================================
 * PARTICLE LIFE ENGINE
 * ==========================================
 */
const ParticleLife = () => {
    const canvasRef = useRef(null);
    const [params, setParams] = useState({
        particleCount: 800,
        friction: 0.92,
        forceMultiplier: 0.5,
        interactionRadius: 80,
    });

    // Mouse Interaction
    const mouseRef = useRef({ x: 0, y: 0, isDown: false, mode: 'attract' });

    // Rules: rule[a][b] = force that 'b' exerts on 'a'
    const [rules, setRules] = useState([]);
    const [colors] = useState(['#ef4444', '#22c55e', '#3b82f6', '#eab308', '#a855f7', '#ec4899']); // Extended palette
    const types = colors.length;

    const animationRef = useRef(null);
    const atomsRef = useRef([]);

    // Initialize Rules
    const randomizeRules = useCallback(() => {
        const newRules = [];
        for (let i = 0; i < types; i++) {
            newRules[i] = [];
            for (let j = 0; j < types; j++) {
                // Skew towards attraction/repulsion peaks
                newRules[i][j] = (Math.random() * 2 - 1);
            }
        }
        setRules(newRules);
    }, [types]);

    // Initialize Atoms
    const initAtoms = useCallback(() => {
        const atoms = [];
        for (let i = 0; i < params.particleCount; i++) {
            atoms.push({
                x: Math.random() * 800,
                y: Math.random() * 600,
                vx: 0,
                vy: 0,
                color: Math.floor(Math.random() * types)
            });
        }
        atomsRef.current = atoms;
    }, [params.particleCount, types]);

    useEffect(() => {
        randomizeRules();
        initAtoms();
    }, [randomizeRules, initAtoms]);

    // Input Handlers
    const handleMouseDown = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        mouseRef.current.isDown = true;
        mouseRef.current.x = e.clientX - rect.left;
        mouseRef.current.y = e.clientY - rect.top;
        mouseRef.current.mode = e.shiftKey ? 'repel' : 'attract';
    };

    const handleMouseMove = (e) => {
        if (!mouseRef.current.isDown) return;
        const rect = canvasRef.current.getBoundingClientRect();
        mouseRef.current.x = e.clientX - rect.left;
        mouseRef.current.y = e.clientY - rect.top;
    };

    const handleMouseUp = () => {
        mouseRef.current.isDown = false;
    };

    // Physics Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const resizeObserver = new ResizeObserver(() => {
            canvas.width = canvas.parentElement.clientWidth;
            canvas.height = 600;
        });
        resizeObserver.observe(canvas.parentElement);

        const loop = () => {
            if (!canvas || !atomsRef.current) return;
            const width = canvas.width;
            const height = canvas.height;
            const atoms = atomsRef.current;

            ctx.fillStyle = "#020617";
            ctx.fillRect(0, 0, width, height);

            for (let i = 0; i < atoms.length; i++) {
                let fx = 0;
                let fy = 0;
                const a = atoms[i];

                // Particle Interaction
                for (let j = 0; j < atoms.length; j++) {
                    if (i === j) continue;
                    const b = atoms[j];
                    let dx = a.x - b.x;
                    let dy = a.y - b.y;

                    if (dx > width * 0.5) dx -= width;
                    if (dx < -width * 0.5) dx += width;
                    if (dy > height * 0.5) dy -= height;
                    if (dy < -height * 0.5) dy += height;

                    const distSq = dx * dx + dy * dy;
                    if (distSq > 0 && distSq < params.interactionRadius * params.interactionRadius) {
                        const dist = Math.sqrt(distSq);
                        const F = rules[a.color]?.[b.color] || 0;
                        const f = F * (1 / dist);
                        fx += (dx / dist) * f;
                        fy += (dy / dist) * f;
                    }
                }

                // Mouse Interaction
                if (mouseRef.current.isDown) {
                    let dx = a.x - mouseRef.current.x;
                    let dy = a.y - mouseRef.current.y;
                    // No wrap for mouse
                    const distSq = dx * dx + dy * dy;
                    if (distSq < 200 * 200) {
                        const dist = Math.sqrt(distSq);
                        const f = (mouseRef.current.mode === 'attract' ? -1.5 : 2.0) / (dist + 0.1);
                        fx += (dx / dist) * f;
                        fy += (dy / dist) * f;
                    }
                }

                a.vx = (a.vx + fx * params.forceMultiplier) * params.friction;
                a.vy = (a.vy + fy * params.forceMultiplier) * params.friction;
                a.x += a.vx;
                a.y += a.vy;

                if (a.x <= 0) a.x += width;
                if (a.x >= width) a.x -= width;
                if (a.y <= 0) a.y += height;
                if (a.y >= height) a.y -= height;

                ctx.fillStyle = colors[a.color];
                ctx.fillRect(a.x, a.y, 2, 2);
            }

            animationRef.current = requestAnimationFrame(loop);
        };

        animationRef.current = requestAnimationFrame(loop);

        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            cancelAnimationFrame(animationRef.current);
            window.removeEventListener('mouseup', handleMouseUp);
            resizeObserver.disconnect();
        };
    }, [rules, params, colors]);

    return (
        <div className="flex flex-col gap-4 w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-800/50 rounded-xl border border-white/10 text-sm">
                <div className="space-y-1">
                    <label className="text-slate-400 text-xs font-bold uppercase">Particles</label>
                    <div className="flex items-center gap-2 text-white font-mono">
                        <input type="range" min="100" max="1500" value={params.particleCount} onChange={e => { setParams({ ...params, particleCount: Number(e.target.value) }); initAtoms(); }} className="w-full accent-indigo-500" />
                        {params.particleCount}
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-slate-400 text-xs font-bold uppercase">Force Strength</label>
                    <div className="flex items-center gap-2 text-white font-mono">
                        <input type="range" min="0.1" max="2.0" step="0.1" value={params.forceMultiplier} onChange={e => setParams({ ...params, forceMultiplier: Number(e.target.value) })} className="w-full accent-emerald-500" />
                        {params.forceMultiplier}
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-slate-400 text-xs font-bold uppercase">Friction</label>
                    <div className="flex items-center gap-2 text-white font-mono">
                        <input type="range" min="0.50" max="0.99" step="0.01" value={params.friction} onChange={e => setParams({ ...params, friction: Number(e.target.value) })} className="w-full accent-rose-500" />
                        {params.friction}
                    </div>
                </div>
                <div className="flex items-end">
                    <button onClick={() => { initAtoms(); randomizeRules(); }} className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-bold text-white transition-colors text-xs uppercase tracking-wider">
                        Re-Roll Universe
                    </button>
                </div>
            </div>

            <div className="relative w-full h-[600px] bg-slate-950 rounded-2xl overflow-hidden border border-white/10 shadow-2xl group cursor-crosshair">
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                />

                {/* Rule Matrix Overlay */}
                <div className="absolute bottom-4 right-4 p-3 bg-slate-900/90 backdrop-blur-md rounded-xl border border-white/10 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity">
                    <div className="grid grid-cols-6 gap-px bg-slate-800 border border-slate-700">
                        {rules.map((row, i) => row.map((val, j) => (
                            <div key={`${i}-${j}`} className="w-2 h-2" style={{
                                backgroundColor: val > 0 ? colors[i] : (val < 0 ? colors[j] : 'transparent'),
                                opacity: Math.abs(val)
                            }} />
                        )))}
                    </div>
                    <div className="text-[10px] text-center text-slate-500 mt-1 uppercase font-bold tracking-widest">DNA</div>
                </div>

                <div className="absolute top-4 left-4 pointer-events-none">
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 text-white text-xs font-bold border border-white/10">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                        Click & Drag to influence
                    </span>
                </div>
            </div>
        </div>
    );
};


/* 
 * ==========================================
 * DOUBLE PENDULUM CHAOS
 * ==========================================
 */
const DoublePendulum = () => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const [dragging, setDragging] = useState(false);

    // Config
    const [config, setConfig] = useState({
        g: 1.0,
        trailLength: 500,
        colorMode: 'speed' // 'speed' | 'time'
    });

    const stateRef = useRef({
        t1: Math.PI / 2,
        t2: Math.PI / 2,
        v1: 0,
        v2: 0,
        path: []
    });

    const params = useRef({
        l1: 150, l2: 150, m1: 10, m2: 10, damping: 0.999
    });

    const reset = () => {
        stateRef.current = {
            t1: Math.PI / 2 + (Math.random() - 0.5),
            t2: Math.PI / 2 + (Math.random() - 0.5),
            v1: 0, v2: 0,
            path: []
        };
    };

    // Interaction
    const handleMouseDown = () => {
        setDragging(true);
        // Pause physics, perhaps? Or just apply torque.
        // For simplicity, let's just "catch" it and stop logic updates while dragging in the loop
    };

    const handleMouseUp = () => setDragging(false);

    const handleMouseMove = (e) => {
        if (!dragging || !canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 3;

        // Simple IK-ish: just set theta1 based on mouse angle roughly
        stateRef.current.t1 = Math.atan2(x, y);
        stateRef.current.v1 = 0;
        stateRef.current.v2 = 0;
        stateRef.current.path = []; // Reset trail on manual interaction
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        // Fix: Use ResizeObserver instead of resizing in loop
        const resizeObserver = new ResizeObserver(() => {
            canvas.width = canvas.parentElement.clientWidth;
            canvas.height = 600;
        });
        resizeObserver.observe(canvas.parentElement);

        const loop = () => {
            const { l1, l2, m1, m2, damping } = params.current;
            const g = config.g;
            let { t1, t2, v1, v2, path } = stateRef.current;

            if (!dragging) {
                // Physics (Lagrangian)
                const num1 = -g * (2 * m1 + m2) * Math.sin(t1);
                const num2 = -m2 * g * Math.sin(t1 - 2 * t2);
                const num3 = -2 * Math.sin(t1 - t2) * m2;
                const num4 = v2 * v2 * l2 + v1 * v1 * l1 * Math.cos(t1 - t2);
                const den = l1 * (2 * m1 + m2 - m2 * Math.cos(2 * t1 - 2 * t2));
                const a1 = (num1 + num2 + num3 * num4) / den;

                const num1_2 = 2 * Math.sin(t1 - t2);
                const num2_2 = (v1 * v1 * l1 * (m1 + m2));
                const num3_2 = g * (m1 + m2) * Math.cos(t1);
                const num4_2 = v2 * v2 * l2 * m2 * Math.cos(t1 - t2);
                const den_2 = l2 * (2 * m1 + m2 - m2 * Math.cos(2 * t1 - 2 * t2));
                const a2 = (num1_2 * (num2_2 + num3_2 + num4_2)) / den_2;

                v1 = (v1 + a1) * damping;
                v2 = (v2 + a2) * damping;
                t1 += v1;
                t2 += v2;

                stateRef.current.t1 = t1;
                stateRef.current.t2 = t2;
                stateRef.current.v1 = v1;
                stateRef.current.v2 = v2;
            }

            // Render
            // canvas.width = canvas.parentElement.clientWidth; // Removed to prevent potential re-flow shrinking loop
            // canvas.height = 600; 
            const width = canvas.width;
            const height = canvas.height;
            const ox = width / 2;
            const oy = height / 3;

            const x1 = ox + l1 * Math.sin(stateRef.current.t1);
            const y1 = oy + l1 * Math.cos(stateRef.current.t1);
            const x2 = x1 + l2 * Math.sin(stateRef.current.t2);
            const y2 = y1 + l2 * Math.cos(stateRef.current.t2);

            // Store Trace
            if (!dragging) {
                const speed = Math.sqrt(v1 * v1 + v2 * v2);
                const hue = config.colorMode === 'speed' ? Math.min(360, speed * 200) : (path.length % 360);
                path.push({ x: x2, y: y2, color: `hsl(${hue}, 80%, 60%)` });
                if (path.length > config.trailLength) path.shift();
            }

            // Draw
            ctx.fillStyle = '#020617';
            ctx.fillRect(0, 0, width, height);

            // Trail
            if (path.length > 1) {
                ctx.lineWidth = 2;
                for (let i = 0; i < path.length - 1; i++) {
                    ctx.beginPath();
                    ctx.strokeStyle = path[i].color;
                    ctx.moveTo(path[i].x, path[i].y);
                    ctx.lineTo(path[i + 1].x, path[i + 1].y);
                    ctx.stroke();
                }
            }

            // Arm
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(ox, oy);
            ctx.lineTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            // Joints
            ctx.fillStyle = '#f8fafc';
            ctx.beginPath(); ctx.arc(ox, oy, 6, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(x1, y1, 8, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = dragging ? '#ef4444' : '#3b82f6';
            ctx.beginPath(); ctx.arc(x2, y2, 12, 0, Math.PI * 2); ctx.fill();

            animationRef.current = requestAnimationFrame(loop);
        };

        animationRef.current = requestAnimationFrame(loop);

        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            cancelAnimationFrame(animationRef.current);
            window.removeEventListener('mouseup', handleMouseUp);
            resizeObserver.disconnect();
        };
    }, [config]);

    return (
        <div className="flex flex-col gap-4 w-full">
            <div className="flex flex-wrap lg:flex-nowrap justify-between items-center p-4 bg-slate-800/50 rounded-xl border border-white/10 gap-4">
                <div className="flex flex-col gap-1">
                    <h3 className="text-xl font-bold text-white">Double Pendulum</h3>
                    <div className="flex gap-4 text-xs text-slate-400">
                        <label className="flex items-center gap-2">
                            Gravity
                            <input type="range" min="0.1" max="3" step="0.1" value={config.g} onChange={e => setConfig({ ...config, g: Number(e.target.value) })} className="w-24 accent-indigo-500 h-1.5 bg-slate-700 rounded-lg appearance-none" />
                        </label>
                        <label className="flex items-center gap-2">
                            Trail
                            <input type="range" min="0" max="2000" value={config.trailLength} onChange={e => setConfig({ ...config, trailLength: Number(e.target.value) })} className="w-24 accent-pink-500 h-1.5 bg-slate-700 rounded-lg appearance-none" />
                        </label>
                    </div>
                </div>
                <button onClick={reset} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-bold transition-all shadow-lg active:scale-95 text-sm uppercase tracking-wider">
                    Kick System
                </button>
            </div>
            <div className="relative w-full h-[600px] bg-slate-950 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                <canvas
                    ref={canvasRef}
                    className={`absolute inset-0 w-full h-full ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                />
                <div className="absolute top-4 left-4 pointer-events-none opacity-50">
                    <span className="text-white text-xs font-bold bg-slate-800/80 px-2 py-1 rounded">Drag to Reset</span>
                </div>
            </div>
        </div>
    );
};

/* 
 * ==========================================
 * MAIN MODULE
 * ==========================================
 */
const ChaosLab = () => {
    const [mode, setMode] = useState('particle'); // 'particle' | 'pendulum'

    return (
        <div className="flex flex-col gap-6 w-full animate-in slide-in-from-bottom duration-700">
            <div className="flex justify-center">
                <div className="bg-slate-900/80 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 flex shadow-xl">
                    <button
                        onClick={() => setMode('particle')}
                        className={`px-8 py-2.5 rounded-xl transition-all font-bold tracking-wide ${mode === 'particle' ? 'bg-indigo-600 text-white shadow-lg ring-1 ring-white/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                        Particle Life
                    </button>
                    <button
                        onClick={() => setMode('pendulum')}
                        className={`px-8 py-2.5 rounded-xl transition-all font-bold tracking-wide ${mode === 'pendulum' ? 'bg-indigo-600 text-white shadow-lg ring-1 ring-white/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                        Double Pendulum
                    </button>
                </div>
            </div>

            {mode === 'particle' ? <ParticleLife /> : <DoublePendulum />}
        </div>
    );
};

export default ChaosLab;
