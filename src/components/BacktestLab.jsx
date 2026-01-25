import React, { useState, useEffect, useMemo, useRef } from 'react';
import { calculatePrediction, calculateHybridPrediction } from '../utils/prediction';
import { predictProphet, predictChainReactor, predictMonteCarlo } from '../utils/advancedAlgorithms';

import MultiBetCell from './MultiBetCell';


const BacktestLab = ({ historyData, isLightMode, activeGameConfig }) => {
    // Range Selection
    const [startPeriod, setStartPeriod] = useState(0); // Index in historyData (0 is newest)

    const [endPeriod, setEndPeriod] = useState(0);
    const [referenceSize, setReferenceSize] = useState(100); // How many prior draws to use
    const [isAccumulating, setIsAccumulating] = useState(false); // Toggle for growing history

    // Multi-Bet Settings
    const [hybridBetCount, setHybridBetCount] = useState(1);
    const [monteCarloBetCount, setMonteCarloBetCount] = useState(1);
    const [randomBetCount, setRandomBetCount] = useState(1);

    // State
    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState([]); // [{ targetPeriod, actual, predictions: { model: [nums], hits: n } }]
    const [summary, setSummary] = useState(null);

    // Initial safe range
    useEffect(() => {
        if (historyData && historyData.length > 50) {
            // Default to testing the last 50 draws
            // historyData is [Newest ... Oldest]
            // We want to test from index 49 down to 0
            // startPeriod index 49 (Oldest in range), endPeriod index 0 (Newest)
            setStartPeriod(49);
            setEndPeriod(0);
        }
    }, [historyData]);

    // Validation
    const isValid = useMemo(() => {
        if (!historyData) return false;
        const refNum = Number(referenceSize);
        const rangeValid = (startPeriod - endPeriod + 1) >= 10;
        const refValid = refNum >= 10;
        const historyValid = (startPeriod + refNum) < historyData.length;

        const betsValid = [hybridBetCount, monteCarloBetCount, randomBetCount].every(c => Number(c) >= 1);

        return rangeValid && refValid && historyValid && betsValid;
    }, [historyData, startPeriod, endPeriod, referenceSize, hybridBetCount, monteCarloBetCount, randomBetCount]);

    const runBacktest = async () => {
        setIsRunning(true);
        setLogs([]);
        setSummary(null);

        // We iterate from startPeriod (older) down to endPeriod (newer)
        // e.g. 100 -> 0. 
        // For index i, we predict draw[i] using draw[i+1 ... end]
        // MINIMUM HISTORY REQUIREMENT: 20 draws.
        // So if we are at index i, we need historyData.slice(i + 1) to have length >= 20.

        const totalSteps = startPeriod - endPeriod + 1;
        let completed = 0;
        const tempLogs = [];

        const modelStats = {
            standard: 0,
            weighted: 0,
            hybrid: 0,
            prophet: 0,
            reactor: 0,
            monteCarlo: 0,
            random: 0
        };
        const winCounts = {
            standard: 0,
            weighted: 0,
            hybrid: 0,
            prophet: 0,
            reactor: 0,
            monteCarlo: 0,
            random: 0
        };

        // Allow UI to render
        await new Promise(r => setTimeout(r, 100));

        const MAX = activeGameConfig?.settings?.maxNumber || 49;
        const PICK = activeGameConfig?.settings?.pickCount || 6;

        for (let i = startPeriod; i >= endPeriod; i--) {
            // 1. Prepare Data
            // 1. Prepare Data
            // "The Past" relative to i is everything after i
            // Fixed: Shift window. Accumulating: Start at i+1, end at fixed anchor.
            const anchorIndex = startPeriod + 1 + Number(referenceSize);
            const endIndex = isAccumulating ? anchorIndex : (i + 1 + Number(referenceSize));
            const pastData = historyData.slice(i + 1, endIndex);

            if (pastData.length < 10) {
                // Not enough data to predict this specific draw, skip or stop?
                // Logic says we need at least 10. If user selects very old range, might hit this.
                console.warn(`Skipping period ${historyData[i].period} - insufficient history (${pastData.length})`);
                continue;
            }

            // 2. Target
            const target = historyData[i];
            const isSeparate = activeGameConfig?.settings?.specialNumber?.isSeparate || false;

            // Base set: Main numbers
            const targetSet = new Set(target.numbers.slice(0, PICK));

            // Only add Special Number if it matches the Main Pool (Integrated)
            // For Super Lotto (Separate), we do NOT add it to the validation set for Main Zone predictions
            if (!isSeparate && target.numbers[PICK]) {
                targetSet.add(target.numbers[PICK]);
            }

            // 3. Predict & PASS GAME CONFIG
            const settings = activeGameConfig?.settings || {};

            // Standard
            const stdRes = calculatePrediction(pastData, true, settings).standard;
            // Weighted
            const wgtRes = calculatePrediction(pastData, true, settings).weighted;
            // Hybrid (Multiple Bets)
            const hybResList = [];
            const hybStatsList = [];
            for (let b = 0; b < hybridBetCount; b++) {
                const hybFull = calculateHybridPrediction(pastData.slice(0, 30), pastData, { includeSpecial: true }, settings);
                hybResList.push(hybFull.numbers);
                hybStatsList.push(hybFull.stats);
            }

            // Prophet
            const proRes = predictProphet(pastData, activeGameConfig?.settings || {});
            // Reactor
            const reaRes = predictChainReactor(pastData, activeGameConfig?.settings || {});

            // Monte Carlo (Multiple Bets)
            const monResList = [];
            for (let b = 0; b < monteCarloBetCount; b++) {
                monResList.push(predictMonteCarlo(pastData, activeGameConfig?.settings || {}));
            }

            // Random (Baseline - Multiple Bets)
            const rndResList = [];
            for (let b = 0; b < randomBetCount; b++) {
                const rndSet = new Set();
                while (rndSet.size < PICK) rndSet.add(Math.floor(Math.random() * MAX) + 1);
                rndResList.push(Array.from(rndSet).sort((a, b) => a - b));
            }

            // 4. Score
            const checkHits = (pred) => pred.filter(n => targetSet.has(n)).length;
            const checkBestHits = (preds) => Math.max(...preds.map(p => checkHits(p)));

            const hits = {
                standard: checkHits(stdRes),
                weighted: checkHits(wgtRes),
                hybrid: checkBestHits(hybResList),
                prophet: checkHits(proRes),
                reactor: checkHits(reaRes),
                monteCarlo: checkBestHits(monResList),
                random: checkBestHits(rndResList)
            };

            // Accumulate Stats
            Object.keys(hits).forEach(k => {
                modelStats[k] += hits[k];
                if (hits[k] >= 3) winCounts[k]++;
            });

            // Log
            tempLogs.push({
                period: target.period,
                actual: target.numbers,
                predictions: {
                    standard: [stdRes],
                    weighted: [wgtRes],
                    hybrid: hybResList,
                    prophet: [proRes],
                    reactor: [reaRes],
                    monteCarlo: monResList,
                    random: rndResList
                },
                hybridStats: hybStatsList[0],
                hits
            });

            // Progress Update every 5 steps
            completed++;
            if (completed % 5 === 0) {
                setProgress(Math.round((completed / totalSteps) * 100));
                setLogs([...tempLogs].reverse()); // Show newest first
                await new Promise(r => setTimeout(r, 0)); // Yield to UI
            }
        }

        // Finalize
        setLogs(tempLogs.reverse()); // Show newest first
        const count = tempLogs.length;
        setSummary({
            count,
            avgs: {
                standard: (modelStats.standard / count).toFixed(2),
                weighted: (modelStats.weighted / count).toFixed(2),
                hybrid: (modelStats.hybrid / count).toFixed(2),
                prophet: (modelStats.prophet / count).toFixed(2),
                reactor: (modelStats.reactor / count).toFixed(2),
                monteCarlo: (modelStats.monteCarlo / count).toFixed(2),
                random: (modelStats.random / count).toFixed(2),
            },
            wins: {
                standard: ((winCounts.standard / count) * 100).toFixed(1),
                weighted: ((winCounts.weighted / count) * 100).toFixed(1),
                hybrid: ((winCounts.hybrid / count) * 100).toFixed(1),
                prophet: ((winCounts.prophet / count) * 100).toFixed(1),
                reactor: ((winCounts.reactor / count) * 100).toFixed(1),
                monteCarlo: ((winCounts.monteCarlo / count) * 100).toFixed(1),
                random: ((winCounts.random / count) * 100).toFixed(1),
            }
        });
        setIsRunning(false);
        setProgress(100);
    };

    return (
        <div className="w-full max-w-7xl mx-auto mt-8 mb-16">
            <div className="bg-slate-900/40 light:bg-white/80 backdrop-blur-xl rounded-[2rem] border border-white/5 light:border-slate-200 overflow-hidden shadow-2xl light:shadow-xl relative group">
                {/* Ambient Glow */}
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/10 light:bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none"></div>

                {/* Header */}
                <div className="p-8 bg-gradient-to-r from-white/[0.03] light:from-slate-100/50 to-transparent border-b border-white/5 light:border-slate-200 relative z-10">
                    <div className="flex items-center gap-5 mb-8">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-slate-800/50 light:from-indigo-100 light:to-white border border-indigo-500/30 light:border-indigo-100 flex items-center justify-center text-3xl text-indigo-400 light:text-indigo-600 shadow-lg shadow-indigo-500/10 backdrop-blur-sm">
                            🔬
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white light:text-slate-800 tracking-tight">Prediction Quality Assessment</h2>
                            <p className="text-indigo-200/60 light:text-indigo-800/60 text-sm font-medium tracking-wide">Backtest Lab • Rolling Simulation</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-end gap-6">
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Ref Depth</label>
                            <input
                                type="number"
                                min="10"
                                value={referenceSize}
                                onChange={e => setReferenceSize(e.target.value === '' ? '' : Number(e.target.value))}
                                className="bg-slate-900 light:bg-slate-100 border border-slate-700 light:border-slate-300 text-white light:text-slate-900 px-4 py-2 rounded-lg text-sm w-24"
                                disabled={isRunning}
                            />
                        </div>

                        <div className="flex items-center gap-2 bg-slate-900 light:bg-slate-100 border border-slate-700 light:border-slate-300 px-3 py-2 rounded-lg h-[38px] mt-auto">
                            <input
                                id="accToggle"
                                type="checkbox"
                                checked={isAccumulating}
                                onChange={e => setIsAccumulating(e.target.checked)}
                                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-slate-800 light:bg-white border-slate-600 light:border-slate-400"
                                disabled={isRunning}
                            />
                            <label htmlFor="accToggle" className="text-xs font-bold text-slate-300 light:text-slate-600 cursor-pointer select-none">
                                Accumulate
                            </label>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Test Range (Start Period)</label>
                            <select
                                className="bg-slate-900 light:bg-slate-100 border border-slate-700 light:border-slate-300 text-white light:text-slate-900 px-4 py-2 rounded-lg text-sm"
                                value={startPeriod}
                                onChange={e => setStartPeriod(Number(e.target.value))}
                                disabled={isRunning}
                            >
                                {historyData.map((d, i) => (
                                    <option key={d.period} value={i}>{d.period} (Index {i})</option>
                                ))}
                            </select>
                        </div>
                        <div className="text-slate-600 font-bold text-xl">→</div>
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Hybrid Bets</label>
                            <input
                                type="number"
                                min="1"
                                value={hybridBetCount}
                                onChange={e => {
                                    const val = e.target.value;
                                    setHybridBetCount(val === '' ? '' : Math.max(1, Number(val)));
                                }}
                                className="bg-slate-900 light:bg-slate-100 border border-slate-700 light:border-slate-300 text-white light:text-slate-900 px-3 py-2 rounded-lg text-sm w-20"
                                disabled={isRunning}
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Monte Carlo Bets</label>
                            <input
                                type="number"
                                min="1"
                                value={monteCarloBetCount}
                                onChange={e => {
                                    const val = e.target.value;
                                    setMonteCarloBetCount(val === '' ? '' : Math.max(1, Number(val)));
                                }}
                                className="bg-slate-900 light:bg-slate-100 border border-slate-700 light:border-slate-300 text-white light:text-slate-900 px-3 py-2 rounded-lg text-sm w-20"
                                disabled={isRunning}
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Random Bets</label>
                            <input
                                type="number"
                                min="1"
                                value={randomBetCount}
                                onChange={e => {
                                    const val = e.target.value;
                                    setRandomBetCount(val === '' ? '' : Math.max(1, Number(val)));
                                }}
                                className="bg-slate-900 light:bg-slate-100 border border-slate-700 light:border-slate-300 text-white light:text-slate-900 px-3 py-2 rounded-lg text-sm w-20"
                                disabled={isRunning}
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">End Period</label>
                            <select
                                className="bg-slate-900 light:bg-slate-100 border border-slate-700 light:border-slate-300 text-white light:text-slate-900 px-4 py-2 rounded-lg text-sm"
                                value={endPeriod}
                                onChange={e => setEndPeriod(Number(e.target.value))}
                                disabled={isRunning}
                            >
                                {historyData.map((d, i) => (
                                    <option key={d.period} value={i}>{d.period} (Index {i})</option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={runBacktest}
                            disabled={!isValid || isRunning}
                            className={`px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs shadow-xl transition-all ml-auto relative overflow-hidden group/btn ${isValid && !isRunning ? 'bg-indigo-600 hover:bg-indigo-500 text-white hover:shadow-indigo-500/40 hover:-translate-y-0.5' : 'bg-slate-800/50 light:bg-slate-200 text-slate-500 light:text-slate-400 cursor-not-allowed border border-white/5 light:border-slate-300'}`}
                        >
                            <span className="relative z-10">{isRunning ? `Simulating ${progress}%...` : 'Start Backtest'}</span>
                            {isValid && !isRunning && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700"></div>}
                        </button>
                    </div>
                    {!isValid && (
                        <div className="text-red-400 text-xs mt-2 space-y-1">
                            {(startPeriod - endPeriod + 1) < 10 && <p>* Range must be at least 10 draws.</p>}
                            {referenceSize < 10 && <p>* Ref Depth must be at least 10.</p>}
                            {(startPeriod + referenceSize) >= historyData.length && <p>* Ref Depth exceeds available history for the selected Start Period.</p>}
                            {(!Number(hybridBetCount) || Number(hybridBetCount) < 1) && <p>* Hybrid Bets must be at least 1.</p>}
                            {(!Number(monteCarloBetCount) || Number(monteCarloBetCount) < 1) && <p>* Monte Carlo Bets must be at least 1.</p>}
                            {(!Number(randomBetCount) || Number(randomBetCount) < 1) && <p>* Random Bets must be at least 1.</p>}
                        </div>
                    )}
                </div>

                {/* Summary Panel */}
                {summary && (
                    <div className="grid grid-cols-2 md:grid-cols-7 gap-4 p-6 bg-slate-900/50 light:bg-white border-b border-slate-800 light:border-slate-200">
                        {Object.entries(summary.avgs).map(([key, val]) => (
                            <div key={key} className="bg-slate-800/40 light:bg-slate-50 p-4 rounded-xl border border-slate-700 light:border-slate-200 text-center shadow-sm">
                                <div className="text-[10px] uppercase font-bold text-slate-500 light:text-slate-500 mb-1">{key}</div>
                                <div className={`text-xl font-black ${Number(val) > 1.5 ? 'text-emerald-400 light:text-emerald-600' : 'text-white light:text-slate-900'}`}>{val}</div>
                                <div className="text-[10px] text-slate-600 light:text-slate-400">hits/draw</div>
                                <div className="text-xs font-bold text-yellow-500 light:text-yellow-600 mt-1">{summary.wins[key]}%</div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Detailed Logs Table */}
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar bg-slate-950/30 light:bg-white">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-900 light:bg-slate-100 sticky top-0 z-50 shadow-lg border-b border-white/10 light:border-slate-200">
                            <tr>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase border-b border-slate-800 light:border-slate-200">Period</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase border-b border-slate-800 light:border-slate-200">Actual</th>
                                <th className="p-4 text-xs font-bold text-blue-400 light:text-blue-600 uppercase border-b border-slate-800 light:border-slate-200">Standard</th>
                                <th className="p-4 text-xs font-bold text-purple-400 light:text-purple-600 uppercase border-b border-slate-800 light:border-slate-200">Weighted</th>
                                <th className="p-4 text-xs font-bold text-amber-400 light:text-amber-600 uppercase border-b border-slate-800 light:border-slate-200">Hybrid</th>
                                <th className="p-4 text-xs font-bold text-indigo-400 light:text-indigo-600 uppercase border-b border-slate-800 light:border-slate-200">Prophet</th>
                                <th className="p-4 text-xs font-bold text-rose-400 light:text-rose-600 uppercase border-b border-slate-800 light:border-slate-200">Reactor</th>
                                <th className="p-4 text-xs font-bold text-emerald-400 light:text-emerald-600 uppercase border-b border-slate-800 light:border-slate-200">Monte Carlo</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase border-b border-slate-800 light:border-slate-200">Random</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {logs.map((log) => {
                                const isSeparate = activeGameConfig?.settings?.specialNumber?.isSeparate || false;
                                const PICK = activeGameConfig?.settings?.pickCount || 6;

                                const targetSet = new Set(log.actual.slice(0, PICK));
                                if (!isSeparate && log.actual[PICK]) {
                                    targetSet.add(log.actual[PICK]);
                                }

                                const renderNums = (nums, specialNum) => (
                                    <div className="grid grid-cols-3 gap-1 w-max">
                                        {nums.map(n => {
                                            const isSpecialHit = !isSeparate && n === specialNum;
                                            const isNormalHit = targetSet.has(n) && !isSpecialHit;

                                            let bgClass = 'bg-slate-800 light:bg-slate-100 text-slate-400 light:text-slate-400';
                                            if (isSpecialHit) bgClass = 'bg-orange-500 light:bg-orange-500 text-white ring-2 ring-orange-400 shadow-orange-500/50 shadow-sm';
                                            else if (isNormalHit) bgClass = 'bg-white light:bg-indigo-100 text-slate-900 light:text-indigo-900 ring-2 ring-indigo-500 light:ring-indigo-300 font-bold';

                                            return (
                                                <span key={n} className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${bgClass}`}>
                                                    {n}
                                                </span>
                                            );
                                        })}
                                    </div>
                                );

                                const getCellClass = (hits) => {
                                    // Use Config or Default
                                    const JACKPOT = activeGameConfig?.settings?.prizeRules?.jackpotHits || 6;

                                    if (hits >= JACKPOT) return "p-4 bg-[repeating-linear-gradient(45deg,rgba(239,68,68,0.3)_0px,rgba(239,68,68,0.3)_10px,rgba(249,115,22,0.3)_10px,rgba(249,115,22,0.3)_20px,rgba(234,179,8,0.3)_20px,rgba(234,179,8,0.3)_30px,rgba(34,197,94,0.3)_30px,rgba(34,197,94,0.3)_40px,rgba(59,130,246,0.3)_40px,rgba(59,130,246,0.3)_50px)] border-4 border-yellow-400 shadow-[0_0_20px_-3px_rgba(234,179,8,0.5)] relative overflow-hidden backdrop-brightness-125";

                                    if (hits === JACKPOT - 1) return "p-4 bg-[repeating-linear-gradient(45deg,rgba(168,85,247,0.25)_0px,rgba(168,85,247,0.25)_10px,rgba(239,68,68,0.25)_10px,rgba(239,68,68,0.25)_20px)] border-2 border-purple-500/50 shadow-[0_0_15px_-3px_rgba(168,85,247,0.3)] relative overflow-hidden backdrop-brightness-110";

                                    if (hits === JACKPOT - 2) return "p-4 bg-gradient-to-br from-red-500/10 via-orange-600/5 to-transparent light:bg-red-100 light:border-red-400 border-2 border-red-500/40 shadow-[0_0_15px_-3px_rgba(239,68,68,0.3)] relative overflow-hidden backdrop-brightness-110";

                                    if (hits === JACKPOT - 3) return "p-4 bg-gradient-to-br from-yellow-400/10 via-yellow-600/5 to-transparent light:bg-yellow-100 light:border-yellow-400 border-2 border-yellow-400/40 shadow-[0_0_15px_-3px_rgba(250,204,21,0.2)] relative overflow-hidden backdrop-brightness-110";

                                    return "p-4";
                                };

                                return (
                                    <tr key={log.period} className="hover:bg-slate-800/20 light:hover:bg-slate-50 transition-colors align-top">
                                        <td className="p-4 text-xs font-mono text-slate-400 light:text-slate-500 border-r border-slate-800/50 light:border-slate-200 pt-5">{log.period}</td>
                                        <td className="p-4 border-r border-slate-800/50 light:border-slate-200 bg-slate-900/20 light:bg-slate-50/50">
                                            <div className="flex flex-wrap gap-1 w-max">
                                                {log.actual.slice(0, PICK).map(n => (
                                                    <span key={n} className="w-6 h-6 rounded-full bg-slate-700 light:bg-slate-200 text-white light:text-slate-800 flex items-center justify-center text-[10px] font-bold">{n}</span>
                                                ))}
                                                {!isSeparate && activeGameConfig?.settings?.specialNumber?.enabled && log.actual[PICK] && (
                                                    <span className="w-6 h-6 rounded-full bg-indigo-900 light:bg-indigo-100 text-indigo-200 light:text-indigo-700 flex items-center justify-center text-[10px] font-bold">{log.actual[PICK]}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className={getCellClass(log.hits.standard)}>
                                            <MultiBetCell predictions={log.predictions.standard} targetSet={targetSet} specialNum={log.actual[PICK]} maxHits={log.hits.standard} isSeparate={isSeparate} />
                                        </td>
                                        <td className={getCellClass(log.hits.weighted)}>
                                            <MultiBetCell predictions={log.predictions.weighted} targetSet={targetSet} specialNum={log.actual[PICK]} maxHits={log.hits.weighted} isSeparate={isSeparate} />
                                        </td>
                                        <td className={getCellClass(log.hits.hybrid)}>
                                            <MultiBetCell predictions={log.predictions.hybrid} targetSet={targetSet} specialNum={log.actual[PICK]} maxHits={log.hits.hybrid} isSeparate={isSeparate} />
                                            <div className="text-[9px] text-slate-500 mt-2 font-mono">
                                                H:{log.hybridStats.avgHot} C:{log.hybridStats.avgCold} N:{log.hybridStats.avgNeutral}
                                            </div>
                                        </td>
                                        <td className={getCellClass(log.hits.prophet)}>
                                            <MultiBetCell predictions={log.predictions.prophet} targetSet={targetSet} specialNum={log.actual[PICK]} maxHits={log.hits.prophet} isSeparate={isSeparate} />
                                        </td>
                                        <td className={getCellClass(log.hits.reactor)}>
                                            <MultiBetCell predictions={log.predictions.reactor} targetSet={targetSet} specialNum={log.actual[PICK]} maxHits={log.hits.reactor} isSeparate={isSeparate} />
                                        </td>
                                        <td className={getCellClass(log.hits.monteCarlo)}>
                                            <MultiBetCell predictions={log.predictions.monteCarlo} targetSet={targetSet} specialNum={log.actual[PICK]} maxHits={log.hits.monteCarlo} isSeparate={isSeparate} />
                                        </td>
                                        <td className={getCellClass(log.hits.random)}>
                                            <MultiBetCell predictions={log.predictions.random} targetSet={targetSet} specialNum={log.actual[PICK]} maxHits={log.hits.random} isSeparate={isSeparate} />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default BacktestLab;
