import React, { useState, useMemo } from 'react';
import HelpIcon from './HelpIcon';
import { useLanguage } from '../i18n/LanguageContext';

const MatrixGrid = ({ history, isLightMode, activeGameConfig }) => {
    const { t } = useLanguage();
    const [selectedNumber, setSelectedNumber] = useState(null);
    const [range, setRange] = useState(50); // Default to Recent 50

    // Dynamic Config
    const MAX = activeGameConfig?.settings?.maxNumber || 49;
    const PICK = activeGameConfig?.settings?.pickCount || 6;

    // Range Options
    const rangeOptions = useMemo(() => {
        if (!history) return [];
        const opts = [];
        for (let i = 10; i <= history.length; i += 10) opts.push(i);
        return opts;
    }, [history]);


    // 0. Filter History based on internal range
    const activeHistory = useMemo(() => {
        if (!history) return [];
        if (range === 'ALL') return history;
        return history.slice(0, range);
    }, [history, range]);

    // 1. Heavy Computation: Calculate Frequency and Co-occurrence Matrix
    const { frequencyMap, coOccurrenceMatrix, maxFreq, maxCoOcc } = useMemo(() => {
        if (!activeHistory || activeHistory.length === 0) return { frequencyMap: {}, coOccurrenceMatrix: {}, maxFreq: 0, maxCoOcc: 0 };

        const freq = {};
        const coOcc = {}; // Key: "num1-num2" (smaller-larger) -> count
        let mFreq = 0;
        let mCoOcc = 0;

        // Initialize Frequencies
        for (let i = 1; i <= MAX; i++) freq[i] = 0;

        // One Pass Analysis
        activeHistory.forEach(draw => {
            const nums = draw.numbers.slice(0, PICK); // Standard only

            // Frequency
            nums.forEach(n => {
                if (n > MAX) return; // Safety
                freq[n] = (freq[n] || 0) + 1;
                mFreq = Math.max(mFreq, freq[n]);
            });

            // Co-occurrence (Pairs)
            for (let i = 0; i < nums.length; i++) {
                for (let j = i + 1; j < nums.length; j++) {
                    const n1 = nums[i];
                    const n2 = nums[j];
                    if (n1 > MAX || n2 > MAX) continue;

                    // Key format: Low-High
                    const key = n1 < n2 ? `${n1}-${n2}` : `${n2}-${n1}`;
                    coOcc[key] = (coOcc[key] || 0) + 1;
                    mCoOcc = Math.max(mCoOcc, coOcc[key]);
                }
            }
        });

        return { frequencyMap: freq, coOccurrenceMatrix: coOcc, maxFreq: mFreq, maxCoOcc: mCoOcc };
    }, [activeHistory, MAX, PICK]);

    // Helper: Get color based on state
    const getCellColor = (num) => {
        // Mode 1: Affinity View (If number selected)
        if (selectedNumber) {
            if (num === selectedNumber) return "bg-white text-slate-900 border-white ring-2 ring-white shadow-[0_0_15px_rgba(255,255,255,0.5)] z-10 scale-110"; // Selected

            // Calculate affinity strength
            const key = num < selectedNumber ? `${num}-${selectedNumber}` : `${selectedNumber}-${num}`;
            const strength = coOccurrenceMatrix[key] || 0;

            if (strength === 0) return "bg-slate-900 text-slate-700 border-slate-800 opacity-20"; // No relation

            // Affinity Gradient (Blue -> Purple -> Pink -> Red)
            const intensity = strength / (maxCoOcc * 0.5 || 1); // Boost scaling a bit
            if (intensity > 0.8) return "bg-red-500 text-white border-red-400 font-bold shadow-red-500/30";
            if (intensity > 0.6) return "bg-pink-500 text-white border-pink-400";
            if (intensity > 0.4) return "bg-purple-500 text-purple-100 border-purple-400";
            if (intensity > 0.2) return "bg-blue-600 text-blue-100 border-blue-500";
            return "bg-slate-800 light:bg-slate-200 text-slate-400 light:text-slate-500 border-slate-700 light:border-slate-300";
        }

        // Mode 2: Heatmap View (Default)
        const count = frequencyMap[num] || 0;
        const normalized = count / (maxFreq || 1);

        // Heatmap Gradient (Slate -> Teal -> Emerald -> Yellow)
        if (normalized > 0.9) return "bg-amber-400 text-amber-900 border-amber-300 font-bold shadow-amber-400/20"; // Hot!
        if (normalized > 0.8) return "bg-emerald-400 text-emerald-900 border-emerald-300 font-bold";
        if (normalized > 0.6) return "bg-teal-500 text-teal-100 border-teal-400";
        if (normalized > 0.4) return "bg-cyan-600 text-cyan-100 border-cyan-500";
        if (normalized > 0.2) return "bg-slate-700 light:bg-slate-300 text-slate-400 light:text-slate-600 border-slate-600 light:border-slate-400";
        return "bg-slate-800 light:bg-slate-200 text-slate-600 light:text-slate-400 border-slate-700 light:border-slate-300";
    };

    return (
        <div className="w-full max-w-2xl mx-auto">
            <div className="flex justify-between items-start mb-6 gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white light:text-slate-800 flex items-center gap-2">
                        📊 {t('matrixGrid.title')}
                        {selectedNumber && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setSelectedNumber(null); }}
                                className="text-xs bg-slate-700 light:bg-slate-200 px-2 py-1 rounded text-slate-300 light:text-slate-600 hover:bg-slate-600 light:hover:bg-slate-300 ml-2"
                            >
                                {t('matrixGrid.clearSelection')} ✕
                            </button>
                        )}
                    </h2>
                    <p className="text-xs text-slate-400 light:text-slate-500 mt-1">
                        {selectedNumber
                            ? t('matrixGrid.affinityDesc', { num: selectedNumber })
                            : t('matrixGrid.heatmapDesc')}
                    </p>
                </div>

                <div className="flex items-start gap-2">
                <div className="flex flex-col items-end">
                    <select
                        value={range}
                        onChange={(e) => setRange(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                        className="bg-slate-900 light:bg-slate-100 text-white light:text-slate-900 text-xs font-bold rounded-lg px-3 py-2 border border-slate-700 light:border-slate-300 outline-none focus:border-indigo-500 cursor-pointer"
                    >
                        {rangeOptions.map(opt => (
                            <option key={opt} value={opt}>{t('matrixGrid.lastDraws', { n: opt })}</option>
                        ))}
                        <option value="ALL">{t('matrixGrid.allHistory')}</option>
                    </select>

                    {/* Legend */}
                    {!selectedNumber && (
                        <div className="flex items-center gap-1 text-[9px] text-slate-500 light:text-slate-500 mt-2">
                            <span>{t('matrixGrid.cold')}</span>
                            <div className="w-16 h-2 rounded bg-gradient-to-r from-slate-800 via-teal-500 to-amber-400 light:from-slate-200"></div>
                            <span>{t('matrixGrid.hot')}</span>
                        </div>
                    )}
                </div>
                <HelpIcon title={t('matrixGrid.help.title')} body={t('matrixGrid.help.body')} />
                </div>
            </div>

            {/* The Grid (Dynamic) */}
            <div className={`grid gap-2 md:gap-3 p-4 bg-slate-900/50 light:bg-white rounded-2xl border border-slate-800 light:border-slate-200 aspect-square shadow-xl light:shadow-lg ${MAX > 40 ? 'grid-cols-7' : 'grid-cols-6'}`}>
                {Array.from({ length: MAX }, (_, i) => i + 1).map(num => {
                    // Get pair count if selected, else freq
                    const pairCount = selectedNumber
                        ? (coOccurrenceMatrix[num < selectedNumber ? `${num}-${selectedNumber}` : `${selectedNumber}-${num}`] || 0)
                        : frequencyMap[num];

                    return (
                        <div
                            key={num}
                            onClick={() => setSelectedNumber(selectedNumber === num ? null : num)}
                            className={`
                                relative flex flex-col items-center justify-center rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden group hover:scale-110 hover:z-20 hover:shadow-xl
                                ${getCellColor(num)}
                            `}
                        >
                            <span className="text-sm md:text-lg font-bold z-10">{num}</span>

                            {/* Optional: Show small value on hover or always? */}
                            <span className="text-[9px] opacity-60 z-10">{pairCount > 0 ? pairCount : '-'}</span>

                            {/* Hover Gleam */}
                            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors"></div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-4 text-[10px] text-slate-600 text-center font-mono">
                {t('matrixGrid.footer', { n: history.length })}
            </div>
        </div>
    );
};

export default MatrixGrid;
