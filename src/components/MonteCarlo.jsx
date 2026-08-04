import React, { useState, useEffect, useRef } from 'react';
import { getSecureRandomNumber } from '../utils/secureRandom';
import HelpIcon from './HelpIcon';
import { useLanguage } from '../i18n/LanguageContext';

const MonteCarlo = ({ history, onSave, isLightMode, activeGameConfig }) => {
    const { t } = useLanguage();
    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState(null);
    const [simCount, setSimCount] = useState(1000);
    const [analysisWindow, setAnalysisWindow] = useState(50); // How many recent draws to analyze

    // Canvas ref for cool visualization
    const canvasRef = useRef(null);

    const runSimulation = () => {
        if (!history || history.length === 0) return;
        setIsRunning(true);
        setProgress(0);
        setResults(null);

        // Dynamic Config
        const MAX = activeGameConfig?.settings?.maxNumber || 49;
        const PICK = activeGameConfig?.settings?.pickCount || 6;

        // 1. Calculate Weights
        // Use user-selected window
        const historyForWeights = history.slice(0, analysisWindow);

        const weights = {};
        for (let i = 1; i <= MAX; i++) weights[i] = 1; // Base weight

        // New Logic: Ultra-Subtle weighting
        // +0.1 per hit
        historyForWeights.forEach(draw => {
            // FIXED: Slice to PICK
            draw.numbers.slice(0, PICK).forEach(n => {
                if (n <= MAX) weights[n] += 0.1;
            });
        });

        // Convert to cumulative array for weighted random selection
        // Scale by 10 to handle 0.1 decimal (needs integer for simple array push)
        const weightedPool = [];
        for (let i = 1; i <= MAX; i++) {
            const entries = Math.round(weights[i] * 10);
            for (let k = 0; k < entries; k++) {
                weightedPool.push(i);
            }
        }

        // 2. Simulation Loop (Async to prevent freeze)
        let currentSim = 0;
        const totalSims = simCount;
        const simcounts = {};
        for (let i = 1; i <= MAX; i++) simcounts[i] = 0;

        const batchSize = 1000; // Increase batch size for higher sim counts

        const processBatch = () => {
            for (let b = 0; b < batchSize; b++) {
                if (currentSim >= totalSims) break;

                // Simulate one draw (PICK unique numbers)
                const drawSet = new Set();
                while (drawSet.size < PICK) {
                    const idx = getSecureRandomNumber(0, weightedPool.length - 1);
                    drawSet.add(weightedPool[idx]);
                }

                // Record stats
                drawSet.forEach(n => simcounts[n]++);
                currentSim++;
            }

            const pct = Math.round((currentSim / totalSims) * 100);
            setProgress(pct);

            if (currentSim < totalSims) {
                requestAnimationFrame(processBatch);
            } else {
                finishSimulation(simcounts, PICK);
            }
        };

        requestAnimationFrame(processBatch);
    };

    const finishSimulation = (counts, pick) => {
        setIsRunning(false);

        // Sort by frequency
        const sorted = Object.entries(counts)
            .map(([num, count]) => ({ num: parseInt(num), count }))
            .sort((a, b) => b.count - a.count);

        const top6 = sorted.slice(0, pick).map(x => x.num).sort((a, b) => a - b);
        setResults({ top6, distribution: sorted });
    };

    return (
        <div className="w-full max-w-4xl mx-auto">
            <div className="bg-slate-900/50 light:bg-white rounded-2xl p-6 border border-slate-800 light:border-slate-200 shadow-xl light:shadow-lg">
                {/* Header & Controls */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-6">
                    <div>
                        <h2 className="text-xl font-bold text-white light:text-slate-800 flex items-center gap-2">
                            🎲 {t('monteCarlo.title')}
                        </h2>
                        <p className="text-xs text-slate-400 light:text-slate-500 mt-1">
                            {t('monteCarlo.subtitle')}
                        </p>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-wrap items-center gap-4 bg-slate-950/50 light:bg-slate-50 p-2 rounded-xl border border-slate-800/50 light:border-slate-200">
                        {/* Analysis Window Selector */}
                        <div className="flex flex-col">
                            <label className="text-[9px] text-slate-500 light:text-slate-500 font-bold uppercase tracking-wider mb-1">{t('monteCarlo.refData')}</label>
                            <select
                                value={analysisWindow}
                                onChange={(e) => setAnalysisWindow(Number(e.target.value))}
                                className="bg-slate-900 light:bg-slate-100 text-white light:text-slate-900 text-xs font-bold rounded-lg px-3 py-2 border border-slate-700 light:border-slate-300 outline-none focus:border-indigo-500 cursor-pointer"
                            >
                                {Array.from({ length: Math.ceil(history.length / 10) }, (_, i) => (i + 1) * 10).map(val => (
                                    <option key={val} value={val}>{val}</option>
                                ))}
                                <option value={history.length}>{t('monteCarlo.allN', { n: history.length })}</option>
                            </select>
                        </div>

                        {/* Sim Count Selector */}
                        <div className="flex flex-col border-l border-slate-800 light:border-slate-300 pl-4">
                            <label className="text-[9px] text-slate-500 light:text-slate-500 font-bold uppercase tracking-wider mb-1">{t('monteCarlo.simulations')}</label>
                            <select
                                value={simCount}
                                onChange={(e) => setSimCount(Number(e.target.value))}
                                className="bg-slate-900 light:bg-slate-100 text-white light:text-slate-900 text-xs font-bold rounded-lg px-3 py-2 border border-slate-700 light:border-slate-300 outline-none focus:border-indigo-500 cursor-pointer"
                            >
                                {Array.from({ length: 10 }, (_, i) => (i + 1) * 100).map(val => (
                                    <option key={val} value={val}>{val}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <button
                        onClick={runSimulation}
                        disabled={isRunning}
                        className={`
                            px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all
                            ${isRunning
                                ? 'bg-slate-700 cursor-wait'
                                : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/50 hover:ring-2 hover:ring-white/20'}
                        `}
                    >
                        {isRunning ? t('monteCarlo.running') : t('monteCarlo.run')}
                    </button>

                    <HelpIcon title={t('monteCarlo.help.title')} body={t('monteCarlo.help.body')} />
                </div>

                {/* Progress Bar */}
                {isRunning && (
                    <div className="w-full h-2 bg-slate-800 light:bg-slate-200 rounded-full mb-6 overflow-hidden">
                        <div
                            className="h-full bg-emerald-500 transition-all duration-100 ease-linear"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                )}

                {/* Results Area */}
                {results && !isRunning && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Top 6 Prediction */}
                        <div className="text-center mb-8 relative">
                            {onSave && (
                                <button
                                    onClick={() => onSave(results.top6, 'Monte Carlo Sim')}
                                    className="absolute right-0 top-0 w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all shadow-lg"
                                    title={t('monteCarlo.saveResult')}
                                >
                                    💾
                                </button>
                            )}
                            <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest mb-4">{t('monteCarlo.mostLikely')}</h3>
                            <div className="flex flex-wrap justify-center gap-3">
                                {results.top6.map(num => (
                                    <div key={num} className="w-12 h-12 rounded-full bg-emerald-600 shadow-lg shadow-emerald-500/30 flex items-center justify-center text-xl font-bold text-white border-2 border-emerald-400">
                                        {num}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Distribution Graph (Top 15) */}
                        <div className="h-48 flex items-end justify-center gap-1 md:gap-2 px-2">
                            {results.distribution.slice(0, 20).map((item, idx) => {
                                const heightPct = (item.count / results.distribution[0].count) * 100;
                                return (
                                    <div key={item.num} className="flex flex-col items-center group w-full max-w-[40px]">
                                        <div className="text-[8px] md:text-[9px] text-emerald-400 mb-1 opacity-100 whitespace-nowrap">
                                            {((item.count / simCount) * 100).toFixed(1)}%
                                        </div>
                                        <div
                                            className={`w-full rounded-t-sm transition-all duration-500 ${results.top6.includes(item.num) ? 'bg-emerald-500' : 'bg-slate-700 light:bg-slate-300'}`}
                                            style={{ height: `${heightPct}%` }}
                                        ></div>
                                        <div className={`mt-2 text-xs font-bold ${results.top6.includes(item.num) ? 'text-white light:text-emerald-700' : 'text-slate-500 light:text-slate-400'}`}>
                                            {item.num}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        <p className="text-center text-[10px] text-slate-500 mt-2">{t('monteCarlo.topFrequent', { n: simCount.toLocaleString() })}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MonteCarlo;
