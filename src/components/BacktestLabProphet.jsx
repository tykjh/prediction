import React, { useState, useEffect, useMemo } from 'react';
import { predictProphet, predictKNN, predictMarkov, predictRegression } from '../utils/advancedAlgorithms';
import { getSecureRandomSet } from '../utils/secureRandom';

const BacktestLabProphet = ({ historyData, isLightMode, activeGameConfig }) => {
    // Range Selection
    const [startPeriod, setStartPeriod] = useState(0); // Index in historyData (0 is newest)
    const [endPeriod, setEndPeriod] = useState(0);
    const [referenceSize, setReferenceSize] = useState(100); // How many prior draws to use
    const [isAccumulating, setIsAccumulating] = useState(false); // Toggle for growing history

    // State
    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState([]); // [{ targetPeriod, actual, predictions: { model: [nums], hits: n } }]
    const [summary, setSummary] = useState(null);

    // Initial safe range
    useEffect(() => {
        if (historyData && historyData.length > 50) {
            // Default to testing the last 50 draws
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
        return rangeValid && refValid && historyValid;
    }, [historyData, startPeriod, endPeriod, referenceSize]);

    const runBacktest = async () => {
        setIsRunning(true);
        setLogs([]);
        setSummary(null);

        const totalSteps = startPeriod - endPeriod + 1;
        let completed = 0;
        const tempLogs = [];

        const modelStats = {
            knn: 0,
            markov: 0,
            regression: 0,
            prophet: 0,
            random: 0
        };
        const winCounts = {
            knn: 0,
            markov: 0,
            regression: 0,
            prophet: 0,
            random: 0
        };

        // Game Config
        const MAX = activeGameConfig?.settings?.maxNumber || 49;
        const PICK = activeGameConfig?.settings?.pickCount || 6;

        // Allow UI to render
        await new Promise(r => setTimeout(r, 100));

        for (let i = startPeriod; i >= endPeriod; i--) {
            // 1. Prepare Data
            const anchorIndex = startPeriod + 1 + Number(referenceSize);
            const endIndex = isAccumulating ? anchorIndex : (i + 1 + Number(referenceSize));
            const pastData = historyData.slice(i + 1, endIndex);

            if (pastData.length < 10) {
                console.warn(`Skipping period ${historyData[i].period} - insufficient history (${pastData.length})`);
                continue;
            }

            // 2. Target
            const target = historyData[i];
            const isSeparate = activeGameConfig?.settings?.specialNumber?.isSeparate || false;

            const targetSet = new Set(target.numbers.slice(0, PICK));
            if (!isSeparate && target.numbers[PICK]) {
                targetSet.add(target.numbers[PICK]);
            }

            // 3. Predict Sub-Components
            // Pass activeGameConfig.settings to all predictors safely
            const settings = activeGameConfig?.settings || {};
            const knnRes = predictKNN(pastData, settings).slice(0, PICK).sort((a, b) => a - b);
            const markovRes = predictMarkov(pastData, settings).slice(0, PICK).sort((a, b) => a - b);
            const regRes = predictRegression(pastData, settings).slice(0, PICK).sort((a, b) => a - b);
            const proRes = predictProphet(pastData, settings);

            // Random (Baseline)
            const rndSet = new Set();
            while (rndSet.size < PICK) rndSet.add(Math.floor(Math.random() * MAX) + 1);
            const rndRes = Array.from(rndSet).sort((a, b) => a - b);

            // 4. Score
            const checkHits = (pred) => pred.filter(n => targetSet.has(n)).length;

            const hits = {
                knn: checkHits(knnRes),
                markov: checkHits(markovRes),
                regression: checkHits(regRes),
                prophet: checkHits(proRes),
                random: checkHits(rndRes)
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
                    knn: knnRes,
                    markov: markovRes,
                    regression: regRes,
                    prophet: proRes,
                    random: rndRes
                },
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
        setLogs(tempLogs.reverse());
        const count = tempLogs.length;
        setSummary({
            count,
            avgs: {
                knn: (modelStats.knn / count).toFixed(2),
                markov: (modelStats.markov / count).toFixed(2),
                regression: (modelStats.regression / count).toFixed(2),
                prophet: (modelStats.prophet / count).toFixed(2),
                random: (modelStats.random / count).toFixed(2),
            },
            wins: {
                knn: ((winCounts.knn / count) * 100).toFixed(1),
                markov: ((winCounts.markov / count) * 100).toFixed(1),
                regression: ((winCounts.regression / count) * 100).toFixed(1),
                prophet: ((winCounts.prophet / count) * 100).toFixed(1),
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
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-500/10 light:bg-purple-500/5 rounded-full blur-[100px] pointer-events-none"></div>

                {/* Header */}
                <div className="p-8 bg-gradient-to-r from-white/[0.03] light:from-slate-100/50 to-transparent border-b border-white/5 light:border-slate-200 relative z-10">
                    <div className="flex items-center gap-5 mb-8">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-slate-800/50 light:from-purple-100 light:to-white border border-purple-500/30 light:border-purple-100 flex items-center justify-center text-3xl text-purple-400 light:text-purple-600 shadow-lg shadow-purple-500/10 backdrop-blur-sm">
                            🔮
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white light:text-slate-800 tracking-tight">Prophet Breakdown Analysis 2</h2>
                            <p className="text-purple-200/60 light:text-purple-800/60 text-sm font-medium tracking-wide">Deep Dive: k-NN • Markov • Regression</p>
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
                                id="accToggleProphet"
                                type="checkbox"
                                checked={isAccumulating}
                                onChange={e => setIsAccumulating(e.target.checked)}
                                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-slate-800 light:bg-white border-slate-600 light:border-slate-400"
                                disabled={isRunning}
                            />
                            <label htmlFor="accToggleProphet" className="text-xs font-bold text-slate-300 light:text-slate-600 cursor-pointer select-none">
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
                            className={`px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs shadow-xl transition-all ml-auto relative overflow-hidden group/btn ${isValid && !isRunning ? 'bg-purple-600 hover:bg-purple-500 text-white hover:shadow-purple-500/40 hover:-translate-y-0.5' : 'bg-slate-800/50 light:bg-slate-200 text-slate-500 light:text-slate-400 cursor-not-allowed border border-white/5 light:border-slate-300'}`}
                        >
                            <span className="relative z-10">{isRunning ? `Analyzing ${progress}%...` : 'Start Analysis'}</span>
                            {isValid && !isRunning && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700"></div>}
                        </button>
                    </div>
                    {!isValid && (
                        <div className="text-red-400 text-xs mt-2 space-y-1">
                            {(startPeriod - endPeriod + 1) < 10 && <p>* Range must be at least 10 draws.</p>}
                            {Number(referenceSize) < 10 && <p>* Ref Depth must be at least 10.</p>}
                            {(startPeriod + Number(referenceSize)) >= historyData.length && <p>* Ref Depth exceeds available history for the selected Start Period.</p>}
                        </div>
                    )}
                </div>

                {/* Summary Panel */}
                {summary && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-6 bg-slate-900/50 light:bg-white border-b border-slate-800 light:border-slate-200">
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
                        <thead className="bg-slate-900/80 light:bg-slate-100 backdrop-blur-md sticky top-0 z-10 shadow-lg border-b border-white/10 light:border-slate-200">
                            <tr>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase border-b border-slate-800 light:border-slate-200">Period</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase border-b border-slate-800 light:border-slate-200">Actual</th>
                                <th className="p-4 text-xs font-bold text-blue-400 light:text-blue-600 uppercase border-b border-slate-800 light:border-slate-200">k-NN</th>
                                <th className="p-4 text-xs font-bold text-cyan-400 light:text-cyan-600 uppercase border-b border-slate-800 light:border-slate-200">Markov</th>
                                <th className="p-4 text-xs font-bold text-pink-400 light:text-pink-600 uppercase border-b border-slate-800 light:border-slate-200">Regression</th>
                                <th className="p-4 text-xs font-bold text-purple-400 light:text-purple-600 uppercase border-b border-slate-800 light:border-slate-200">Consensus</th>
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
                                            // FIXED: If separates zones (Super Lotto), Main Zone predictions NEVER match Special Number
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
                                    const JACKPOT = activeGameConfig?.settings?.prizeRules?.jackpotHits || 6;

                                    if (hits >= JACKPOT) return "p-4 bg-[conic-gradient(at_top_left,_var(--tw-gradient-stops))] from-yellow-500/20 via-purple-500/20 to-cyan-500/20 border-2 border-fuchsia-400/50 shadow-[0_0_20px_-3px_rgba(236,72,153,0.3)] relative overflow-hidden backdrop-brightness-125 animate-pulse-slow";
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
                                        <td className={getCellClass(log.hits.knn)}>{renderNums(log.predictions.knn, log.actual[PICK])}</td>
                                        <td className={getCellClass(log.hits.markov)}>{renderNums(log.predictions.markov, log.actual[PICK])}</td>
                                        <td className={getCellClass(log.hits.regression)}>{renderNums(log.predictions.regression, log.actual[PICK])}</td>
                                        <td className={getCellClass(log.hits.prophet)}>{renderNums(log.predictions.prophet, log.actual[PICK])}</td>
                                        <td className={getCellClass(log.hits.random)}>{renderNums(log.predictions.random, log.actual[PICK])}</td>
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

export default BacktestLabProphet;
