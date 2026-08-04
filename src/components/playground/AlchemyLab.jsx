import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

/*
 * ALECHIMY LAB
 * A Falling Sand Cellular Automata Engine
 * Optimized with Uint8Array and direct pixel manipulation
 */

// Element IDs
const EMPTY = 0;
const SAND = 1;
const WATER = 2;
const STONE = 3;
const FIRE = 4;
const WOOD = 5;
const ACID = 6;
const GUNPOWDER = 7;
const SMOKE = 8;
const STEAM = 9;

// Colors (Checkered variants for texture)
const PALETTE = {
    [EMPTY]: [15, 23, 42, 255], // Slate 900
    [SAND]: [234, 179, 8, 255], // Yellow 500
    [WATER]: [59, 130, 246, 200], // Blue 500 (transparent ish)
    [STONE]: [100, 116, 139, 255], // Slate 500
    [FIRE]: [239, 68, 68, 255], // Red 500
    [WOOD]: [120, 53, 15, 255], // Brown
    [ACID]: [34, 197, 94, 220], // Green 500
    [GUNPOWDER]: [30, 41, 59, 255], // Dark gray
    [SMOKE]: [71, 85, 105, 150],
    [STEAM]: [203, 213, 225, 150],
};

const WIDTH = 200; // Physics resolution (upscaled for display)
const HEIGHT = 150;
const SIZE = WIDTH * HEIGHT;

const AlchemyLab = () => {
    const { t } = useLanguage();
    const canvasRef = useRef(null);
    const [selectedElement, setSelectedElement] = useState(SAND);
    const [brushSize, setBrushSize] = useState(3);
    const [isPaused, setIsPaused] = useState(false);

    // Physics State (Refs for performance, no React re-renders on loop)
    const gridRef = useRef(new Uint8Array(SIZE));
    const nextGridRef = useRef(new Uint8Array(SIZE));
    const animationRef = useRef(null);
    const mouseRef = useRef({ x: 0, y: 0, isDown: false });

    // Helpers
    const getIdx = (x, y) => x + y * WIDTH;
    const inBounds = (x, y) => x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT;

    // Simulation Loop
    const step = useCallback(() => {
        const grid = gridRef.current;
        const nextGrid = nextGridRef.current;

        // Reset next grid (safe copy or clear? clearing is safer for determinism involved here)
        // Actually, copying is better to avoid "erasing" static blocks if we only process active ones.
        // But for simple sand, we usually iterate bottom-up and move directly in array or use swap.
        // Let's use a single buffer with careful swapping for speed, or double buffer.
        // Single buffer is trickier but faster. Double buffer avoids directional bias.
        // Let's use Single Buffer with random column order or alternating scan to minimize bias?
        // Simple Bottom-Up scan is standard for sand.

        // Clearing "nextGrid" isn't right if we act in place.
        // Let's trying IN-PLACE modification for maximum chaos speed.

        // Interactions
        for (let y = HEIGHT - 1; y >= 0; y--) {
            // Randomize X direction to prevent stacking bias
            const leftToRight = Math.random() > 0.5;
            const startX = leftToRight ? 0 : WIDTH - 1;
            const stepX = leftToRight ? 1 : -1;

            for (let i = 0; i < WIDTH; i++) {
                const x = startX + (i * stepX);
                const idx = getIdx(x, y);
                const type = grid[idx];

                if (type === EMPTY) continue;
                if (type === STONE) continue; // Static

                // Falling Logic (Gravity)
                if (type === SAND || type === GUNPOWDER) {
                    const below = getIdx(x, y + 1);
                    const belowLeft = getIdx(x - 1, y + 1);
                    const belowRight = getIdx(x + 1, y + 1);

                    if (y < HEIGHT - 1) {
                        if (grid[below] === EMPTY || grid[below] === WATER || grid[below] === ACID) {
                            // Displace liquid
                            if (grid[below] !== EMPTY) {
                                grid[idx] = grid[below]; // Swap
                                grid[below] = type;
                            } else {
                                grid[below] = type;
                                grid[idx] = EMPTY;
                            }
                        } else if (inBounds(x - 1, y + 1) && grid[belowLeft] === EMPTY) {
                            grid[belowLeft] = type;
                            grid[idx] = EMPTY;
                        } else if (inBounds(x + 1, y + 1) && grid[belowRight] === EMPTY) {
                            grid[belowRight] = type;
                            grid[idx] = EMPTY;
                        }
                    }
                }

                // Liquid Logic
                if (type === WATER || type === ACID) {
                    if (y < HEIGHT - 1) {
                        // Fall down
                        const below = getIdx(x, y + 1);
                        if (grid[below] === EMPTY) {
                            grid[below] = type;
                            grid[idx] = EMPTY;
                            continue;
                        } else if (grid[below] === FIRE) {
                            // Extinguish
                            grid[below] = SMOKE;
                            grid[idx] = STEAM;
                            continue;
                        }
                    }

                    // Flow sideways
                    const dir = Math.random() > 0.5 ? 1 : -1;
                    if (inBounds(x + dir, y) && grid[getIdx(x + dir, y)] === EMPTY) {
                        grid[getIdx(x + dir, y)] = type;
                        grid[idx] = EMPTY;
                    } else if (inBounds(x - dir, y) && grid[getIdx(x - dir, y)] === EMPTY) {
                        grid[getIdx(x - dir, y)] = type;
                        grid[idx] = EMPTY;
                    }
                }

                // Gas Logic (Smoke/Steam/Fire)
                if (type === SMOKE || type === STEAM || type === FIRE) {
                    if (Math.random() > 0.7) { // Dissipate chance
                        grid[idx] = EMPTY;
                        continue;
                    }
                    if (y > 0) {
                        const above = getIdx(x, y - 1);
                        if (grid[above] === EMPTY) {
                            grid[above] = type;
                            grid[idx] = EMPTY;
                        } else if (inBounds(x + (Math.random() > 0.5 ? 1 : -1), y - 1)) {
                            // Rise randomness
                        }
                    }
                }

                // Reaction: Acid eats Stone/Wood
                if (type === ACID) {
                    const neighbors = [
                        getIdx(x, y + 1), getIdx(x, y - 1), getIdx(x + 1, y), getIdx(x - 1, y)
                    ];
                    neighbors.forEach(nIdx => {
                        if (grid[nIdx] === STONE || grid[nIdx] === WOOD) {
                            if (Math.random() > 0.95) {
                                grid[nIdx] = EMPTY; // Dissolve
                                grid[idx] = EMPTY; // Used up
                            }
                        }
                    });
                }

                // Reaction: Fire burns Wood/Gunpowder
                if (type === FIRE) {
                    const neighbors = [
                        getIdx(x, y + 1), getIdx(x, y - 1), getIdx(x + 1, y), getIdx(x - 1, y)
                    ];
                    neighbors.forEach(nIdx => {
                        if (grid[nIdx] === WOOD) {
                            if (Math.random() > 0.9) grid[nIdx] = FIRE; // Spread
                        }
                        if (grid[nIdx] === GUNPOWDER) {
                            grid[nIdx] = FIRE; // Instant ignite
                            // Explosion simulation: clear area
                            // Simplified implementation for now
                        }
                        if (grid[nIdx] === WATER) {
                            grid[idx] = EMPTY; // Die
                        }
                    });
                }
            }
        }

        // Input Handling (Painting)
        if (mouseRef.current.isDown) {
            const { x, y } = mouseRef.current;
            const r = brushSize;
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    if (dx * dx + dy * dy <= r * r) {
                        const px = Math.floor(x) + dx;
                        const py = Math.floor(y) + dy;
                        if (inBounds(px, py)) {
                            // Don't overwrite if not empty, unless brush is strong (optional)
                            // For now, overwrite everything
                            grid[getIdx(px, py)] = selectedElement;
                        }
                    }
                }
            }
        }

    }, [brushSize, selectedElement]);

    // Render Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { alpha: false });

        // Create ImageData buffer
        const imageData = ctx.createImageData(WIDTH, HEIGHT);
        const data = imageData.data;

        const loop = () => {
            if (!isPaused) step();

            // Draw
            const grid = gridRef.current;
            for (let i = 0; i < SIZE; i++) {
                const type = grid[i];
                const color = PALETTE[type] || PALETTE[EMPTY];
                const offset = i * 4;

                // Add some noise for texture
                const noise = (type !== EMPTY && type !== STONE) ? (Math.random() * 20 - 10) : 0;

                data[offset] = Math.min(255, Math.max(0, color[0] + noise));     // R
                data[offset + 1] = Math.min(255, Math.max(0, color[1] + noise)); // G
                data[offset + 2] = Math.min(255, Math.max(0, color[2] + noise)); // B
                data[offset + 3] = 255;      // A
            }

            // Put data to temp canvas then draw scaled? 
            // Canvas logic: we set canvas width/height to Resolution, use CSS to scale up
            ctx.putImageData(imageData, 0, 0);

            animationRef.current = requestAnimationFrame(loop);
        };
        animationRef.current = requestAnimationFrame(loop);

        return () => cancelAnimationFrame(animationRef.current);
    }, [isPaused, step]);


    // Mouse Events
    const handleMouseDown = (e) => {
        mouseRef.current.isDown = true;
        updateMousePos(e);
    };
    const handleMouseUp = () => mouseRef.current.isDown = false;
    const handleMouseMove = (e) => updateMousePos(e);

    const updateMousePos = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = WIDTH / rect.width;
        const scaleY = HEIGHT / rect.height;
        mouseRef.current.x = (e.clientX - rect.left) * scaleX;
        mouseRef.current.y = (e.clientY - rect.top) * scaleY;
    };

    return (
        <div className="flex flex-col gap-4 w-full h-full animate-in fade-in">
            {/* Toolbar */}
            <div className="bg-slate-900/90 backdrop-blur border border-white/10 p-4 rounded-xl flex flex-wrap gap-4 items-center justify-between shadow-xl">
                <div className="flex gap-2 bg-slate-800 p-1 rounded-lg overflow-x-auto max-w-full">
                    {[
                        { id: SAND, key: 'sand', color: 'bg-yellow-500' },
                        { id: WATER, key: 'water', color: 'bg-blue-500' },
                        { id: STONE, key: 'stone', color: 'bg-slate-500' },
                        { id: WOOD, key: 'wood', color: 'bg-amber-800' },
                        { id: FIRE, key: 'fire', color: 'bg-red-500' },
                        { id: GUNPOWDER, key: 'gunpowder', color: 'bg-slate-900 border border-slate-600' },
                        { id: ACID, key: 'acid', color: 'bg-green-500' },
                        { id: EMPTY, key: 'eraser', color: 'bg-slate-700' },
                    ].map(el => (
                        <button
                            key={el.id}
                            onClick={() => setSelectedElement(el.id)}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-all
                            ${selectedElement === el.id ? 'bg-white text-slate-900 shadow-lg scale-105' : 'text-slate-300 hover:bg-slate-700'}`}
                        >
                            <div className={`w-3 h-3 rounded-full ${el.color}`}></div>
                            {t(`alchemyLab.elements.${el.key}`)}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-4 border-l border-white/10 pl-4">
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase font-bold text-slate-500">{t('alchemyLab.brushSize')}</span>
                        <input type="range" min="1" max="10" value={brushSize} onChange={e => setBrushSize(Number(e.target.value))} className="w-24 accent-indigo-500 h-1.5 bg-slate-700 rounded-lg appearance-none" />
                    </div>
                    <button
                        onClick={() => setIsPaused(!isPaused)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-all ${isPaused ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'}`}
                    >
                        {isPaused ? '▶' : '⏸'}
                    </button>
                    <button
                        onClick={() => gridRef.current.fill(EMPTY)}
                        className="text-xs font-bold text-red-400 hover:text-red-300 uppercase"
                    >
                        {t('alchemyLab.clear')}
                    </button>
                </div>
            </div>

            {/* Viewport */}
            <div className="flex-1 bg-slate-950 rounded-2xl border border-white/10 shadow-2xl overflow-hidden relative touch-none">
                <canvas
                    ref={canvasRef}
                    width={WIDTH}
                    height={HEIGHT}
                    className="w-full h-full image-pixelated cursor-crosshair"
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseUp}
                    style={{ imageRendering: 'pixelated' }}
                />
                <div className="absolute top-4 left-4 pointer-events-none opacity-50">
                    <div className="text-[10px] text-slate-500 font-mono">
                        {t('alchemyLab.simulationRunning')}<br />
                        {t('alchemyLab.gridInfo')}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AlchemyLab;
