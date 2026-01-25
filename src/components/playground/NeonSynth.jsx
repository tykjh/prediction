import React, { useEffect, useRef, useState, useCallback } from 'react';

const NeonSynth = () => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [bpm, setBpm] = useState(128);
    const [currentStep, setCurrentStep] = useState(0);
    const [volume, setVolume] = useState(0.5);
    const [waveType, setWaveType] = useState('sine');

    // 4 Tracks, 16 Steps
    // Tracks: Kick, Snare, HiHat, Synth
    const [grid, setGrid] = useState(
        Array(4).fill().map(() => Array(16).fill(false))
    );

    const audioCtxRef = useRef(null);
    const nextNoteTimeRef = useRef(0);
    const timerIDRef = useRef(null);
    const canvasRef = useRef(null);
    const analyserRef = useRef(null);
    const animationRef = useRef(null);

    // Initialize Audio Context
    const initAudio = () => {
        if (!audioCtxRef.current) {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            audioCtxRef.current = new Ctx();
            analyserRef.current = audioCtxRef.current.createAnalyser();
            analyserRef.current.fftSize = 512;
            analyserRef.current.smoothingTimeConstant = 0.8;
            analyserRef.current.connect(audioCtxRef.current.destination);
        }
        if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
        }
    };

    const toggleStep = (track, step) => {
        setGrid(prev => {
            const newGrid = [...prev];
            newGrid[track] = [...prev[track]];
            newGrid[track][step] = !newGrid[track][step];
            return newGrid;
        });
    };

    const playSound = (track, time) => {
        const ctx = audioCtxRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(analyserRef.current);

        const now = time;

        if (track === 0) { // Kick
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.5);
            gain.gain.setValueAtTime(volume * 1.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
        } else if (track === 1) { // Snare
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(200, now);
            gain.gain.setValueAtTime(volume * 0.8, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
            osc.start(now);
            osc.stop(now + 0.25);
        } else if (track === 2) { // HiHat
            osc.type = 'square';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(8000, now + 0.05);
            gain.gain.setValueAtTime(volume * 0.4, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
        } else if (track === 3) { // Synth
            // Pentatonic-ish scale
            const notes = [261.63, 311.13, 392.00, 523.25, 622.25];
            const note = notes[Math.floor(Math.random() * notes.length)];

            osc.type = waveType;
            osc.frequency.setValueAtTime(note, now);

            // Filter envelope
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(200, now);
            filter.frequency.exponentialRampToValueAtTime(2000, now + 0.1);
            filter.frequency.exponentialRampToValueAtTime(200, now + 0.4);

            osc.disconnect();
            osc.connect(filter);
            filter.connect(gain);

            gain.gain.setValueAtTime(volume * 0.6, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
            osc.start(now);
            osc.stop(now + 0.4);
        }
    };

    // Scheduler
    const current16thNoteRef = useRef(0);
    const scheduler = useCallback(() => {
        if (!audioCtxRef.current) return;

        while (nextNoteTimeRef.current < audioCtxRef.current.currentTime + 0.1) {
            const time = nextNoteTimeRef.current;
            const note = current16thNoteRef.current;

            grid.forEach((track, i) => {
                if (track[note]) playSound(i, time);
            });

            // Advance
            const secondsPerBeat = 60.0 / bpm;
            nextNoteTimeRef.current += 0.25 * secondsPerBeat;

            // UI Sync
            const currentDrawStep = note;
            // Use animation frame or timeout to update UI at the right time
            // Note: In React state, this can lag. For this demo, we accept it.

            current16thNoteRef.current = (current16thNoteRef.current + 1) % 16;
        }
    }, [bpm, grid, volume, waveType]);

    // Loop
    useEffect(() => {
        let timer;
        if (isPlaying) {
            if (!audioCtxRef.current) initAudio();
            nextNoteTimeRef.current = audioCtxRef.current.currentTime + 0.1;
            current16thNoteRef.current = 0;

            const tick = () => {
                scheduler();

                // Visual Sync (approx)
                // To make it smoother, we calculate step based on time
                const secondsPerBeat = 60.0 / bpm;
                const noteTime = secondsPerBeat / 4;
                // But simplified: just peek at ref
                const activeStep = (current16thNoteRef.current === 0 ? 15 : current16thNoteRef.current - 1);
                setCurrentStep(activeStep);

                timer = setTimeout(tick, 25);
            };
            tick();
        }
        return () => clearTimeout(timer);
    }, [isPlaying, scheduler, bpm]);


    // Visualizer
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const resize = () => {
            canvas.width = canvas.parentElement.clientWidth;
            canvas.height = canvas.parentElement.clientHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const draw = () => {
            if (!analyserRef.current) {
                animationRef.current = requestAnimationFrame(draw);
                return;
            }

            const bufferLength = analyserRef.current.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            analyserRef.current.getByteFrequencyData(dataArray);

            ctx.fillStyle = '#0f172a'; // Clear bg
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const barWidth = (canvas.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i];

                // Cool gradient based on height
                const hue = (i / bufferLength) * 360;
                ctx.fillStyle = `hsl(${hue}, 100%, ${Math.min(100, barHeight / 2)}%)`;

                // Draw mirrored stats visualization
                const h = (barHeight / 255) * canvas.height;
                ctx.fillRect(x, (canvas.height - h) / 2, barWidth, h);

                x += barWidth + 1;
            }
            animationRef.current = requestAnimationFrame(draw);
        };
        draw();
        return () => {
            cancelAnimationFrame(animationRef.current);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto pb-20 animate-in fade-in duration-700">
            {/* RACK UNIT: Control Panel & Visualizer */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Control Module */}
                <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 flex flex-col justify-between shadow-2xl relative overflow-hidden group">
                    {/* Decor */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                    <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"></div>

                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-2xl font-black italic text-white tracking-tighter">NEON<span className="text-indigo-500">SYNTH</span></h2>
                            <div className="text-[10px] text-slate-500 font-mono tracking-widest mt-1">PRO SERIES MK-II</div>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${isPlaying ? 'bg-green-500 shadow-[0_0_10px_#22c55e] animate-pulse' : 'bg-red-900'}`}></div>
                    </div>

                    <div className="space-y-6 relative z-10">
                        <div className="flex gap-4 items-center">
                            <button
                                onClick={() => { initAudio(); setIsPlaying(!isPlaying); }}
                                className={`flex-1 py-4 rounded-lg font-bold text-lg tracking-wide transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2
                                ${isPlaying ? 'bg-rose-600 text-white hover:bg-rose-500' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}
                            >
                                {isPlaying ? (
                                    <><span>■</span> STOP</>
                                ) : (
                                    <><span>▶</span> PLAY</>
                                )}
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase">Tempo (BPM)</label>
                                <div className="flex items-center gap-2">
                                    <input type="range" min="60" max="200" value={bpm} onChange={(e) => setBpm(Number(e.target.value))} className="w-full accent-indigo-500 h-1.5 bg-slate-700 rounded-lg appearance-none" />
                                    <span className="text-white font-mono font-bold w-8">{bpm}</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase">Master Vol</label>
                                <div className="flex items-center gap-2">
                                    <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="w-full accent-pink-500 h-1.5 bg-slate-700 rounded-lg appearance-none" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase">Waveform</label>
                            <div className="flex bg-slate-800 p-1 rounded-lg">
                                {['sine', 'square', 'sawtooth'].map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setWaveType(type)}
                                        className={`flex-1 py-1 rounded text-xs font-bold uppercase transition-colors ${waveType === type ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:text-white'}`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Visualizer Module */}
                <div className="md:col-span-2 bg-slate-950 border border-slate-700 rounded-xl p-1 relative shadow-inner overflow-hidden">
                    <canvas ref={canvasRef} className="w-full h-full rounded-lg opacity-90" />
                    <div className="absolute top-4 left-4 text-xs font-mono text-emerald-500/50 pointer-events-none">
                        Wait for Input...
                    </div>
                </div>
            </div>

            {/* RACK UNIT: Sequencer Grid */}
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl relative">
                {/* Screw Heads */}
                <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-slate-700 flex items-center justify-center"><div className="w-1.5 h-0.5 bg-black -rotate-45"></div></div>
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-slate-700 flex items-center justify-center"><div className="w-1.5 h-0.5 bg-black rotate-45"></div></div>
                <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-slate-700 flex items-center justify-center"><div className="w-1.5 h-0.5 bg-black rotate-45"></div></div>
                <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-slate-700 flex items-center justify-center"><div className="w-1.5 h-0.5 bg-black -rotate-45"></div></div>

                <div className="space-y-6">
                    {['Kick', 'Snare', 'HiHat', 'Synth'].map((trackName, trackIndex) => (
                        <div key={trackName} className="flex flex-col md:flex-row items-center gap-4">
                            <div className="w-full md:w-24 flex justify-between md:justify-end items-center px-2">
                                <span className={`font-bold text-sm uppercase tracking-wider ${trackIndex === 3 ? 'text-pink-400' : 'text-slate-400'}`}>
                                    {trackName}
                                </span>
                                <div className={`w-1.5 h-1.5 rounded-full ml-2 ${grid[trackIndex][currentStep] ? 'bg-green-400 shadow-[0_0_5px_#4ade80]' : 'bg-slate-800'}`}></div>
                            </div>

                            <div className="flex-1 grid grid-cols-8 md:grid-cols-16 gap-1.5 w-full">
                                {grid[trackIndex].map((active, step) => (
                                    <button
                                        key={step}
                                        onClick={() => toggleStep(trackIndex, step)}
                                        className={`
                                            aspect-square rounded-[4px] relative transition-all duration-75
                                            ${active
                                                ? (trackIndex === 3 ? 'bg-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.6)]' : 'bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.6)]')
                                                : (step % 4 === 0 ? 'bg-slate-700/80' : 'bg-slate-800')}
                                            ${currentStep === step ? 'ring-1 ring-white brightness-150 scale-105 z-10' : 'hover:bg-slate-600'}
                                        `}
                                    >
                                        {step % 4 === 0 && !active && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="w-1 h-1 rounded-full bg-slate-600"></div>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default NeonSynth;
